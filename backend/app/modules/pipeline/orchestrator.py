import os
import shutil
import asyncio
import copy
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.logging import get_logger
from app.core.file_logger import JobFileLogger
from app.db.session import SessionLocal, get_db_context
from app.db.models import JobModel, ApiKey
from app.schemas.spec import TimelineSpec
from app.modules.tts.service import AUDIO_STORAGE
from app.modules.segmentation.service import split_text_into_chunks
from app.modules.llm.visual_spec import generate_batch_visuals_with_llm, VisualSpecResult
from app.modules.llm.component_strategy import generate_scene_composer
from app.core.async_utils import run_async

logger = get_logger("pipeline")


def _get_user_api_key(user_id: str, provider: str, db: Session) -> Optional[str]:
    """Look up user's stored API key for a given provider."""
    key_entry = db.query(ApiKey).filter(
        ApiKey.user_id == user_id,
        ApiKey.provider == provider,
        ApiKey.is_active.is_(True),
    ).first()
    return key_entry.api_key if key_entry else None


def run_pipeline_approved(job_id: str, user_id: Optional[str] = None):
    """Fase 2: Enriquecimiento sincrónico (TTS + animaciones).
    
    Prepara el job para renderizado on-demand. No renderiza MP4 automáticamente;
    el render se triggera cuando el usuario solicita descargar el video.
    En producción el scheduler maneja el renderizado vía _phase_render().
    """
    with get_db_context() as db:
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not job:
            logger.warning("Job %s not found in approved pipeline", job_id)
            return

        if job.status not in ["segmented"]:
            logger.warning(
                "Job %s is in status '%s', expected 'segmented'",
                job_id, job.status,
            )
            return

        # Phase 2: Enrichment (reutiliza la función existente)
        run_pipeline_enrichment(
            job_id=job_id,
            user_id=user_id,
        )
        db.refresh(job)

        if job.status != "queued_render":
            return


