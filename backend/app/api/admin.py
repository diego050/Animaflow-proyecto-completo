"""
Admin API endpoints for the AnimaFlow dashboard.

Provides system statistics, user management, job management,
health checks, and configurable settings for administrators.
"""

from typing import Optional
import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from sqlalchemy.orm import Session
from rq import Queue, Retry
from redis import Redis

from app.db.session import get_db
from app.db.models import User, JobModel
from app.core.security import require_admin, get_password_hash
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter()
redis_conn = Redis.from_url(settings.REDIS_URL)
queue = Queue("default", connection=redis_conn)


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------
@router.get("/stats")
@limiter.limit("30/minute")
def get_admin_stats(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Return dashboard stats for admin panel."""
    total_users = db.query(User).count()
    total_jobs = db.query(JobModel).count()
    active_jobs = (
        db.query(JobModel)
        .filter(JobModel.status.in_(["pending", "processing", "rendering", "queued_render"]))
        .count()
    )
    completed_jobs = (
        db.query(JobModel).filter(JobModel.status == "completed").count()
    )
    failed_jobs = (
        db.query(JobModel)
        .filter(JobModel.status.in_(["failed", "failed_render"]))
        .count()
    )

    return {
        "total_users": total_users,
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "completed_jobs": completed_jobs,
        "failed_jobs": failed_jobs,
    }


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
@router.get("/users")
@limiter.limit("30/minute")
def list_admin_users(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all users with stats."""
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "job_count": db.query(JobModel).filter(JobModel.user_id == u.id).count(),
        }
        for u in users
    ]


@router.put("/users/{user_id}/toggle")
@limiter.limit("30/minute")
def toggle_user(
    request: Request,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Toggle user active status."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}


@router.put("/users/{user_id}/role")
@limiter.limit("30/minute")
def change_user_role(
    request: Request,
    user_id: str,
    role: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Change user role."""
    if role not in ["founder", "agency", "user", "admin"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.role = role
    db.commit()
    return {"id": user.id, "role": user.role}


@router.delete("/users/{user_id}")
@limiter.limit("30/minute")
def delete_user(
    request: Request,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete user (hard delete)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


@router.post("/users")
@limiter.limit("30/minute")
def create_user(
    request: Request,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new user from admin panel."""
    email = data.get("email")
    password = data.get("password")
    name = data.get("name", "User")
    role = data.get("role", "user")

    # Validate
    if not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email and password required")

    if role not in ["founder", "agency", "user", "admin"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

    # Check if exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    # Create user
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        name=name,
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
    }


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------
@router.get("/jobs")
@limiter.limit("30/minute")
def list_admin_jobs(
    request: Request,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all jobs with optional status filter."""
    query = db.query(JobModel)
    if status:
        query = query.filter(JobModel.status == status)
    jobs = query.order_by(JobModel.created_at.desc()).all()
    return [
        {
            "id": j.id,
            "job_id": j.id,
            "status": j.status,
            "user_id": j.user_id,
            "script_text": (j.script_text[:100] + "...") if j.script_text else None,
            "created_at": j.created_at,
        }
        for j in jobs
    ]


@router.post("/jobs/{job_id}/retry")
@limiter.limit("30/minute")
def retry_job(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Retry a failed job."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status not in ["failed", "failed_render"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed jobs can be retried",
        )

    from app.modules.pipeline.orchestrator import run_pipeline

    job.status = "pending"
    db.commit()

    # Re-enqueue to the default RQ queue
    queue.enqueue(
        run_pipeline,
        job.id,
        job.script_text,
        job.aspect_ratio,
        job.user_id,
        job_timeout="10m",
        retry=Retry(max=3),
    )

    return {"message": "Job queued for retry", "job_id": job_id}


@router.post("/jobs/{job_id}/cancel")
@limiter.limit("30/minute")
def cancel_job(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Cancel a pending/processing job."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status not in ["pending", "processing", "rendering", "queued_render"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel active jobs",
        )
    job.status = "cancelled"
    db.commit()
    return {"message": "Job cancelled", "job_id": job_id}


@router.delete("/jobs/{job_id}")
@limiter.limit("30/minute")
def delete_job(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a job."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}


# ---------------------------------------------------------------------------
# System Health
# ---------------------------------------------------------------------------
@router.get("/system/health")
@limiter.limit("30/minute")
def system_health(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Return system health status."""
    health_data = {
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }

    try:
        import psutil
        health_data.update(
            {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": psutil.disk_usage("/").percent,
            }
        )
    except ImportError:
        # psutil not installed – return basic health info only
        pass

    return health_data


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
@router.get("/settings")
@limiter.limit("30/minute")
def get_admin_settings(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Return admin-configurable settings."""
    return {
        "site_name": "AnimaFlow",
        "max_jobs_per_user": 10,
        "default_voice": "default",
        "maintenance_mode": False,
    }


@router.put("/settings")
@limiter.limit("30/minute")
def update_admin_settings(
    request: Request,
    settings_payload: dict = Body(...),
    current_user: User = Depends(require_admin),
):
    """Update admin settings.

    For MVP, settings are not persisted to DB.
    In production, these would be stored in a settings table or config store.
    """
    return {"message": "Settings updated", "settings": settings_payload}
