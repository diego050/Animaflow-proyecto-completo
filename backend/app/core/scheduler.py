import os
import json
import hashlib
import asyncio
import asyncpg
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy import text
from app.db.session import SessionLocal
from app.db.models import JobModel, TokenBlacklist
from app.core.logging import get_logger
from app.core.config import settings
from app.core.render_adapter import RenderAdapter
from app.core.security import create_access_token
from app.core.storage_paths import get_storage_dir
from app.services.flywheel import approve_and_embed_job
from app.modules.pipeline.orchestrator import (
    run_pipeline,
    run_pipeline_enrichment,
)

logger = get_logger("scheduler")


def compute_spec_hash(scenes, aspect_ratio: str) -> str:
    """Stable hash of the render-relevant inputs (scenes + aspect ratio).

    Used to detect whether a job's spec changed since its last successful
    render, so identical re-renders can be skipped.
    """
    payload = json.dumps(
        {"scenes": scenes, "aspect_ratio": aspect_ratio},
        sort_keys=True,
        ensure_ascii=False,
        default=str,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

class Scheduler:
    def __init__(self):
        self.tts_semaphore = asyncio.Semaphore(10)
        self.llm_semaphore = asyncio.Semaphore(5)
        self.render_semaphore = asyncio.Semaphore(3)
        self._stop_event = asyncio.Event()
        self._notify_event = asyncio.Event()
        self.active_tasks: list[asyncio.Task] = []

    def _get_render_adapter(self):
        """Lazy-initialize RenderAdapter to ensure settings are fully loaded."""
        if not hasattr(self, '_render_adapter'):
            self._render_adapter = RenderAdapter(render_server_url=settings.RENDER_SERVER_URL)
        return self._render_adapter

    def wake_up(self, _connection, _pid, _channel, _payload):
        self._notify_event.set()

    def _task_done_callback(self, task, job_id, phase):
        if task in self.active_tasks:
            self.active_tasks.remove(task)
        if task.exception():
            exc = task.exception()
            logger.error(f"Task for job {job_id} phase {phase} failed: {exc}")
            try:
                job = self._get_job(job_id)
                if job and job.status not in ('completed', 'failed'):
                    with SessionLocal() as session:
                        job_in_session = session.query(JobModel).filter_by(id=job_id).first()
                        if job_in_session:
                            job_in_session.status = 'failed'
                            job_in_session.error_message = f"Pipeline task failed: {exc}"
                            job_in_session.completed_at = datetime.now(timezone.utc)
                            session.commit()
            except Exception as e:
                logger.error(f"Failed to update job {job_id} status after task failure: {e}")

    def _get_job(self, job_id: str) -> Optional[JobModel]:
        """Fetch a job by ID using a fresh session. Returns None if not found."""
        with SessionLocal() as session:
            job = session.query(JobModel).filter_by(id=job_id).first()
            if job:
                # Desvincular de la sesión para poder usarlo fuera del contexto
                session.expunge(job)
            return job

    def _cleanup_done_tasks(self):
        """Remove completed tasks from active_tasks list.
        
        Tasks are normally removed by _task_done_callback when they complete.
        This method is a safety net for edge cases where the callback might not fire.
        The 'if task in self.active_tasks' guard prevents double-removal errors.
        """
        done_tasks = [t for t in self.active_tasks if t.done()]
        for task in done_tasks:
            if task in self.active_tasks:
                self.active_tasks.remove(task)

    def _cleanup_expired_blacklist(self):
        """Remove expired entries from the token blacklist table."""
        try:
            with SessionLocal() as session:
                now = datetime.now(timezone.utc)
                deleted = session.query(TokenBlacklist).filter(
                    TokenBlacklist.expires_at < now
                ).delete()
                if deleted:
                    session.commit()
                    logger.info(f"Cleaned up {deleted} expired blacklist entries.")
        except Exception as e:
            logger.error(f"Failed to cleanup blacklist: {e}")

    async def run_forever(self):
        logger.info("Starting PG Scheduler with asyncpg LISTEN...")

        conn = None
        try:
            conn = await asyncpg.connect(settings.DATABASE_URL)
            await conn.add_listener('jobs', self.wake_up)

            self._cleanup_expired_blacklist()

            while not self._stop_event.is_set():
                try:
                    await self.recover_stuck_jobs()
                    self._cleanup_done_tasks()
                    job_processed = await self.take_and_process_job()

                    if not job_processed:
                        try:
                            await asyncio.wait_for(self._notify_event.wait(), timeout=5.0)
                        except asyncio.TimeoutError:
                            pass
                        self._notify_event.clear()
                except Exception as e:
                    logger.error(f"Scheduler error: {e}")
                    await asyncio.sleep(5)
        finally:
            if conn:
                try:
                    await conn.close()
                    logger.info("asyncpg connection closed.")
                except Exception as e:
                    logger.error(f"Error closing asyncpg connection: {e}")

    async def recover_stuck_jobs(self):
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
        loop = asyncio.get_event_loop()
        
        def _recover():
            with SessionLocal() as session:
                stuck_jobs = session.query(JobModel).filter(
                    JobModel.status.in_(['segmenting', 'visuals_generating', 'processing_scenes', 'rendering_scenes', 'rendering']),
                    JobModel.updated_at < cutoff
                ).all()
                for job in stuck_jobs:
                    logger.info(f"Recovering stuck job {job.id} (status: {job.status})")
                    job.status = 'pending'
                if stuck_jobs:
                    session.commit()
                    
        await loop.run_in_executor(None, _recover)

    async def take_and_process_job(self) -> bool:
        loop = asyncio.get_event_loop()
        
        def _take():
            with SessionLocal() as session:
                sql = text("""
                    SELECT id, status FROM jobs 
                    WHERE status IN ('pending', 'segmented', 'queued_enrichment') 
                    FOR UPDATE SKIP LOCKED 
                    LIMIT 1
                """)
                result = session.execute(sql).fetchone()
                if not result:
                    return None
                
                job_id, status = result
                job = session.query(JobModel).filter_by(id=job_id).first()
                if not job:
                    return None

                # Cambiar el estado antes del commit para no volver a tomarlo inmediatamente
                if status == 'pending':
                    if job.result_spec and job.result_spec.get('scenes') and job.result_spec.get('approved'):
                        job.status = 'visuals_generating'
                        session.commit()
                        return (job_id, 'enrichment')
                    else:
                        job.status = 'segmenting'
                        session.commit()
                        return (job_id, 'segmentation')
                elif status == 'segmented':
                    # Solo procesar si está aprobado, si no ignorar (liberar lock)
                    if job.result_spec and job.result_spec.get('approved'):
                        job.status = 'visuals_generating'
                        session.commit()
                        return (job_id, 'enrichment')
                    else:
                        session.commit()
                        return None
                elif status == 'queued_enrichment':
                    job.status = 'visuals_generating'
                    session.commit()
                    return (job_id, 'enrichment')
                # Render is now on-demand via API endpoint, not automatic via scheduler.
                return None

        result = await loop.run_in_executor(None, _take)
        if not result:
            return False
            
        job_id, phase = result
        logger.info(f"Scheduler picked up job {job_id} for phase {phase}")
        
        if phase == 'segmentation':
            task = asyncio.create_task(self._phase_segmentation(job_id))
            self.active_tasks.append(task)
            task.add_done_callback(lambda t: self._task_done_callback(t, job_id, phase))
        elif phase == 'enrichment':
            task = asyncio.create_task(self._phase_enrichment(job_id))
            self.active_tasks.append(task)
            task.add_done_callback(lambda t: self._task_done_callback(t, job_id, phase))
        # Render phase removed — now triggered on-demand via POST /api/jobs/{job_id}/render

        return True

    async def _phase_segmentation(self, job_id: str):
        loop = asyncio.get_event_loop()
        try:
            job = self._get_job(job_id)
            if not job: return
            script_text = job.script_text
            aspect_ratio = job.aspect_ratio
            user_id = job.user_id
            tts_provider = job.tts_provider
            tts_voice_id = job.tts_voice_id
            # Read design_md and system_prompt from result_spec (set during job creation)
            spec = job.result_spec or {}
            design_md = spec.get("design_md")
            system_prompt = spec.get("system_prompt")
            animation_only = spec.get("animation_only", False)
                
            async with self.llm_semaphore:
                await loop.run_in_executor(
                    None,
                    run_pipeline,
                    job_id,
                    script_text,
                    aspect_ratio,
                    user_id,
                    tts_provider,
                    tts_voice_id,
                    None, # tts_api_key
                    None, # reformatted_from
                    None, # scenes_to_reformat
                    None, # scenes
                    design_md,
                    system_prompt,
                    animation_only,
                )
        except Exception as e:
            logger.error(f"Phase segmentation failed for {job_id}: {e}")
            with SessionLocal() as session:
                job_in_session = session.query(JobModel).filter_by(id=job_id).first()
                if job_in_session and job_in_session.status not in ('completed', 'failed'):
                    job_in_session.status = 'failed'
                    job_in_session.error_message = f"Segmentation failed: {e}"
                    job_in_session.completed_at = datetime.now(timezone.utc)
                    session.commit()

    async def _phase_enrichment(self, job_id: str):
        loop = asyncio.get_event_loop()
        try:
            job = self._get_job(job_id)
            if not job: return
            user_id = job.user_id
            tts_provider = job.tts_provider
            tts_voice_id = job.tts_voice_id
            
            async with self.tts_semaphore:
                await loop.run_in_executor(
                    None,
                    run_pipeline_enrichment,
                    job_id,
                    user_id,
                    tts_provider,
                    tts_voice_id
                )
        except Exception as e:
            logger.error(f"Phase enrichment failed for {job_id}: {e}")
            with SessionLocal() as session:
                job_in_session = session.query(JobModel).filter_by(id=job_id).first()
                if job_in_session and job_in_session.status not in ('completed', 'failed'):
                    job_in_session.status = 'failed'
                    job_in_session.error_message = f"Enrichment failed: {e}"
                    job_in_session.completed_at = datetime.now(timezone.utc)
                    session.commit()

    async def _phase_render(self, job_id: str):
        loop = asyncio.get_event_loop()
        try:
            job = self._get_job(job_id)
            if not job: return
            scenes = job.result_spec.get('scenes', []) if job.result_spec else []
            aspect_ratio = job.aspect_ratio

            # Skip re-rendering when the spec hasn't changed and the MP4 still
            # exists on disk: the previously rendered video serves as-is.
            spec_hash = compute_spec_hash(scenes, aspect_ratio)
            if job.video_url and job.rendered_spec_hash == spec_hash:
                existing = os.path.join(get_storage_dir("videos"), f"{job_id}.mp4")
                if os.path.exists(existing):
                    logger.info(
                        f"Job {job_id}: spec unchanged and MP4 present, skipping render."
                    )
                    with SessionLocal() as session:
                        job_in_session = session.query(JobModel).filter_by(id=job_id).first()
                        if job_in_session:
                            job_in_session.status = 'completed'
                            if not job_in_session.completed_at:
                                job_in_session.completed_at = datetime.now(timezone.utc)
                            session.commit()
                    return

            # Short-lived service token so the render server can authenticate
            # against the protected /api/audio endpoint when downloading TTS.
            render_token = create_access_token(
                {"sub": str(job.user_id)},
                expires_delta=timedelta(minutes=30),
            )

            async with self.render_semaphore:
                # Usar RenderAdapter de forma nativa asíncrona en vez del orchestrator síncrono
                result = await self._get_render_adapter().render(
                    job_id=job_id,
                    scenes=scenes,
                    aspect_ratio=aspect_ratio,
                    mode=settings.RENDER_MODE,
                    auth_token=render_token,
                )
                
            with SessionLocal() as session:
                job_in_session = session.query(JobModel).filter_by(id=job_id).first()
                if not job_in_session: return

                if result.get("success"):
                    job_in_session.status = 'completed'
                    job_in_session.completed_at = datetime.now(timezone.utc)
                    # The render server returns a container filesystem path
                    # (e.g. /app/storage/videos/<job_id>.mp4). Store the web-servable
                    # URL instead, matching the StaticFiles mount at /videos.
                    raw_path = result.get("video_url") or ""
                    filename = os.path.basename(raw_path) if raw_path else f"{job_id}.mp4"
                    job_in_session.video_url = f"/videos/{filename}"
                    # Record the spec that produced this MP4 so identical
                    # re-renders can be skipped later.
                    job_in_session.rendered_spec_hash = spec_hash
                    logger.info(f"Job {job_id} successfully rendered.")
                    # Flywheel: el usuario renderizó → aprobar+embeber sus escenas code-gen.
                    approve_and_embed_job(
                        job_id,
                        (job_in_session.result_spec or {}).get("scenes", []),
                        job_in_session.user_id,
                    )
                else:
                    job_in_session.status = 'failed'
                    job_in_session.completed_at = datetime.now(timezone.utc)
                    job_in_session.error_message = result.get("error", "Unknown render error")
                    logger.error(f"Job {job_id} failed to render: {job_in_session.error_message}")
                session.commit()
                
        except Exception as e:
            logger.error(f"Phase render failed for {job_id}: {e}")
            with SessionLocal() as session:
                job_in_session = session.query(JobModel).filter_by(id=job_id).first()
                if job_in_session:
                    job_in_session.status = 'failed'
                    job_in_session.completed_at = datetime.now(timezone.utc)
                    job_in_session.error_message = str(e)
                    session.commit()

scheduler = Scheduler()