async def _process_chunks_async(
    job_id: str,
    timeline_scenes: list[dict],
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
    llm_model: str = "gemini-2.0-flash",
    db: Optional[Session] = None,
) -> list[dict]:
    """Fase 2: Genera TTS por escena + componentes visuales (anima_composer)."""
    from app.modules.tts.service import generate_tts_with_timestamps
    from app.modules.llm.resolver import resolve_llm_credentials

    previous_scene_tsx = None
    current_offset = 0.0
    GAP_MS = 300  # 300ms gap between scenes

    # Resolve TTS credentials once
    tts_provider = "local_piper"
    tts_voice_id = "es_ES-carlfm-x_low"
    tts_key = None
    groq_api_key = None
    if user_id:
        if db:
            tts_key = _get_user_api_key(user_id, tts_provider, db)
            groq_api_key = _get_user_api_key(user_id, "groq", db)
        else:
            with SessionLocal() as temp_session:
                tts_key = _get_user_api_key(user_id, tts_provider, temp_session)
                groq_api_key = _get_user_api_key(user_id, "groq", temp_session)

    for i, scene in enumerate(timeline_scenes):
        JobFileLogger.log(job_id, "INFO", f"Procesando escena {i+1}/{len(timeline_scenes)}...")

        # ── Step 1: Generate TTS for this scene ──
        scene_text = scene.get("text", "")
        if scene_text and not scene.get("audio_url"):
            logger.info("  Scene %d/%d: generating TTS...", i + 1, len(timeline_scenes))
            try:
                tts_result = await generate_tts_with_timestamps(
                    text=scene_text,
                    provider_name=tts_provider,
                    voice_id=tts_voice_id,
                    api_key=tts_key,
                    language="es",
                    groq_api_key=groq_api_key,
                )

                duration = tts_result.get("duration_seconds", 0)
                scene["duration_seconds"] = round(duration, 2)
                scene["start_time_seconds"] = round(current_offset, 2)

                # Save audio file and set URL
                audio_path = tts_result.get("audio_path")
                if audio_path and os.path.exists(audio_path):
                    os.makedirs(AUDIO_STORAGE, exist_ok=True)
                    ext = os.path.splitext(audio_path)[1] or ".mp3"
                    chunk_name = f"{job_id}_{i}{ext}"
                    chunk_path = os.path.join(AUDIO_STORAGE, chunk_name)
                    shutil.copy2(audio_path, chunk_path)
                    scene["audio_url"] = f"/api/audio/{chunk_name}"

                # Offset word timestamps to global timeline
                scene_wts = []
                for wt in tts_result.get("word_timestamps", []):
                    scene_wts.append({
                        "word": wt["word"],
                        "start": round(wt["start"] + current_offset, 3),
                        "end": round(wt["end"] + current_offset, 3),
                    })
                scene["word_timestamps"] = scene_wts

                current_offset += duration + (GAP_MS / 1000)

            except Exception as e:
                error_msg = str(e)
                if error_msg.startswith("[TTS_"):
                    # Preserve the error code for the frontend to display the right message
                    JobFileLogger.log(job_id, "ERROR", f"TTS error: {error_msg}")
                    scene["tts_error_code"] = error_msg.split("]")[0].lstrip("[")
                else:
                    logger.warning("TTS failed for scene %d: %s. Using estimated duration.", i + 1, e)
                word_count = len(scene_text.split())
                estimated_duration = max(3.0, word_count / 2.17)
                scene["duration_seconds"] = round(estimated_duration, 2)
                scene["start_time_seconds"] = round(current_offset, 2)
                scene["audio_url"] = None
                scene["word_timestamps"] = []
                current_offset += estimated_duration + (GAP_MS / 1000)
        else:
            # Scene already has audio_url (e.g., from manual upload or previous run) — skip TTS
            logger.info("Scene %d already has audio, skipping TTS", i + 1)
            duration = scene.get("duration_seconds", 3.0)
            scene["start_time_seconds"] = round(current_offset, 2)
            current_offset += duration + (GAP_MS / 1000)

        # ── Step 2: Generate anima_composer (visual component spec) ──
        if scene.get("anima_composer"):
            logger.info("Scene %d already has animation spec, skipping LLM call", i + 1)
        else:
            visual_spec = VisualSpecResult(
                media_query=scene.get("media_query", ""),
                backgroundColor=scene.get("remotion_props", {}).get("backgroundColor", "#0f172a"),
                textColor=scene.get("remotion_props", {}).get("textColor", "#38bdf8"),
            )

            logger.info("Deciding component strategy for scene %d...", i + 1, extra={"job_id": job_id})

            try:
                creds = resolve_llm_credentials(user_id, provider_override="gemini")
                api_key = creds.api_key
                model_to_use = creds.model
            except Exception:
                if db:
                    gemini_api_key = _get_user_api_key(user_id, "gemini", db)
                else:
                    with SessionLocal() as temp_session:
                        gemini_api_key = _get_user_api_key(user_id, "gemini", temp_session)
                api_key = gemini_api_key or os.getenv("GEMINI_API_KEY") or ""
                model_to_use = llm_model

            composer_spec = generate_scene_composer(
                text=scene.get("text", ""),
                media_query=scene.get("media_query", ""),
                api_key=api_key,
                model=model_to_use,
                db=db,
                aspect_ratio=aspect_ratio,
            )

            scene["type"] = "custom"
            scene["quality_status"] = "passed"
            scene["anima_composer"] = composer_spec.model_dump(exclude_none=True)

        # Pausa para evitar límites de RPM (Requests Per Minute) del plan gratuito de Gemini
        if i < len(timeline_scenes) - 1:
            await asyncio.sleep(4)

    JobFileLogger.log(job_id, "INFO", "Componentes generados. Finalizando...")
    return timeline_scenes


async def _regenerate_components_for_reformat(
    job_id: str,
    timeline_scenes: list[dict],
    aspect_ratio: str,
    user_id: Optional[str] = None,
    scene_indices: Optional[list[int]] = None,
    llm_model: str = "gemini-2.0-flash",
    db: Optional[Session] = None,
) -> list[dict]:
    """Regenerate Remotion components for specified scenes with a new aspect ratio.
    If scene_indices is None, regenerate all scenes.
    """
    indices = scene_indices if scene_indices is not None else range(len(timeline_scenes))
    for i in indices:
        if i < 0 or i >= len(timeline_scenes):
            continue
        scene = timeline_scenes[i]
        remotion_props = scene.get("remotion_props") or {}
        visual_spec = VisualSpecResult(
            media_query=scene.get("media_query", ""),
            backgroundColor=remotion_props.get("backgroundColor", "#0f172a"),
            textColor=remotion_props.get("textColor", "#38bdf8"),
        )
        from app.modules.llm.resolver import resolve_llm_credentials
        
        try:
            creds = resolve_llm_credentials(user_id, provider_override="gemini")
            api_key = creds.api_key
            model_to_use = creds.model
        except Exception:
            if db:
                gemini_api_key = _get_user_api_key(user_id, "gemini", db)
            else:
                with SessionLocal() as temp_session:
                    gemini_api_key = _get_user_api_key(user_id, "gemini", temp_session)
            api_key = gemini_api_key or os.getenv("GEMINI_API_KEY") or ""
            model_to_use = llm_model
        
        composer_spec = generate_scene_composer(
            text=scene.get("text", ""),
            media_query=scene.get("media_query", ""),
            api_key=api_key,
            model=model_to_use,
            db=db,
            aspect_ratio=aspect_ratio,
        )
        
        scene["type"] = "custom"
        scene["quality_status"] = "passed"
        scene["anima_composer"] = composer_spec.model_dump(exclude_none=True)
    return timeline_scenes


