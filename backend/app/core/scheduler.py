import asyncio
import json
import asyncpg
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from app.db.session import SessionLocal
from app.db.models import JobModel
from app.core.logging import get_logger
from app.core.config import settings
from app.core.render_adapter import RenderAdapter
from app.modules.pipeline.orchestrator import (
    run_pipeline,
    run_pipeline_enrichment,
)

logger = get_logger("scheduler")
render_adapter = RenderAdapter(render_server_url=settings.RENDER_SERVER_URL)

class Scheduler:
    def __init__(self):
        self.tts_semaphore = asyncio.Semaphore(10)
        self.llm_semaphore = asyncio.Semaphore(5)
        self.render_semaphore = asyncio.Semaphore(3)
        self._stop_event = asyncio.Event()
        self._notify_event = asyncio.Event()
        self.active_tasks: list[asyncio.Task] = []

    def wake_up(self, connection, pid, channel, payload):
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
                            session.commit()
            except Exception as e:
                logger.error(f"Failed to update job {job_id} status after task failure: {e}")

    def _get_job(self, job_id: str):
        """Fetch a job by ID using a fresh session. Returns None if not found."""
        with SessionLocal() as session:
            job = session.query(JobModel).filter_by(id=job_id).first()
            if job:
                # Detach from session so it can be used outside the context
                session.expunge(job)
            return job

    def _cleanup_done_tasks(self):
        done_tasks = [t for t in self.active_tasks if t.done()]
        for task in done_tasks:
            if task in self.active_tasks:
                self.active_tasks.remove(task)

    async def run_forever(self):
        logger.info("Starting PG Scheduler with asyncpg LISTEN...")
        
        # Conexión asíncrona dedicada solo para escuchar NOTIFY
        # Usamos settings.DATABASE_URL
        conn = await asyncpg.connect(settings.DATABASE_URL)
        await conn.add_listener('jobs', self.wake_up)
        
        while not self._stop_event.is_set():
            try:
                await self.recover_stuck_jobs()
                self._cleanup_done_tasks()
                job_processed = await self.take_and_process_job()
                
                if not job_processed:
                    # Dormimos hasta que llegue un NOTIFY o pase 5s por si acaso
                    try:
                        await asyncio.wait_for(self._notify_event.wait(), timeout=5.0)
                    except asyncio.TimeoutError:
                        pass
                    self._notify_event.clear()
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(5)

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
                    WHERE status IN ('pending', 'segmented', 'queued_enrichment', 'queued_render') 
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

                # Must change status before committing so we don't pick it up again immediately
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
                    # Only process if approved, else ignore (release lock)
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
                elif status == 'queued_render':
                    job.status = 'rendering_scenes'
                    session.commit()
                    return (job_id, 'render')
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
        elif phase == 'render':
            task = asyncio.create_task(self._phase_render(job_id))
            self.active_tasks.append(task)
            task.add_done_callback(lambda t: self._task_done_callback(t, job_id, phase))
            
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

    async def _phase_render(self, job_id: str):
        loop = asyncio.get_event_loop()
        try:
            job = self._get_job(job_id)
            if not job: return
            scenes = job.result_spec.get('scenes', []) if job.result_spec else []
            aspect_ratio = job.aspect_ratio
                
            async with self.render_semaphore:
                # Usar RenderAdapter de forma nativa asíncrona, en vez del orchestrator síncrono.
                result = await render_adapter.render(
                    job_id=job_id,
                    scenes=scenes,
                    aspect_ratio=aspect_ratio,
                    mode=settings.RENDER_MODE
                )
                
            with SessionLocal() as session:
                job_in_session = session.query(JobModel).filter_by(id=job_id).first()
                if not job_in_session: return

                if result.get("success"):
                    job_in_session.status = 'completed'
                    job_in_session.video_url = result.get("video_url")
                    logger.info(f"Job {job_id} successfully rendered.")
                else:
                    job_in_session.status = 'failed'
                    job_in_session.error_message = result.get("error", "Unknown render error")
                    logger.error(f"Job {job_id} failed to render: {job_in_session.error_message}")
                session.commit()
                
        except Exception as e:
            logger.error(f"Phase render failed for {job_id}: {e}")
            with SessionLocal() as session:
                job_in_session = session.query(JobModel).filter_by(id=job_id).first()
                if job_in_session:
                    job_in_session.status = 'failed'
                    job_in_session.error_message = str(e)
                    session.commit()

scheduler = Scheduler()
