"""
Admin API endpoints for the AnimaFlow dashboard.

Provides system statistics, user management, job management,
health checks, and configurable settings for administrators.
"""

from typing import Optional
import io
import os
import time
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import Integer, func, text
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, ConfigDict, Field

from app.db.session import get_db
from app.db.models import User, JobModel, Voice, AdminSettings
from app.core.security import require_admin, get_password_hash
from app.core.config import settings
from app.core.limiter import limiter
from app.core.storage_paths import get_storage_dir
from app.core.audit import log_audit_event
from app.core.logging import get_logger
from app.services.job_cleanup import delete_job_files

router = APIRouter()
logger = get_logger("admin")

# Track app start time for uptime calculation
_APP_START_TIME = time.time()


# ---------------------------------------------------------------------------
# Response Models
# ---------------------------------------------------------------------------
class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    name: str
    role: str
    plan: str = "free"
    is_active: bool
    created_at: Optional[str] = None
    last_login: Optional[str] = None
    total_jobs: int = 0
    completed_jobs: int = 0
    persona: Optional[str] = None


class AdminJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    job_id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    status: str
    script_text: Optional[str] = None
    aspect_ratio: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None
    video_url: Optional[str] = None
    error_message: Optional[str] = None


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    rendering_jobs: int
    pending_jobs: int
    total_storage_mb: float
    avg_render_time_seconds: Optional[float] = None
    success_rate: float


class PaginatedUsersResponse(BaseModel):
    users: list[AdminUserResponse]
    total: int
    page: int
    per_page: int


class PaginatedJobsResponse(BaseModel):
    jobs: list[AdminJobResponse]
    total: int
    page: int
    per_page: int