def run_pipeline(
    job_id: str,
    script_text: str,
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
    tts_provider: str = "local_piper",
    tts_voice_id: str = "es_ES-carlfm-x_low",
    tts_api_key: Optional[str] = None,
    reformatted_from: Optional[str] = None,
    scenes_to_reformat: Optional[dict] = None,
    scenes: Optional[list[dict]] = None,
    design_md: Optional[str] = None,
    system_prompt: Optional[str] = None,
    animation_only: bool = False,
):
    """Fase 1: Segmentación de texto + prompts visuales (SIN TTS).

    El TTS se genera después de la aprobación del usuario (Fase 2).
    """
    with get_db_context() as db:
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not job:
            return

        job.aspect_ratio = aspect_ratio
        db.commit()

        # Handle reformatting: reuse existing spec but regenerate visuals for new ratio
        if reformatted_from:
            original = db.query(JobModel).filter(JobModel.id == reformatted_from).first()
            if original and original.result_spec:
                spec = copy.deepcopy(original.result_spec)
                spec["aspect_ratio"] = aspect_ratio
                timeline_scenes = spec.get("scenes", [])
                if timeline_scenes:
                    indices = scenes_to_reformat.get("indices") if scenes_to_reformat else None
                    coro = _regenerate_components_for_reformat(job_id, timeline_scenes, aspect_ratio, user_id, indices, job.llm_model or "gemini-2.0-flash", db=db)
                    timeline_scenes = run_async(coro)
                spec_obj = TimelineSpec(**spec)
                job.result_spec = spec_obj.model_dump()
                flag_modified(job, "result_spec")
                job.status = "completed"
                db.commit()
                return

        try:
            job.status = "segmenting"
            db.commit()
            JobFileLogger.log(job_id, "INFO", "Segmentando texto...")

            # 1. Split text into ~7s chunks (~15 words each)
            if not animation_only and not scenes:
                chunks = split_text_into_chunks(script_text)
            else:
                chunks = [s["text"] for s in scenes] if scenes else split_text_into_chunks(script_text)

            logger.info("Text split into %d chunks for job %s", len(chunks), job_id)
            JobFileLogger.log(job_id, "INFO", f"Texto segmentado en {len(chunks)} escenas")

            # 2. Generate visual prompts (media_query) via LLM — NO TTS yet
            logger.info("Generating batch visual prompts for %d scenes...", len(chunks))
            JobFileLogger.log(job_id, "INFO", "Generando prompts visuales...")
            batch_visuals = generate_batch_visuals_with_llm(
                chunks, aspect_ratio, user_id, design_md=design_md, system_prompt=system_prompt, llm_model_override=job.llm_model
            )

            # 3. Build scenes with estimated durations (no real audio yet)
            #    ~2.17 words/sec → duration = word_count / 2.17, minimum 3s
            ESTIMATED_WPS = 2.17
            GAP_SECONDS = 0.3  # 300ms gap between scenes
            preliminary_scenes = []
            current_start = 0.0

            for i, chunk in enumerate(chunks):
                word_count = len(chunk.split())
                estimated_duration = max(3.0, word_count / ESTIMATED_WPS)
                visual = batch_visuals.scenes[i] if i < len(batch_visuals.scenes) else None

                preliminary_scenes.append({
                    "start_time_seconds": round(current_start, 2),
                    "duration_seconds": round(estimated_duration, 2),
                    "text": chunk,
                    "type": "pending",
                    "media_query": visual.media_query if visual else "",
                    "remotion_props": {
                        "backgroundColor": visual.backgroundColor if visual else "#0f172a",
                        "textColor": visual.textColor if visual else "#38bdf8",
                    },
                    "sfx": [],
                    "audio_url": None,
                    "word_timestamps": [],
                    "ae_script_code": None,
                })

                current_start += estimated_duration + GAP_SECONDS

            # Save preliminary spec and pause for user approval
            preliminary_spec = {
                "scenes": preliminary_scenes,
                "aspect_ratio": aspect_ratio,
                "user_scenes": scenes,
                "design_md": design_md,
                "system_prompt": system_prompt,
                "animation_only": animation_only,
            }
            job.result_spec = preliminary_spec
            flag_modified(job, "result_spec")
            job.status = "segmented"
            JobFileLogger.log(job_id, "INFO", "Esperando aprobación del usuario...")
            db.commit()

            logger.info("Job %s paused at 'segmented' status awaiting user approval", job_id)

        except Exception as e:
            logger.exception("Pipeline segmentation failed: %s", e, extra={"job_id": job_id})
            db.rollback()
            job.status = "failed"
            job.error_message = str(e)
            db.commit()


