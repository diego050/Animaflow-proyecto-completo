"""
Router para endpoints de exportación de AnimaFlow.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from rq import Queue
from redis import Redis

from app.db.session import get_db
from app.services.ae_export import create_export_zip, generate_ae_export_async, _persist_job_spec
from app.db.models import JobModel
from app.core.config import settings

import os

router = APIRouter(prefix="/api/jobs", tags=["exports"])

redis_conn = Redis.from_url(settings.REDIS_URL)
queue = Queue("default", connection=redis_conn)


@router.post("/{job_id}/export/after-effects")
async def trigger_ae_export(job_id: str, force: bool = False, db: Session = Depends(get_db)):
    """
    Triggers async AE export job. Generates AE scripts for all scenes, then creates zip.
    If force=True, clears existing scripts and regenerates all scenes.
    """
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    
    if not job.result_spec:
        raise HTTPException(status_code=400, detail="El job no tiene spec.json generado")
    
    # Enqueue export job (always, to allow regeneration)
    queue.enqueue(generate_ae_export_async, job_id, force, job_timeout="10m")
    
    job.result_spec['_ae_export_status'] = 'queued'
    job.result_spec['_ae_export_progress'] = {'current': 0, 'total': len(job.result_spec.get('scenes', []))}
    _persist_job_spec(job_id, job.result_spec)
    
    return {"status": "queued"}


@router.get("/{job_id}/export/after-effects/status")
async def get_ae_export_status(job_id: str, db: Session = Depends(get_db)):
    """
    Returns AE export progress.
    """
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    
    export_status = job.result_spec.get('_ae_export_status', 'pending') if job.result_spec else 'pending'
    export_progress = job.result_spec.get('_ae_export_progress', {'current': 0, 'total': 0}) if job.result_spec else {}
    
    return {
        "status": export_status,
        "progress": export_progress,
        "filename": job.result_spec.get('_ae_export_filename') if export_status == 'completed' else None
    }


@router.get("/{job_id}/export/after-effects/download")
async def download_ae_export(job_id: str, db: Session = Depends(get_db)):
    """
    Downloads the generated AE export zip.
    """
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    
    export_status = job.result_spec.get('_ae_export_status') if job.result_spec else None
    if export_status != 'completed':
        raise HTTPException(status_code=400, detail=f"Export not completed yet (status: {export_status})")
    
    zip_path = job.result_spec.get('_ae_export_zip_path')
    zip_filename = job.result_spec.get('_ae_export_filename')
    
    if not zip_path or not os.path.exists(zip_path):
        raise HTTPException(status_code=404, detail="Export file not found on disk")
    
    return FileResponse(
        path=zip_path,
        filename=zip_filename,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_filename}"}
    )


@router.get("/{job_id}/export/spec-json")
async def export_spec_json(job_id: str, db: Session = Depends(get_db)):
    """
    Exporta el spec.json de un job.
    
    Args:
        job_id: ID del job
        db: Sesión de SQLAlchemy
    
    Returns:
        Archivo JSON descargable
    """
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    
    if not job.result_spec:
        raise HTTPException(status_code=400, detail="El job no tiene spec.json generado")
    
    # Guardar spec.json temporalmente
    from tempfile import NamedTemporaryFile
    
    with NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        import json
        json.dump(job.result_spec, f, indent=2)
        temp_path = f.name
    
    return FileResponse(
        path=temp_path,
        filename=f"animaflow_{job_id}_spec.json",
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=animaflow_{job_id}_spec.json"
        }
    )
