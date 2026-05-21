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
    active_users = db.query(User).filter(User.is_active == True).count()
    total_jobs = db.query(JobModel).count()
    completed_jobs = db.query(JobModel).filter(JobModel.status == "completed").count()
    failed_jobs = db.query(JobModel).filter(JobModel.status.in_(["failed", "failed_render"])).count()
    rendering_jobs = db.query(JobModel).filter(JobModel.status == "rendering").count()
    pending_jobs = db.query(JobModel).filter(JobModel.status == "pending").count()

    # Calculate success rate
    finished_jobs = completed_jobs + failed_jobs
    success_rate = (completed_jobs / finished_jobs * 100) if finished_jobs > 0 else 0

    # Calculate storage (sum of video file sizes)
    import os
    from app.core.storage_paths import get_storage_dir
    videos_dir = get_storage_dir("videos")
    total_storage_mb = sum(
        os.path.getsize(os.path.join(videos_dir, f)) / (1024 * 1024)
        for f in os.listdir(videos_dir) if os.path.isfile(os.path.join(videos_dir, f))
    ) if os.path.exists(videos_dir) else 0

    # Avg render time (placeholder for now)
    avg_render_time_seconds = 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "failed_jobs": failed_jobs,
        "rendering_jobs": rendering_jobs,
        "pending_jobs": pending_jobs,
        "total_storage_mb": total_storage_mb,
        "avg_render_time_seconds": avg_render_time_seconds,
        "success_rate": success_rate,
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
    users = db.query(User).filter(User.is_deleted == False).all()
    total = len(users)
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login": None,  # TODO: track last login
                "total_jobs": db.query(JobModel).filter(JobModel.user_id == u.id).count(),
                "completed_jobs": db.query(JobModel).filter(JobModel.user_id == u.id, JobModel.status == "completed").count(),
            }
            for u in users
        ],
        "total": total,
    }


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
    """Delete user permanently with cascade (jobs, voices, files)."""
    import os
    from app.db.models import JobModel, Voice
    from app.core.storage_paths import get_storage_dir

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 1. Delete user's jobs and their files
    jobs = db.query(JobModel).filter(JobModel.user_id == user_id).all()
    for job in jobs:
        # Delete video file if exists
        if job.video_url:
            video_path = os.path.join(get_storage_dir("videos"), os.path.basename(job.video_url))
            if os.path.exists(video_path):
                try:
                    os.remove(video_path)
                except OSError:
                    pass
        # Delete audio files if referenced in result_spec
        if job.result_spec:
            for scene in job.result_spec.get("scenes", []):
                audio_url = scene.get("audio_url")
                if audio_url:
                    audio_path = os.path.join(get_storage_dir("audio"), os.path.basename(audio_url))
                    if os.path.exists(audio_path):
                        try:
                            os.remove(audio_path)
                        except OSError:
                            pass
        db.delete(job)

    # 2. Delete user's voices and their audio files
    voices = db.query(Voice).filter(Voice.user_id == user_id).all()
    for voice in voices:
        if voice.audio_sample_path and os.path.exists(voice.audio_sample_path):
            try:
                os.remove(voice.audio_sample_path)
            except OSError:
                pass
        db.delete(voice)

    # 3. Delete user
    db.delete(user)
    db.commit()
    return {"message": "User and all associated data deleted permanently"}


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
    total = len(jobs)

    return {
        "jobs": [
            {
                "job_id": j.id,
                "user_id": j.user_id,
                "user_email": j.user.email if j.user else "Unknown",
                "status": j.status,
                "script_text": (j.script_text[:100] + "...") if j.script_text else None,
                "aspect_ratio": j.aspect_ratio or "9:16",
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "completed_at": None,  # TODO: track completion time
                "video_url": j.video_url,
                "error_message": None,  # TODO: track errors
            }
            for j in jobs
        ],
        "total": total,
    }


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
    if job.status != "failed":
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
    if job.status not in ["pending", "segmenting", "visuals_generating", "processing_scenes", "rendering", "queued_render", "queued_scene_regen"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel active jobs",
        )
    job.status = "failed"
    job.error_message = "Job cancelled by admin"
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Return system health status."""
    # Check Redis
    redis_connected = False
    redis_queue_length = 0
    try:
        redis_connected = redis_conn.ping()
        redis_queue_length = len(queue.get_job_ids())
    except Exception:
        pass

    # Check Database
    database_connected = False
    database_pool_size = 0
    database_pool_used = 0
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        database_connected = True
        # Get actual pool info from SQLAlchemy engine
        if db.bind and hasattr(db.bind, 'pool'):
            pool = db.bind.pool
            database_pool_size = pool.size() + pool.overflow()
            database_pool_used = pool.checkedout()
        else:
            database_pool_size = 10
            database_pool_used = 0
    except Exception:
        pass

    # Workers info (from RQ)
    workers_active = 0
    workers_idle = 0
    try:
        from rq import Worker
        workers = Worker.all(connection=redis_conn)
        workers_active = sum(1 for w in workers if w.get_state() == 'busy')
        workers_idle = sum(1 for w in workers if w.get_state() == 'idle')
    except Exception:
        pass

    # Uptime (process start time approximation)
    import time
    uptime_seconds = time.time() - getattr(system_health, '_start_time', time.time())
    if not hasattr(system_health, '_start_time'):
        system_health._start_time = time.time()

    return {
        "redis_connected": redis_connected,
        "redis_queue_length": redis_queue_length,
        "workers_active": workers_active,
        "workers_idle": workers_idle,
        "workers_connected": (workers_active + workers_idle) > 0,
        "database_connected": database_connected,
        "database_pool_size": database_pool_size,
        "database_pool_used": database_pool_used,
        "uptime_seconds": uptime_seconds,
        "last_worker_heartbeat": None,
        "status": "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# Business Metrics
# ---------------------------------------------------------------------------
@router.get("/metrics")
@limiter.limit("30/minute")
def get_business_metrics(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Return business metrics for the admin dashboard."""
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    month_ago = now - timedelta(days=30)

    # 1. Usuarios registrados esta semana
    users_this_week = db.query(User).filter(User.created_at >= week_ago).count()

    # 2. Tasa de activación (usuarios nuevos que crearon video en primeros 7 días)
    new_users = db.query(User).filter(User.created_at >= week_ago).all()
    activated_users = 0
    for u in new_users:
        first_job = db.query(JobModel).filter(
            JobModel.user_id == u.id,
            JobModel.created_at >= u.created_at,
            JobModel.created_at <= u.created_at + timedelta(days=7),
            JobModel.status.in_(["completed", "completed_video"])
        ).first()
        if first_job:
            activated_users += 1
    activation_rate = (activated_users / len(new_users) * 100) if new_users else 0

    # 3. Tiempo promedio registro -> primer export
    avg_time_to_first_export = 0  # TODO: implement when tracking export events

    # 4. Tasa de retención semanal (usuarios que renderizaron semana pasada Y esta semana)
    last_week_jobs = db.query(JobModel).filter(
        JobModel.created_at >= two_weeks_ago,
        JobModel.created_at < week_ago,
        JobModel.status.in_(["completed", "completed_video"])
    ).all()
    last_week_user_ids = {j.user_id for j in last_week_jobs}

    this_week_jobs = db.query(JobModel).filter(
        JobModel.created_at >= week_ago,
        JobModel.status.in_(["completed", "completed_video"])
    ).all()
    this_week_user_ids = {j.user_id for j in this_week_jobs}

    retained_users = len(last_week_user_ids & this_week_user_ids)
    retention_rate = (retained_users / len(last_week_user_ids) * 100) if last_week_user_ids else 0

    # 5. Churn rate (usuarios inactivos > 30 días)
    total_users = db.query(User).count()
    active_this_month = db.query(User).filter(User.created_at >= month_ago).count()  # Simplification
    churn_rate = ((total_users - active_this_month) / total_users * 100) if total_users else 0

    # 6. Usuarios reactivados
    reactivated_users = 0  # TODO: implement when tracking login events

    # 7. MRR (Monthly Recurring Revenue) - placeholder
    mrr = 0

    return {
        "users_registered_this_week": users_this_week,
        "activation_rate": round(activation_rate, 1),
        "avg_time_to_first_export_hours": avg_time_to_first_export,
        "weekly_retention_rate": round(retention_rate, 1),
        "churn_rate": round(churn_rate, 1),
        "reactivated_users": reactivated_users,
        "mrr": mrr,
    }


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
        "default_voice": "es_ES-carlfm-x_low",
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
