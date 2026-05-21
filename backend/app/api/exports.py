"""
Router para endpoints de exportación de AnimaFlow.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from rq import Queue, Retry
from redis import Redis

from app.db.session import get_db
from app.db.models import User
from app.modules.ae_export.zip_exporter import create_export_zip
from app.modules.ae_export.worker import generate_ae_export_async, _persist_job_spec
from app.db.models import JobModel
from app.core.config import settings
from app.core.security import get_current_active_user
from app.core.limiter import limiter

import os
import io
import json

router = APIRouter(prefix="/api/jobs", tags=["exports"])


def get_job_or_404(db: Session, job_id: str, user_id: str) -> JobModel:
    """Fetch a job ensuring it belongs to the given user."""
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == user_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

redis_conn = Redis.from_url(settings.REDIS_URL)
queue = Queue("default", connection=redis_conn)
render_queue = Queue("render", connection=redis_conn)


@router.post("/{job_id}/export/after-effects")
@limiter.limit("5/minute")
async def trigger_ae_export(
    request: Request,
    job_id: str,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Triggers async AE export job. Generates AE scripts for all scenes, then creates zip.
    If force=True, clears existing scripts and regenerates all scenes.
    """
    job = get_job_or_404(db, job_id, current_user.id)

    if not job.result_spec:
        raise HTTPException(status_code=400, detail="Job does not have a generated spec.json")

    # Enqueue export job en la cola de render (tarea pesada)
    render_queue.enqueue(
        generate_ae_export_async,
        job_id,
        force,
        job_timeout="10m",
        retry=Retry(max=3),
    )

    job.result_spec["_ae_export_status"] = "queued"
    job.result_spec["_ae_export_progress"] = {
        "current": 0,
        "total": len(job.result_spec.get("scenes", [])),
    }
    _persist_job_spec(job_id, job.result_spec)

    return {"status": "queued"}


@router.get("/{job_id}/export/after-effects/status")
@limiter.limit("5/minute")
async def get_ae_export_status(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns AE export progress.
    """
    job = get_job_or_404(db, job_id, current_user.id)

    export_status = (
        job.result_spec.get("_ae_export_status", "pending")
        if job.result_spec
        else "pending"
    )
    export_progress = (
        job.result_spec.get("_ae_export_progress", {"current": 0, "total": 0})
        if job.result_spec
        else {}
    )

    return {
        "status": export_status,
        "progress": export_progress,
        "filename": job.result_spec.get("_ae_export_filename")
        if export_status == "completed"
        else None,
    }


@router.get("/{job_id}/export/after-effects/download")
@limiter.limit("5/minute")
async def download_ae_export(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Downloads the generated AE export zip.
    """
    job = get_job_or_404(db, job_id, current_user.id)

    export_status = job.result_spec.get("_ae_export_status") if job.result_spec else None
    if export_status != "completed":
        raise HTTPException(
            status_code=400, detail=f"Export not completed yet (status: {export_status})"
        )

    zip_path = job.result_spec.get("_ae_export_zip_path")
    zip_filename = job.result_spec.get("_ae_export_filename")

    if not zip_path or not os.path.exists(zip_path):
        raise HTTPException(status_code=404, detail="Export file not found on disk")

    return FileResponse(
        path=zip_path,
        filename=zip_filename,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_filename}"},
    )


@router.get("/{job_id}/export/spec-json")
@limiter.limit("5/minute")
async def export_spec_json(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Exporta el spec.json de un job.

    Args:
        job_id: ID del job
        db: Sesión de SQLAlchemy
        current_user: Authenticated user

    Returns:
        Archivo JSON descargable
    """
    job = get_job_or_404(db, job_id, current_user.id)

    if not job.result_spec:
        raise HTTPException(status_code=400, detail="Job does not have a generated spec.json")

    # Guardar spec.json temporalmente
    from tempfile import NamedTemporaryFile

    with NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        import json

        json.dump(job.result_spec, f, indent=2)
        temp_path = f.name

    return FileResponse(
        path=temp_path,
        filename=f"animaflow_{job_id}_spec.json",
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=animaflow_{job_id}_spec.json"
        },
    )


@router.get("/{job_id}/scenes/{scene_index}/audio")
@limiter.limit("5/minute")
async def download_scene_audio(
    request: Request,
    job_id: str,
    scene_index: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Download audio for a specific scene."""
    job = get_job_or_404(db, job_id, current_user.id)

    if not job.result_spec or not job.result_spec.get("scenes"):
        raise HTTPException(status_code=404, detail="No scenes found")

    scenes = job.result_spec["scenes"]
    if scene_index < 0 or scene_index >= len(scenes):
        raise HTTPException(status_code=404, detail="Scene not found")

    audio_dir = f"storage/audio/{job_id}"
    audio_extensions = [".mp3", ".wav", ".ogg", ".m4a"]
    audio_path = None

    for ext in audio_extensions:
        candidate = os.path.join(audio_dir, f"scene_{scene_index}{ext}")
        if os.path.exists(candidate):
            audio_path = candidate
            break

    if not audio_path:
        raise HTTPException(status_code=404, detail="Audio not found for this scene")

    return FileResponse(
        audio_path,
        media_type="audio/mpeg",
        filename=f"scene_{scene_index + 1}_audio{os.path.splitext(audio_path)[1]}",
    )


@router.get("/{job_id}/scenes/{scene_index}/spec")
@limiter.limit("5/minute")
async def download_scene_spec(
    request: Request,
    job_id: str,
    scene_index: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Download spec.json for a specific scene."""
    job = get_job_or_404(db, job_id, current_user.id)

    if not job.result_spec or not job.result_spec.get("scenes"):
        raise HTTPException(status_code=404, detail="No scenes found")

    scenes = job.result_spec["scenes"]
    if scene_index < 0 or scene_index >= len(scenes):
        raise HTTPException(status_code=404, detail="Scene not found")

    scene = scenes[scene_index]

    scene_spec = {
        "scene_index": scene_index,
        "start_time_seconds": scene.get("start_time_seconds", 0),
        "duration_seconds": scene.get("duration_seconds", 0),
        "text": scene.get("text", ""),
        "media_query": scene.get("media_query", ""),
        "animation_spec": scene.get("animation_spec", {}),
        "remotion_props": scene.get("remotion_props", {}),
        "sfx": scene.get("sfx", []),
        "word_timestamps": scene.get("word_timestamps", []),
    }

    return StreamingResponse(
        io.BytesIO(json.dumps(scene_spec, indent=2).encode("utf-8")),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="scene_{scene_index + 1}_spec.json"'
        },
    )


@router.get("/{job_id}/scenes/{scene_index}/video")
@limiter.limit("5/minute")
async def download_scene_video(
    request: Request,
    job_id: str,
    scene_index: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Download rendered video for a specific scene (if available)."""
    job = get_job_or_404(db, job_id, current_user.id)

    video_dir = f"storage/videos/{job_id}"
    video_path = os.path.join(video_dir, f"scene_{scene_index}.mp4")

    if not os.path.exists(video_path):
        full_video = os.path.join(video_dir, "output.mp4")
        if os.path.exists(full_video):
            raise HTTPException(
                status_code=400,
                detail="Per-scene video not available. Download full video instead.",
            )
        raise HTTPException(status_code=404, detail="Video not found for this scene")

    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename=f"scene_{scene_index + 1}_video.mp4",
    )