def run_pipeline_enrichment(
    job_id: str,
    user_id: Optional[str] = None,
    tts_provider: str = "local_piper",
    tts_voice_id: str = "es_ES-carlfm-x_low",
    tts_api_key: Optional[str] = None,
    design_md: Optional[str] = None,
    system_prompt: Optional[str] = None,
):
    """Fase 2: Genera visuals, TTS y componentes tras aprobación de escenas."""
    with get_db_context() as db:
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not job:
            return

        if job.status not in ["segmented", "visuals_generating", "queued_enrichment"]:
            logger.warning(
                "Job %s is not in 'segmented', 'visuals_generating', or 'queued_enrichment' status (current: %s), skipping approval pipeline",
                job_id,
                job.status,
                extra={"job_id": job_id},
            )
            return

        aspect_ratio = job.aspect_ratio or "9:16"
        spec = job.result_spec or {}
        scenes = spec.get("scenes", [])
        if not scenes:
            logger.error("Job %s has no scenes to process", job_id, extra={"job_id": job_id})
            job.status = "failed"
            job.error_message = "No scenes found for approved pipeline"
            db.commit()
            return

        chunks = [scene["text"] for scene in scenes]
        user_scenes = spec.get("user_scenes")  # preserved from initial creation if provided
        design_md = design_md or spec.get("design_md")
        system_prompt = system_prompt or spec.get("system_prompt")
        animation_only = spec.get("animation_only", False)

        # Si no se proporcionó API key explícita, intentar buscarla en DB
        if tts_api_key is None and user_id is not None:
            tts_api_key = _get_user_api_key(user_id, tts_provider, db)
            
        groq_api_key = None
        if user_id is not None:
            groq_api_key = _get_user_api_key(user_id, "groq", db)

        try:
            # (Visuals were already generated in phase 1 and approved by the user)

            # Estado 3: Procesando escenas (TTS + TSX)
            job.status = "processing_scenes"
            db.commit()
            JobFileLogger.log(job_id, "INFO", "Procesando escenas (TTS + Componentes)...")

            JobFileLogger.log(job_id, "INFO", "Iniciando generación de componentes con IA...")
            coro = _process_chunks_async(
                job_id=job_id,
                timeline_scenes=scenes,
                aspect_ratio=aspect_ratio,
                user_id=user_id,
                llm_model=job.llm_model or "gemini-2.0-flash",
                db=db,
            )
            timeline_scenes = run_async(coro)

            # Limpiar archivos TSX de jobs anteriores para evitar errores de compilación

            # Fase 2 finalizada, se queda en el preview. El MP4 se renderiza a demanda.
            final_spec = {"scenes": timeline_scenes, "aspect_ratio": aspect_ratio}
            job.result_spec = final_spec
            flag_modified(job, "result_spec")
            job.status = "queued_render"
            db.commit()

        except Exception as e:
            # Fallback: mark job as failed on any unexpected pipeline error
            logger.exception(
                "Approved pipeline failed unexpectedly: %s", e, extra={"job_id": job_id}
            )
            db.rollback()
            job.status = "failed"
            job.error_message = str(e)
            db.commit()


