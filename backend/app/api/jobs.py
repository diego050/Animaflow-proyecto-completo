from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from rq import Queue
from redis import Redis

from app.schemas.job import JobCreate, JobResponse
from app.db.session import get_db
from app.db.models import JobModel, User
from app.core.config import settings
from app.core.security import get_current_active_user
from app.services.pipeline import run_pipeline

router = APIRouter()
redis_conn = Redis.from_url(settings.REDIS_URL)
queue = Queue("default", connection=redis_conn)


@router.post("/", response_model=JobResponse, status_code=201)
async def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Associate job with the authenticated user
    new_job = JobModel(
        script_text=job_in.script_text,
        status="pending",
        user_id=current_user.id,
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
        job_timeout="10m",
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
        raise HTTPException(status_code=404, detail="Job no encontrado")

    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
    )


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
        raise HTTPException(status_code=404, detail="Job no encontrado")

    db.delete(job)
    db.commit()
    return {"status": "deleted", "job_id": job_id}


@router.post("/{job_id}/render", response_model=JobResponse)
async def trigger_render(
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
        raise HTTPException(status_code=404, detail="Job no encontrado")

    if not job.result_spec:
        raise HTTPException(
            status_code=400, detail="El job aún no tiene un Spec generado para renderizar"
        )

    if job.status == "rendering":
        raise HTTPException(status_code=400, detail="El job ya se está renderizando")

    # Encolar la tarea de render
    from app.services.pipeline import render_video_pipeline

    queue.enqueue(render_video_pipeline, job.id, job_timeout="10m")  # Puede tardar minutos

    job.status = "queued_render"
    db.commit()

    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
    )


from typing import List
from app.schemas.job import (
    JobCreate,
    JobResponse,
    SceneRegenerateRequest,
    JobListResponse,
    ScriptGenerateRequest,
    ScriptGenerateResponse,
)


@router.post("/generate-script", response_model=ScriptGenerateResponse)
async def generate_script(
    req: ScriptGenerateRequest,
    current_user: User = Depends(get_current_active_user),
):
    from app.services.pipeline import generate_script_from_info

    script = generate_script_from_info(req.info, current_user.id)
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
        raise HTTPException(status_code=404, detail="Job no encontrado o sin spec")

    if scene_index < 0 or scene_index >= len(job.result_spec.get("scenes", [])):
        raise HTTPException(status_code=400, detail="Índice de escena inválido")

    from app.services.pipeline import _regenerate_scene_async

    try:
        # Usamos await directo porque FastAPI ya corre en un event loop
        updated_spec = await _regenerate_scene_async(
            job.id, job.result_spec, scene_index, req.media_query, req.text, current_user.id
        )

        # Clonamos el diccionario para asegurar que SQLAlchemy detecte el cambio en el JSON
        job.result_spec = dict(updated_spec)

        # En SQLAlchemy, cuando mutas campos JSON, a veces necesitas flag_modified
        from sqlalchemy.orm.attributes import flag_modified

        flag_modified(job, "result_spec")

        db.commit()
    except Exception as e:
        print(f"Error regenerando: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return JobResponse(
        job_id=job.id,
        status=job.status,
        result_spec=job.result_spec,
        video_url=job.video_url,
    )
