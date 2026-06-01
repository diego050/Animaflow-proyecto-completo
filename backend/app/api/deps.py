"""
Shared API dependencies and utilities.
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import JobModel


def get_job_or_404(db: Session, job_id: str, user_id: str) -> JobModel:
    """Fetch a job ensuring it belongs to the given user. Raises 404 if not found."""
    job = db.query(JobModel).filter(
        JobModel.id == job_id,
        JobModel.user_id == user_id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
