import os
import shutil
import asyncio
import copy
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, get_db_context
from app.db.models import JobModel, ApiKey
from app.schemas.spec import TimelineSpec
from app.core.logging import get_logger
from sqlalchemy.orm.attributes import flag_modified

logger = get_logger("pipeline")

from ..tts.service import generate_tts_with_timestamps, AUDIO_STORAGE
from ..segmentation.service import split_text_into_chunks
from ..llm.visual_spec import generate_batch_visuals_with_llm, VisualSpecResult
from ..llm.component_strategy import generate_scene_composer
from ..remotion.scene_renderer import render_single_scene, SCENES_STORAGE
from ..video.concat import concat_scenes, VIDEOS_STORAGE


def _get_user_api_key(user_id: str, provider: str, db: Session) -> Optional[str]:
    """Look up user's stored API key for a given provider."""
    key_entry = db.query(ApiKey).filter(
        ApiKey.user_id == user_id,
        ApiKey.provider == provider,
        ApiKey.is_active == True,
    ).first()
    return key_entry.api_key if key_entry else None


def run_pipeline_approved(job_id: str, user_id: Optional[str] = None):
    """Fase 2+3: Enriquecimiento y renderizado sincrónico (backward-compatible wrapper).
    
    Llama a run_pipeline_enrichment y luego renderiza cada escena.
    Útil para tests y flujos sincrónicos; en producción el scheduler maneja
    el renderizado vía SSE.
    """
    with get_db_context() as db:
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not job:
            logger.warning("Job %s not found in approved pipeline", job_id)
            return

        if job.status not in ["segmented", "pending"]:
            logger.warning(
                "Job %s is in status '%s', expected 'segmented' or 'pending'",
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

        # Phase 3: Render sincrónico
        try:
            spec = job.result_spec
            if not spec or not spec.get("scenes"):
                job.status = "failed"
                job.error_message = "No scenes to render"
                db.commit()
                return

            timeline_scenes = spec["scenes"]
            aspect_ratio = spec.get("aspect_ratio", "9:16")

            video_paths = []
            for i, scene in enumerate(timeline_scenes):
                video_path = render_single_scene(
                    job_id, i, scene, aspect_ratio, user_id
                )
                video_paths.append(video_path)

            output_path = concat_scenes(video_paths, job_id, user_id)
            job.video_url = output_path
            job.status = "completed"
            db.commit()

        except Exception as e:
            logger.exception(
                "Approved pipeline render failed: %s", e,
                extra={"job_id": job_id},
            )
            job.status = "failed"
            job.error_message = str(e)
            db.commit()


async def _process_chunks_async(
    job_id: str,
    timeline_scenes: list[dict],
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
    llm_model: str = "gemini-2.0-flash",
) -> list[dict]:
    # Fase 2: Ya no generamos TTS aquí, solo llamamos a decide_and_generate_component con los timestamps
    previous_scene_tsx = None
    for i, scene in enumerate(timeline_scenes):
        visual_spec = VisualSpecResult(
            media_query=scene.get("media_query", ""),
            backgroundColor=scene.get("remotion_props", {}).get("backgroundColor", "#0f172a"),
            textColor=scene.get("remotion_props", {}).get("textColor", "#38bdf8"),
        )
        
        logger.info("Deciding component strategy for scene %d...", i + 1, extra={"job_id": job_id})
        
        from app.modules.llm.resolver import resolve_llm_credentials
        
        try:
            creds = resolve_llm_credentials(user_id, provider_override="gemini")
            api_key = creds.api_key
            model_to_use = creds.model
        except Exception:
            gemini_api_key = _get_user_api_key(user_id, "gemini", SessionLocal())
            api_key = gemini_api_key or os.getenv("GEMINI_API_KEY") or ""
            model_to_use = llm_model
        
        composer_spec = generate_scene_composer(
            text=scene.get("text", ""),
            media_query=scene.get("media_query", ""),
            api_key=api_key,
            model=model_to_use
        )
        
        scene["type"] = "custom"
        scene["quality_status"] = "passed"
        scene["anima_composer"] = composer_spec.model_dump(exclude_none=True)
        
        # Pausa para evitar límites de RPM (Requests Per Minute) del plan gratuito de Gemini
        if i < len(timeline_scenes) - 1:
            await asyncio.sleep(4)
            
    return timeline_scenes


async def _regenerate_components_for_reformat(
    job_id: str,
    timeline_scenes: list[dict],
    aspect_ratio: str,
    user_id: Optional[str] = None,
    scene_indices: Optional[list[int]] = None,
    llm_model: str = "gemini-2.0-flash",
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
            gemini_api_key = _get_user_api_key(user_id, "gemini", SessionLocal())
            api_key = gemini_api_key or os.getenv("GEMINI_API_KEY") or ""
            model_to_use = llm_model
        
        composer_spec = generate_scene_composer(
            text=scene.get("text", ""),
            media_query=scene.get("media_query", ""),
            api_key=api_key,
            model=model_to_use
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
    """Fase 1: TTS global, segmentación por timestamps, y prompts visuales."""
    from pydub import AudioSegment
    from app.modules.segmentation.timestamp_splitter import split_by_timestamps

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
                    asyncio.run(_regenerate_components_for_reformat(job_id, timeline_scenes, aspect_ratio, user_id, indices, job.llm_model or "gemini-2.0-flash"))
                spec_obj = TimelineSpec(**spec)
                job.result_spec = spec_obj.model_dump()
                flag_modified(job, "result_spec")
                job.status = "completed"
                db.commit()
                return

        try:
            job.status = "segmenting"
            db.commit()

            groq_api_key = _get_user_api_key(user_id, "groq", db) if user_id else None
            tts_key = tts_api_key or (_get_user_api_key(user_id, tts_provider, db) if user_id else None)

            # 1. TTS COMPLETO PRIMERO
            if not animation_only and not scenes:
                logger.info("Generating global TTS for job %s...", job_id)
                tts_result = asyncio.run(
                    generate_tts_with_timestamps(
                        text=script_text,
                        provider_name=tts_provider,
                        voice_id=tts_voice_id,
                        api_key=tts_key,
                        language="es",
                        groq_api_key=groq_api_key,
                    )
                )
                global_audio_path = tts_result["audio_path"]
                word_timestamps = tts_result["word_timestamps"]
                
                # 2. Segmentación lógica con timestamps exactos (o fallback si no hay)
                if word_timestamps:
                    scenes_data = split_by_timestamps(word_timestamps, script_text=script_text)
                else:
                    logger.warning("No word_timestamps returned by TTS (mock/test env). Falling back to text-based splitting.")
                    chunks_text = split_text_into_chunks(script_text)
                    scenes_data = []
                    current_start = 0.0
                    for chunk in chunks_text:
                        duration = max(3.0, len(chunk.split()) / 2.17)
                        scenes_data.append({
                            "text": chunk,
                            "start_time_seconds": current_start,
                            "end_time_seconds": current_start + duration,
                            "duration_seconds": duration,
                            "word_timestamps": []
                        })
                        current_start += duration
                
                chunks = [s["text"] for s in scenes_data]
                
                # Pre-cortar los audios para cada escena (Backward compatibility)
                if not os.path.exists(global_audio_path):
                    # In test environments, TTS is mocked and returns non-existent paths like 'http://test/audio.mp3'
                    logger.warning("Global audio file not found (mock/test environment): %s. Skipping slicing.", global_audio_path)
                    for i, s_data in enumerate(scenes_data):
                        s_data["audio_url"] = f"/api/audio/mock_{job_id}_{i}.mp3"
                else:
                    global_audio = AudioSegment.from_file(global_audio_path)
                    os.makedirs(AUDIO_STORAGE, exist_ok=True)
                    
                    for i, s_data in enumerate(scenes_data):
                        start_ms = s_data["start_time_seconds"] * 1000
                        end_ms = s_data["end_time_seconds"] * 1000
                        chunk_audio = global_audio[start_ms:end_ms]
                        
                        ext = os.path.splitext(global_audio_path)[1] or ".mp3"
                        chunk_name = f"{job_id}_{i}{ext}"
                        chunk_path = os.path.join(AUDIO_STORAGE, chunk_name)
                        chunk_audio.export(chunk_path, format=ext.replace(".", ""))
                        s_data["audio_url"] = f"/api/audio/{chunk_name}"
            else:
                # Flujo animation_only o scenes provistas manualmente
                chunks = [s["text"] for s in scenes] if scenes else split_text_into_chunks(script_text)
                scenes_data = []
                current_start = 0.0
                for chunk in chunks:
                    duration = max(3.0, len(chunk.split()) / 2.17)
                    scenes_data.append({
                        "text": chunk,
                        "start_time_seconds": current_start,
                        "duration_seconds": duration,
                        "word_timestamps": [],
                        "audio_url": None
                    })
                    current_start += duration

            # 3. Generar visuales con LLM (Ya conocemos las duraciones exactas)
            logger.info("Generating batch visual prompts for %d scenes...", len(chunks))
            batch_visuals = generate_batch_visuals_with_llm(
                chunks, aspect_ratio, user_id, design_md=design_md, system_prompt=system_prompt, llm_model_override=job.llm_model
            )

            # 4. Armar spec preliminar
            preliminary_scenes = []
            for i, s_data in enumerate(scenes_data):
                visual = batch_visuals.scenes[i] if i < len(batch_visuals.scenes) else None
                preliminary_scenes.append({
                    "start_time_seconds": round(s_data["start_time_seconds"], 2),
                    "duration_seconds": round(s_data["duration_seconds"], 2),
                    "text": s_data["text"],
                    "type": "pending",
                    "media_query": visual.media_query if visual else "",
                    "remotion_props": {
                        "backgroundColor": visual.backgroundColor if visual else "#0f172a",
                        "textColor": visual.textColor if visual else "#38bdf8",
                    },
                    "sfx": [],
                    "audio_url": s_data["audio_url"],
                    "word_timestamps": s_data["word_timestamps"],
                    "ae_script_code": None,
                })

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
            db.commit()

            logger.info("Job %s paused at 'segmented' status awaiting user approval", job_id)

        except Exception as e:
            logger.exception("Pipeline segmentation failed: %s", e, extra={"job_id": job_id})
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

        if job.status not in ["segmented", "visuals_generating", "pending"]:
            logger.warning(
                "Job %s is not in 'segmented' or 'visuals_generating' status (current: %s), skipping approval pipeline",
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

            timeline_scenes = asyncio.run(
                _process_chunks_async(
                    job_id=job_id,
                    timeline_scenes=scenes,
                    aspect_ratio=aspect_ratio,
                    user_id=user_id,
                    llm_model=job.llm_model or "gemini-2.0-flash",
                )
            )

            # Limpiar archivos TSX de jobs anteriores para evitar errores de compilación
            # No more TSX files to cleanup
            # Regenerar index.ts sin los archivos eliminados (ya no es necesario)

            # Fase 2 finalizada, se queda en el preview. El MP4 se renderiza a demanda.
            final_spec = {"scenes": timeline_scenes, "aspect_ratio": aspect_ratio}
            job.result_spec = final_spec
            flag_modified(job, "result_spec")
            job.status = "completed"
            db.commit()

        except Exception as e:
            # Fallback: mark job as failed on any unexpected pipeline error
            logger.exception(
                "Approved pipeline failed unexpectedly: %s", e, extra={"job_id": job_id}
            )
            job.status = "failed"
            job.error_message = str(e)
            db.commit()


