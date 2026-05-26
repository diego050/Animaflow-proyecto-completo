import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session


from app.schemas.job import (
    JobCreate,
    JobResponse,
    JobListResponse,
    JobDraftRequest,
    ScriptGenerateRequest,
    ScriptGenerateResponse,
    SceneRegenerateRequest,
    SceneApprovalRequest,
)
from app.db.session import get_db
from app.db.models import JobModel, User, DesignTemplate
from app.core.config import settings
from app.core.security import get_current_active_user, get_current_active_user_from_token
from app.core.limiter import limiter
from app.core.storage_paths import get_storage_dir
from app.modules.pipeline.orchestrator import run_pipeline, run_pipeline_enrichment
from app.core.file_logger import JobFileLogger

VIDEOS_STORAGE = get_storage_dir("videos")


def get_job_or_404(db: Session, job_id: str, user_id: str) -> JobModel:
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == user_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

router = APIRouter()


@router.post("/", response_model=JobResponse, status_code=201)
@limiter.limit("10/minute")
async def create_job(
    request: Request,
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
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
    current_user: User = Depends(get_current_active_user),
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
    current_user: User = Depends(get_current_active_user),
):
    """Update an existing draft."""
    job = get_job_or_404(db, job_id, current_user.id)
    if job.status != "draft":
        raise HTTPException(status_code=400, detail="Job is not in draft status")
    
    job.result_spec = draft_in.draft_data
    if "script" in draft_in.draft_data:
        job.script_text = draft_in.draft_data["script"]
        
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(job, "result_spec")
    db.commit()
    return JobResponse(job_id=job.id, status=job.status, result_spec=job.result_spec, error_message=job.error_message)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
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


