import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError, OperationalError


from app.schemas.job import (
    JobCreate,
    JobResponse,
    JobListResponse,
    JobDraftRequest,
    ScriptGenerateRequest,
    ScriptGenerateResponse,
)
from app.db.session import get_db
from app.db.models import JobModel, User, DesignTemplate
from app.services.context_manager import get_history
from app.core.security import get_current_user, get_current_user_from_token
from app.core.limiter import limiter
from app.core.storage_paths import get_storage_dir
from app.core.file_logger import JobFileLogger
from app.api.deps import get_job_or_404

from sqlalchemy.orm.attributes import flag_modified


VIDEOS_STORAGE = get_storage_dir("videos")

router = APIRouter()


@router.post("/", response_model=JobResponse, status_code=201)
@limiter.limit("10/minute")
async def create_job(
    request: Request,
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Resolve design_md: design_template_id takes precedence over inline design_md
    resolved_design_md = job_in.design_md
    if job_in.design_template_id:
        template = db.query(DesignTemplate).filter(
            DesignTemplate.id == job_in.design_template_id,
            DesignTemplate.user_id == current_user.id,
        ).first()
        if not template:
            raise HTTPException(status_code=404, detail="Design template not found")
        resolved_design_md = template.content

    # Store resolved design_md and system_prompt in result_spec for the scheduler to pick up
    initial_spec: dict = {}
    if resolved_design_md:
        initial_spec["design_md"] = resolved_design_md
    if job_in.system_prompt:
        initial_spec["system_prompt"] = job_in.system_prompt

    # Associate job with the authenticated user
    new_job = JobModel(
        script_text=job_in.script_text,
        status="pending",
        user_id=current_user.id,
        aspect_ratio=job_in.aspect_ratio,
        tts_provider=job_in.tts_provider,
        tts_voice_id=job_in.tts_voice_id,
        llm_model=job_in.model,
        result_spec=initial_spec or None,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # El scheduler se encargará de esto ahora que está en 'pending'
    # db.refresh(new_job) fue llamado arriba.

    return JobResponse(job_id=new_job.id, status=new_job.status, error_message=new_job.error_message)


@router.post("/draft", response_model=JobResponse, status_code=201)
async def create_draft(
    draft_in: JobDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new draft job."""
    # Guardamos los datos del draft en result_spec temporalmente
    new_job = JobModel(
        script_text=draft_in.draft_data.get("script", "[DRAFT]"),
        status="draft",
        user_id=current_user.id,
        result_spec=draft_in.draft_data,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return JobResponse(job_id=new_job.id, status=new_job.status, result_spec=new_job.result_spec, error_message=new_job.error_message)


@router.put("/{job_id}/draft", response_model=JobResponse)
async def update_draft(
    job_id: str,
    draft_in: JobDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing draft."""
    job = get_job_or_404(db, job_id, current_user.id)
    if job.status != "draft":
        raise HTTPException(status_code=400, detail="Job is not in draft status")
    
    job.result_spec = draft_in.draft_data
    if "script" in draft_in.draft_data:
        job.script_text = draft_in.draft_data["script"]
        
    flag_modified(job, "result_spec")
    db.commit()
    return JobResponse(job_id=job.id, status=job.status, result_spec=job.result_spec, error_message=job.error_message)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify the job belongs to the current user
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
        error_message=job.error_message,
    )


@router.get("/{job_id}/logs")
async def get_job_logs(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """Obtener logs del job desde archivo."""
    job = get_job_or_404(db, job_id, current_user.id)
    return {"logs": JobFileLogger.get_logs(job_id)}


@router.get("/{job_id}/history")
async def get_job_history(
    job_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve conversation history for a specific job.
    Returns messages in chronological order.
    """
    # Verify job ownership
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        messages = await get_history(db, job_id, limit=limit)
    except (ProgrammingError, OperationalError):
        raise HTTPException(
            status_code=503,
            detail="Conversation history service unavailable"
        )

    return {"messages": messages}



@router.get("/{job_id}/video")
async def get_job_video(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """Servir MP4 final del job."""
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.video_url:
        raise HTTPException(status_code=404, detail="Video not ready")

    # Extraer path del video_url
    video_path = os.path.join(VIDEOS_STORAGE, f"{job_id}.mp4")
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(video_path, media_type="video/mp4")


@router.delete("/{job_id}", response_model=dict)
async def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.job_cleanup import delete_job_files

    # Verify current_user owns this job before deletion
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    delete_job_files(job_id, current_user.id)

    # 6. Delete DB record
    db.delete(job)
    db.commit()
    return {"status": "deleted", "job_id": job_id}


@router.post("/generate-script", response_model=ScriptGenerateResponse)
def generate_script(
    req: ScriptGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    from app.modules.llm.script_generator import generate_script_from_info
    from app.modules.llm.resolver import MissingApiKeyError

    try:
        script = generate_script_from_info(
            info=req.info,
            user_id=current_user.id,
            template_id=req.template_id,
            custom_system_prompt=req.custom_prompt,
            api_key=req.api_key,
            provider=req.provider,
            target_duration_seconds=req.target_duration_seconds,
        )
    except MissingApiKeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return ScriptGenerateResponse(script_text=script)


@router.get("", response_model=List[JobListResponse])
async def get_all_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Filter jobs by current_user.id for per-user scoping
    jobs = (
        db.query(JobModel)
        .filter(JobModel.user_id == current_user.id)
        .order_by(JobModel.created_at.desc().nullslast())
        .limit(50)
        .all()
    )
    return [
        JobListResponse(
            job_id=j.id,
            status=j.status,
            script_text=j.script_text,
            video_url=j.video_url,
            created_at=j.created_at,
            aspect_ratio=j.aspect_ratio,
            parent_job_id=j.parent_job_id,
        )
        for j in jobs
    ]
