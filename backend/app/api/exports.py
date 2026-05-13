"""
Router para endpoints de exportación de AnimaFlow.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.ae_export import create_export_zip
from app.db.models import JobModel

import os

router = APIRouter(prefix="/api/jobs", tags=["exports"])


@router.get("/{job_id}/export/after-effects")
async def export_after_effects(job_id: str, db: Session = Depends(get_db)):
    """
    Exporta un job a After Effects (.zip con script.jsx + audio + spec.json).
    
    Args:
        job_id: ID del job a exportar
        db: Sesión de SQLAlchemy
    
    Returns:
        Archivo .zip descargable
    """
    # Verificar que el job existe
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    
    # Verificar que tiene spec.json
    if not job.result_spec:
        raise HTTPException(status_code=400, detail="El job no tiene spec.json generado")
    
    # Crear zip
    zip_path, zip_filename = create_export_zip(job_id, db)
    
    if not zip_path:
        raise HTTPException(status_code=500, detail=f"Error creando exportación: {zip_filename}")
    
    # Retornar archivo para descarga
    return FileResponse(
        path=zip_path,
        filename=zip_filename,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={zip_filename}"
        }
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
