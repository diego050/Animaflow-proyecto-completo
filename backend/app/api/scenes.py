import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import JobModel, User
from app.core.security import get_current_user_from_token
from app.core.storage_paths import get_storage_dir

router = APIRouter(prefix="/api", tags=["scenes"])

SCENES_STORAGE = get_storage_dir("scenes")


@router.get("/scenes/{job_id}/{scene_index}.mp4")
async def get_scene_video(
    job_id: str,
    scene_index: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token),
):
    """Servir MP4 de una escena individual."""
    # Verificar ownership del job
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    scene_path = os.path.join(SCENES_STORAGE, job_id, f"{scene_index}.mp4")
    if not os.path.exists(scene_path):
        raise HTTPException(status_code=404, detail="Scene video not found")

    return FileResponse(scene_path, media_type="video/mp4")