class AdminUserCreate(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=72)
    name: str = Field(min_length=1, max_length=100)
    # role = solo permisos (user/admin). El "tipo" descriptivo va en persona (onboarding).
    role: str = Field(default="user", pattern=r"^(user|admin)$")
    plan: str = Field(default="free", pattern=r"^(free|paid|business)$")


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------
@router.get("/stats", response_model=AdminStatsResponse)
@limiter.limit("30/minute")
def get_admin_stats(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Return dashboard stats for admin panel."""
    # Single aggregated query for all job stats (was 5 separate queries)
    job_stats = db.query(
        func.count(JobModel.id).label("total"),
        func.sum(func.cast(JobModel.status == "completed", Integer)).label("completed"),
        func.sum(func.cast(JobModel.status.in_(["failed", "failed_render"]), Integer)).label("failed"),
        func.sum(func.cast(JobModel.status == "rendering", Integer)).label("rendering"),
        func.sum(func.cast(JobModel.status == "pending", Integer)).label("pending"),
    ).first()

    total_jobs = job_stats.total or 0
    completed_jobs = job_stats.completed or 0
    failed_jobs = job_stats.failed or 0
    rendering_jobs = job_stats.rendering or 0
    pending_jobs = job_stats.pending or 0

    # User stats (2 queries is fine for this)
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active.is_(True)).count()

    # Calculate success rate
    finished_jobs = completed_jobs + failed_jobs
    success_rate = (completed_jobs / finished_jobs * 100) if finished_jobs > 0 else 0

    # Calculate storage (sum of video file sizes)
    videos_dir = get_storage_dir("videos")
    total_storage_mb = sum(
        os.path.getsize(os.path.join(videos_dir, f)) / (1024 * 1024)
        for f in os.listdir(videos_dir) if os.path.isfile(os.path.join(videos_dir, f))
    ) if os.path.exists(videos_dir) else 0

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_jobs=total_jobs,
        completed_jobs=completed_jobs,
        failed_jobs=failed_jobs,
        rendering_jobs=rendering_jobs,
        pending_jobs=pending_jobs,
        total_storage_mb=total_storage_mb,
        success_rate=success_rate,
    )


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
@router.get("/users", response_model=PaginatedUsersResponse)
@limiter.limit("30/minute")
def list_admin_users(
    request: Request,
    page: int = 1,
    per_page: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all users with stats, with pagination."""

    # Get paginated users first
    users = (
        db.query(User)
        .filter(User.is_deleted.is_(False))
        .order_by(User.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    total = db.query(User).filter(User.is_deleted.is_(False)).count()

    # Get job counts for these users only (1 query instead of N*2)
    user_ids = [u.id for u in users]
    if user_ids:
        job_stats = (
            db.query(
                JobModel.user_id,
                func.count(JobModel.id).label("total"),
                func.sum(func.cast(JobModel.status == "completed", Integer)).label("completed"),
            )
            .filter(JobModel.user_id.in_(user_ids))
            .group_by(JobModel.user_id)
            .all()
        )
        stats_map = {row.user_id: {"total": row.total, "completed": row.completed or 0} for row in job_stats}
    else:
        stats_map = {}

    user_responses = []
    for u in users:
        stats = stats_map.get(u.id, {"total": 0, "completed": 0})
        user_responses.append(AdminUserResponse(
            id=u.id,
            email=u.email,
            name=u.name,
            role=u.role,
            plan=getattr(u, "plan", None) or "free",
            is_active=u.is_active,
            created_at=u.created_at.isoformat() if u.created_at else None,
            last_login=None,
            total_jobs=stats["total"],
            completed_jobs=stats["completed"],
            persona=getattr(u, "persona", None),
        ))

    return PaginatedUsersResponse(
        users=user_responses,
        total=total,
        page=page,
        per_page=per_page,
    )


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
    log_audit_event(db, current_user.id, "user_toggle", ip_address=request.client.host if request.client else None, details={"target_user_id": user_id, "new_status": user.is_active})
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
    log_audit_event(db, current_user.id, "role_change", ip_address=request.client.host if request.client else None, details={"target_user_id": user_id, "new_role": role})
    return {"id": user.id, "role": user.role}


@router.put("/users/{user_id}/plan")
@limiter.limit("30/minute")
def change_user_plan(
    request: Request,
    user_id: str,
    plan: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Cambiar el plan/suscripción del usuario (define si se le cobra)."""
    if plan not in ["free", "paid", "business"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid plan")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.plan = plan
    db.commit()
    log_audit_event(db, current_user.id, "plan_change", ip_address=request.client.host if request.client else None, details={"target_user_id": user_id, "new_plan": plan})
    return {"id": user.id, "plan": user.plan}


@router.delete("/users/{user_id}")
@limiter.limit("30/minute")
def delete_user(
    request: Request,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete user permanently with cascade (jobs, voices, files)."""

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
                except OSError as e:
                    logger.warning("Failed to delete video file %s: %s", video_path, e)
        # Delete audio files if referenced in result_spec
        if job.result_spec:
            for scene in job.result_spec.get("scenes", []):
                audio_url = scene.get("audio_url")
                if audio_url:
                    audio_path = os.path.join(get_storage_dir("audio"), os.path.basename(audio_url))
                    if os.path.exists(audio_path):
                        try:
                            os.remove(audio_path)
                        except OSError as e:
                            logger.warning("Failed to delete audio file %s: %s", audio_path, e)
        db.delete(job)

    # 2. Delete user's voices and their audio files
    voices = db.query(Voice).filter(Voice.user_id == user_id).all()
    for voice in voices:
        if voice.audio_sample_path and os.path.exists(voice.audio_sample_path):
            try:
                os.remove(voice.audio_sample_path)
            except OSError as e:
                logger.warning("Failed to delete voice sample file %s: %s", voice.audio_sample_path, e)
        db.delete(voice)

    # 3. Delete user
    db.delete(user)
    db.commit()
    log_audit_event(db, current_user.id, "user_delete", ip_address=request.client.host if request.client else None, details={"target_user_id": user_id, "target_email": user.email})
    return {"message": "User and all associated data deleted permanently"}


@router.post("/users", response_model=AdminUserResponse)
@limiter.limit("30/minute")
def create_user(
    request: Request,
    data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new user from admin panel."""
    email = data.email
    password = data.password
    name = data.name
    role = data.role

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
        plan=data.plan,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit_event(db, current_user.id, "user_create", ip_address=request.client.host if request.client else None, details={"new_user_id": user.id, "new_user_email": user.email})

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        plan=user.plan,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else None,
        last_login=None,
        total_jobs=0,
        completed_jobs=0,
        persona=user.persona,
    )


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------
@router.get("/jobs", response_model=PaginatedJobsResponse)
@limiter.limit("30/minute")
def list_admin_jobs(
    request: Request,
    status_filter: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List all jobs with optional status filter and pagination."""

    query = db.query(JobModel).options(joinedload(JobModel.user))
    if status_filter:
        query = query.filter(JobModel.status == status_filter)

    total = query.count()
    jobs = query.order_by(JobModel.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    job_responses = []
    for j in jobs:
        job_responses.append(AdminJobResponse(
            job_id=j.id,
            user_id=j.user_id,
            user_email=j.user.email if j.user else "Unknown",
            status=j.status,
            script_text=(j.script_text[:100] + "...") if j.script_text else None,
            aspect_ratio=j.aspect_ratio or "9:16",
            created_at=j.created_at.isoformat() if j.created_at else None,
            completed_at=None,
            video_url=j.video_url,
            error_message=j.error_message,
        ))

    return PaginatedJobsResponse(
        jobs=job_responses,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/jobs/{job_id}/spec")
@limiter.limit("60/minute")
def admin_job_spec(
    job_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Spec completo de un job (solo lectura) → para ver la composición en el panel admin."""
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado.")
    return {
        "job_id": job.id,
        "status": job.status,
        "aspect_ratio": job.aspect_ratio or (job.result_spec or {}).get("aspect_ratio") or "9:16",
        "video_url": job.video_url,
        "result_spec": job.result_spec,
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

    job.status = "pending"
    db.commit()
    log_audit_event(db, current_user.id, "job_retry", ip_address=request.client.host if request.client else None, details={"job_id": job_id})

    return {"message": "Job queued for retry (picked up by scheduler)", "job_id": job_id}


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
    log_audit_event(db, current_user.id, "job_cancel", ip_address=request.client.host if request.client else None, details={"job_id": job_id})
    return {"message": "Job cancelled", "job_id": job_id}


@router.delete("/jobs/{job_id}")
@limiter.limit("30/minute")
def delete_job(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a job and all associated files from disk."""

    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    delete_job_files(job_id, job.user_id)

    db.delete(job)
    db.commit()
    log_audit_event(db, current_user.id, "job_delete", ip_address=request.client.host if request.client else None, details={"job_id": job_id})
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
    # Check Database
    database_connected = False
    database_pool_size = 0
    database_pool_used = 0
    try:
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
    except Exception as e:
        logger.exception("Database health check failed: %s", e)

    # Render-server (Node/Remotion): motor de preview/render y smoke-test. Ping a /health.
    render_url = getattr(settings, "RENDER_SERVER_URL", "") or ""
    render_connected = False
    render_detail = "No configurado"
    if render_url:
        try:
            import httpx
            with httpx.Client(timeout=4.0) as client:
                r = client.get(f"{render_url.rstrip('/')}/health")
            render_connected = r.status_code == 200
            render_detail = "Conectado correctamente" if render_connected else f"HTTP {r.status_code}"
        except Exception as e:  # noqa: BLE001
            render_detail = f"No se puede conectar ({type(e).__name__})"

    # Almacenamiento: los directorios de trabajo existen y se puede escribir.
    storage_ok = True
    storage_detail_parts = []
    for name in ("audio", "videos", "exports"):
        try:
            d = get_storage_dir(name)
            writable = os.path.isdir(d) and os.access(d, os.W_OK)
            storage_ok = storage_ok and writable
            storage_detail_parts.append(f"{name}:{'ok' if writable else 'error'}")
        except Exception:  # noqa: BLE001
            storage_ok = False
            storage_detail_parts.append(f"{name}:error")

    # Uptime (process start time approximation)
    uptime_seconds = time.time() - _APP_START_TIME

    return {
        "database_connected": database_connected,
        "database_pool_size": database_pool_size,
        "database_pool_used": database_pool_used,
        "render_server_connected": render_connected,
        "render_server_url": render_url,
        "render_server_detail": render_detail,
        "storage_ok": storage_ok,
        "storage_detail": ", ".join(storage_detail_parts),
        "uptime_seconds": uptime_seconds,
        "status": "healthy" if (database_connected and render_connected and storage_ok) else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
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

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    month_ago = now - timedelta(days=30)

    # 1. Usuarios registrados esta semana
    users_this_week = db.query(User).filter(User.created_at >= week_ago).count()

    # 2. Tasa de activación (usuarios nuevos que crearon video en primeros 7 días)
    # Fixed N+1: single grouped query instead of per-user loop
    new_user_ids = {u[0] for u in db.query(User.id).filter(User.created_at >= week_ago).all()}

    if new_user_ids:
        first_jobs = (
            db.query(JobModel.user_id, func.min(JobModel.created_at).label("first_job"))
            .filter(
                JobModel.user_id.in_(new_user_ids),
                JobModel.user_id.isnot(None),
                JobModel.status.in_(["completed", "completed_video"]),
            )
            .group_by(JobModel.user_id)
            .all()
        )
        first_job_user_ids = {row.user_id for row in first_jobs}
        activated_users = len(first_job_user_ids)
    else:
        activated_users = 0
    activation_rate = (activated_users / len(new_user_ids) * 100) if new_user_ids else 0

    # 3. Tiempo promedio registro -> primer export (en horas)
    # Calculate average time from user registration to first completed job
    first_export_times = (
        db.query(
            func.min(JobModel.created_at - User.created_at).label("time_to_first_export")
        )
        .join(User, JobModel.user_id == User.id)
        .filter(
            JobModel.user_id.isnot(None),
            JobModel.status.in_(["completed", "completed_video"]),
        )
        .group_by(JobModel.user_id)
        .all()
    )

    if first_export_times:
        total_hours = sum(
            row.time_to_first_export.total_seconds() / 3600
            for row in first_export_times
            if row.time_to_first_export is not None
        )
        avg_time_to_first_export = round(total_hours / len(first_export_times), 1)
    else:
        avg_time_to_first_export = 0

    # 4. Tasa de retención semanal (usuarios que renderizaron semana pasada Y esta semana)
    # Fixed N+1: fetch only distinct user_ids instead of full JobModel rows
    last_week_user_ids = {
        row[0] for row in
        db.query(JobModel.user_id)
        .filter(
            JobModel.created_at >= two_weeks_ago,
            JobModel.created_at < week_ago,
            JobModel.status.in_(["completed", "completed_video"]),
            JobModel.user_id.isnot(None),
        )
        .distinct()
        .all()
    }

    this_week_user_ids = {
        row[0] for row in
        db.query(JobModel.user_id)
        .filter(
            JobModel.created_at >= week_ago,
            JobModel.status.in_(["completed", "completed_video"]),
            JobModel.user_id.isnot(None),
        )
        .distinct()
        .all()
    }

    retained_users = len(last_week_user_ids & this_week_user_ids)
    retention_rate = (retained_users / len(last_week_user_ids) * 100) if last_week_user_ids else 0

    # 5. Churn rate (usuarios inactivos > 30 días)
    total_users = db.query(User).count()
    active_this_month = db.query(User).filter(User.created_at >= month_ago).count()  # Simplification
    churn_rate = ((total_users - active_this_month) / total_users * 100) if total_users else 0

    # 6. Usuarios reactivados (inactivos >30 días pero con actividad en los últimos 7 días)
    # Find users who had no completed jobs between 30-7 days ago, but have completed jobs in last 7 days
    recently_active_user_ids = {
        row[0] for row in
        db.query(JobModel.user_id)
        .filter(
            JobModel.created_at >= week_ago,
            JobModel.status.in_(["completed", "completed_video"]),
            JobModel.user_id.isnot(None),
        )
        .distinct()
        .all()
    }

    previously_active_user_ids = {
        row[0] for row in
        db.query(JobModel.user_id)
        .filter(
            JobModel.created_at >= month_ago,
            JobModel.created_at < week_ago,
            JobModel.status.in_(["completed", "completed_video"]),
            JobModel.user_id.isnot(None),
        )
        .distinct()
        .all()
    }

    # Reactivated = active now but NOT active in the previous period (30-7 days ago)
    reactivated_users = len(recently_active_user_ids - previously_active_user_ids)

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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Return admin-configurable settings from the database."""
    # Default settings
    defaults = {
        "site_name": "AnimaFlow",
        "max_jobs_per_user": 10,
        "default_voice": "es_ES-carlfm-x_low",
        "maintenance_mode": False,
    }

    # Override with DB values
    settings_rows = db.query(AdminSettings).all()
    for s in settings_rows:
        if s.key in defaults:
            defaults[s.key] = s.value

    return defaults


@router.put("/settings")
@limiter.limit("30/minute")
def update_admin_settings(
    request: Request,
    settings_payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update admin settings in the database."""
    allowed_keys = {"site_name", "max_jobs_per_user", "default_voice", "maintenance_mode"}

    for key, value in settings_payload.items():
        if key not in allowed_keys:
            continue

        # Upsert: update existing or create new
        setting = db.query(AdminSettings).filter(AdminSettings.key == key).first()
        if setting:
            setting.value = value
            setting.updated_at = datetime.now(timezone.utc)
        else:
            setting = AdminSettings(key=key, value=value)
            db.add(setting)

    db.commit()

    return {"message": "Settings updated", "settings": settings_payload}


# NOTA: el endpoint "/components/{name}/ae-script" (descarga del .jsx de UN componente
# para probar en AE) se eliminó junto con el orquestador/playground. El export AE ahora
# es por FOOTAGE (ver ae_export/footage_exporter.py).
