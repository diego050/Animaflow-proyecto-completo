from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from sqlalchemy.orm import Session
from rq import Queue, Retry
from redis import Redis

from app.schemas.job import (
    JobCreate,
    JobResponse,
    JobListResponse,
    ScriptGenerateRequest,
    ScriptGenerateResponse,
    SceneRegenerateRequest,
)
from app.db.session import get_db
from app.db.models import JobModel, User
from app.core.config import settings
from app.core.security import get_current_active_user
from app.core.limiter import limiter
from app.modules.pipeline.orchestrator import run_pipeline


def get_job_or_404(db: Session, job_id: str, user_id: str) -> JobModel:
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == user_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

router = APIRouter()
redis_conn = Redis.from_url(settings.REDIS_URL)
queue = Queue("default", connection=redis_conn)
render_queue = Queue("render", connection=redis_conn)


@router.post("/", response_model=JobResponse, status_code=201)
@limiter.limit("10/minute")
async def create_job(
    request: Request,
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Associate job with the authenticated user
    new_job = JobModel(
        script_text=job_in.script_text,
        status="pending",
        user_id=current_user.id,
        aspect_ratio=job_in.aspect_ratio,
        tts_provider=job_in.tts_provider,
        tts_voice_id=job_in.tts_voice_id,
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Enviar la tarea pesada a Redis para que el Worker la procese en background
    queue.enqueue(
        run_pipeline,
        new_job.id,
        new_job.script_text,
        job_in.aspect_ratio,
        current_user.id,
        job_in.tts_provider,
        job_in.tts_voice_id,
        job_in.tts_api_key,
        job_timeout="10m",
        retry=Retry(max=3),
    )

    return JobResponse(job_id=new_job.id, status=new_job.status)


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
    )


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

    # Enqueue pipeline with reformat config
    queue.enqueue(
        run_pipeline,
        new_job.id,
        new_job.script_text,
        aspect_ratio,
        current_user.id,
        job.tts_provider or "local_piper",
        job.tts_voice_id or "es_ES-carlfm-x_low",
        None,
        kwargs={"reformatted_from": job.id, "scenes_to_reformat": scenes_to_reformat},
        job_timeout="10m",
        retry=Retry(max=3),
    )

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
    # Verify current_user owns this job before deletion
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

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

    # Encolar la tarea de render en la cola dedicada para tareas pesadas
    from app.modules.remotion.renderer import render_video_pipeline

    render_queue.enqueue(
        render_video_pipeline,
        job.id,
        job_timeout="10m",
        retry=Retry(max=3),
    )  # Puede tardar minutos

    job.status = "queued_render"
    db.commit()

    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
    )


@router.post("/generate-script", response_model=ScriptGenerateResponse)
async def generate_script(
    req: ScriptGenerateRequest,
    current_user: User = Depends(get_current_active_user),
):
    from app.modules.llm.script_generator import generate_script_from_info

    script = generate_script_from_info(
        info=req.info,
        user_id=current_user.id,
        template_id=req.template_id,
        custom_system_prompt=req.custom_prompt,
    )
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

    # Encolar en RQ para no bloquear el request handler
    from app.modules.pipeline.scene_manager import _regenerate_scene_async
    queue.enqueue(
        _regenerate_scene_async,
        job.id,
        job.result_spec,
        scene_index,
        req.media_query,
        req.text,
        current_user.id,
        job_timeout="5m",
    )

    job.status = "queued_scene_regen"
    db.commit()

    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
    )