@router.post("/{job_id}/approve-scenes", response_model=JobResponse)
async def approve_scenes(
    job_id: str,
    approval: SceneApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Approve or edit segmented scenes and continue the pipeline.

    The frontend sends the confirmed/edited scenes with their media_query
    prompts. The pipeline then generates visuals, TTS, and Remotion components.
    """
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "segmented":
        raise HTTPException(
            status_code=400,
            detail=f"Job must be in 'segmented' status to approve scenes (current: {job.status})"
        )

    if not approval.scenes:
        raise HTTPException(status_code=400, detail="No scenes provided for approval")

    # Update status to queued_enrichment to trigger a distinct status change
    # that fires the Postgres NOTIFY and is picked up by the Scheduler.
    current_spec = job.result_spec or {}
    current_spec["approved"] = True
    job.result_spec = current_spec
    job.status = "queued_enrichment"
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(job, "result_spec")
    db.commit()

    # Return immediately with the updated status
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
    current_user: User = Depends(get_current_active_user_from_token),
):
    """Obtener logs del job desde archivo."""
    job = get_job_or_404(db, job_id, current_user.id)
    return {"logs": JobFileLogger.get_logs(job_id)}



@router.get("/{job_id}/video")
async def get_job_video(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user_from_token),
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


@router.post("/{job_id}/reformat")
async def reformat_job(
    job_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Reformat a job to a new aspect ratio with scene selection.

    Body:
        aspect_ratio: str (e.g., "16:9", "9:16", "1:1", "21:9", "2.39:1")
        scene_selection: str ("all", "selected", "current")
        scene_indices: list[int] (required if scene_selection="selected")
        current_scene_index: int (required if scene_selection="current")
    """
    aspect_ratio = data.get("aspect_ratio")
    scene_selection = data.get("scene_selection", "all")
    scene_indices = data.get("scene_indices", [])
    current_scene_index = data.get("current_scene_index")

    # Validate aspect ratio
    if not aspect_ratio:
        raise HTTPException(status_code=400, detail="aspect_ratio required")

    # Support formats: "16:9", "1:1", "21:9", "2.39:1"
    import re
    if not re.match(r'^\d+(\.\d+)?:\d+(\.\d+)?$', aspect_ratio):
        raise HTTPException(status_code=400, detail="Invalid aspect_ratio format. Use 'width:height' (e.g., '16:9', '2.39:1')")

    # Validate scene selection
    if scene_selection not in ["all", "selected", "current"]:
        raise HTTPException(status_code=400, detail="scene_selection must be 'all', 'selected', or 'current'")

    if scene_selection == "selected" and not scene_indices:
        raise HTTPException(status_code=400, detail="scene_indices required when scene_selection='selected'")

    if scene_selection == "current" and current_scene_index is None:
        raise HTTPException(status_code=400, detail="current_scene_index required when scene_selection='current'")

    job = get_job_or_404(db, job_id, current_user.id)

    if not job.result_spec or not job.result_spec.get("scenes"):
        raise HTTPException(status_code=400, detail="Job must be completed before reformatting")

    scenes = job.result_spec["scenes"]

    # Validate scene indices
    if scene_selection == "selected":
        for idx in scene_indices:
            if idx < 0 or idx >= len(scenes):
                raise HTTPException(status_code=400, detail=f"Invalid scene index: {idx}")

    if scene_selection == "current":
        if current_scene_index < 0 or current_scene_index >= len(scenes):
            raise HTTPException(status_code=400, detail=f"Invalid current_scene_index: {current_scene_index}")

    # Create new job
    new_job = JobModel(
        script_text=job.script_text,
        aspect_ratio=aspect_ratio,
        status="pending",
        user_id=current_user.id,
        tts_provider=job.tts_provider,
        tts_voice_id=job.tts_voice_id,
        parent_job_id=job.id,
        llm_model=job.llm_model,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Determine which scenes to reformat
    scenes_to_reformat = {
        "selection": scene_selection,
        "indices": scene_indices if scene_selection == "selected" else
                   [current_scene_index] if scene_selection == "current" else
                   list(range(len(scenes)))
    }

    # El Scheduler procesará esto
    pass

    return {
        "message": "Reformat job created",
        "new_job_id": new_job.id,
        "original_job_id": job.id,
        "aspect_ratio": aspect_ratio,
        "scene_selection": scene_selection,
        "scenes_to_reformat": scenes_to_reformat["indices"],
    }


@router.delete("/{job_id}", response_model=dict)
async def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    import os
    import shutil
    from app.core.storage_paths import get_storage_dir
    from app.core.config import settings as app_settings

    # Verify current_user owns this job before deletion
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # 1. Delete final video file (storage/videos/{job_id}.mp4)
    videos_dir = get_storage_dir("videos")
    for ext in (".mp4", ".webm"):
        video_path = os.path.join(videos_dir, f"{job_id}{ext}")
        if os.path.exists(video_path):
            try:
                os.remove(video_path)
            except OSError:
                pass

    # 2. Delete scene MP4s directory (storage/scenes/{job_id}/)
    scenes_dir = os.path.join(get_storage_dir("scenes"), job_id)
    if os.path.isdir(scenes_dir):
        shutil.rmtree(scenes_dir, ignore_errors=True)

    # 3. Delete audio files (storage/audio/{job_id}_*.wav)
    audio_dir = get_storage_dir("audio")
    if os.path.isdir(audio_dir):
        for fname in os.listdir(audio_dir):
            if fname.startswith(f"{job_id}_"):
                try:
                    os.remove(os.path.join(audio_dir, fname))
                except OSError:
                    pass

    # 4. Delete generated TSX components (frontend/src/remotion/generated/user_*/Scene_{job_id}_*.tsx)
    generated_dir = os.path.join(app_settings.frontend_path, "src", "remotion", "generated")
    user_dir = os.path.join(generated_dir, f"user_{current_user.id}")
    if os.path.isdir(user_dir):
        for fname in os.listdir(user_dir):
            if fname.startswith(f"Scene_{job_id}_") and fname.endswith(".tsx"):
                try:
                    os.remove(os.path.join(user_dir, fname))
                except OSError:
                    pass

    # 5. Delete AE export files (storage/ae_exports/{job_id}*)
    ae_dir = get_storage_dir("ae_exports")
    if os.path.isdir(ae_dir):
        for fname in os.listdir(ae_dir):
            if job_id in fname:
                fpath = os.path.join(ae_dir, fname)
                try:
                    if os.path.isdir(fpath):
                        shutil.rmtree(fpath, ignore_errors=True)
                    else:
                        os.remove(fpath)
                except OSError:
                    pass

    # 6. Delete DB record
    db.delete(job)
    db.commit()
    return {"status": "deleted", "job_id": job_id}


@router.post("/{job_id}/render", response_model=JobResponse)
@limiter.limit("5/minute")
async def trigger_render(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Verify current_user owns this job before triggering render
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.result_spec:
        raise HTTPException(
            status_code=400, detail="Job does not have a generated spec to render"
        )

    if job.status == "rendering":
        raise HTTPException(status_code=400, detail="Job is already rendering")

    job.status = "queued_render"
    db.commit()

    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
        error_message=job.error_message,
    )


@router.post("/generate-script", response_model=ScriptGenerateResponse)
def generate_script(
    req: ScriptGenerateRequest,
    current_user: User = Depends(get_current_active_user),
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
    current_user: User = Depends(get_current_active_user),
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


@router.post("/{job_id}/scenes/{scene_index}/regenerate", response_model=JobResponse)
async def trigger_scene_regenerate(
    job_id: str,
    scene_index: int,
    req: SceneRegenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Verify current_user owns this job before regenerating scene
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job or not job.result_spec:
        raise HTTPException(status_code=404, detail="Job not found or missing spec")

    if scene_index < 0 or scene_index >= len(job.result_spec.get("scenes", [])):
        raise HTTPException(status_code=400, detail="Invalid scene index")

    # We set status to queued_scene_regen for the scheduler
    # wait, the prompt doesn't ask to handle scene regenerate in Day 1 scheduler, but let's just update the status.

    job.status = "queued_scene_regen"
    db.commit()

    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
        error_message=job.error_message,
    )
