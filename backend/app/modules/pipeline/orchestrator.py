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
from ..remotion.component_generator import generate_remotion_component, decide_and_generate_component, heal_remotion_component
from ..remotion.index_writer import write_index_ts, cleanup_stale_tsx_files
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
    chunks: list[str],
    batch_visuals,
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
    tts_provider: str = "local_piper",
    tts_voice_id: str = "es_ES-carlfm-x_low",
    tts_api_key: Optional[str] = None,
    user_scenes: Optional[list[dict]] = None,
    animation_only: bool = False,
) -> list[dict]:
    from app.core.resolutions import get_resolution

    w, h = get_resolution(aspect_ratio)
    timeline_scenes = []
    current_start_time = 0.0

    for i, chunk in enumerate(chunks):
        if animation_only:
            # Skip TTS completely
            audio_path = None
            word_timestamps = []
            # Extract duration from user_scenes if available, else default to 7.0
            if user_scenes and i < len(user_scenes) and user_scenes[i].get("duration_seconds"):
                duration = float(user_scenes[i]["duration_seconds"])
            else:
                duration = 7.0
            audio_url = None
            logger.info("Animation only mode: skipped TTS for scene %d (duration: %.1f)", i + 1, duration, extra={"job_id": job_id})
        else:
            logger.info(
                "Generating TTS for scene %d with provider %s...",
                i + 1,
                tts_provider,
                extra={"job_id": job_id},
            )

            try:
                tts_result = await generate_tts_with_timestamps(
                    text=chunk,
                    provider_name=tts_provider,
                    voice_id=tts_voice_id,
                    api_key=tts_api_key,
                    language="es",
                )
                audio_path = tts_result["audio_path"]
                word_timestamps = tts_result["word_timestamps"]
                duration = tts_result["duration_seconds"]
            except Exception as e:
                logger.exception(
                    "TTS failed for scene %d, using estimated duration fallback: %s",
                    i + 1,
                    e,
                    extra={"job_id": job_id},
                )
                audio_path = None
                word_timestamps = []
                duration = max(3.0, len(chunk) / 15.0)

            # Copy/symlink audio to standard location for serving
            if audio_path and os.path.exists(audio_path):
                os.makedirs(AUDIO_STORAGE, exist_ok=True)
                ext = os.path.splitext(audio_path)[1]
                if not ext:
                    ext = ".mp3"
                standard_name = f"{job_id}_{i}{ext}"
                standard_path = os.path.join(AUDIO_STORAGE, standard_name)
                try:
                    shutil.move(audio_path, standard_path)
                    audio_url = f"/api/audio/{standard_name}"
                    logger.info(
                        "Audio moved to standard location: %s",
                        standard_path,
                        extra={"job_id": job_id},
                    )
                except OSError as copy_err:
                    logger.error(
                        "Error copying audio: %s", copy_err, extra={"job_id": job_id}
                    )
                    audio_url = None
            else:
                audio_url = None

        visual_spec = (
            batch_visuals.scenes[i]
            if i < len(batch_visuals.scenes)
            else batch_visuals.scenes[-1]
        )

        # Override media_query if user provided it in pre-defined scenes
        if user_scenes and i < len(user_scenes) and user_scenes[i].get("media_query"):
            visual_spec.media_query = user_scenes[i]["media_query"]

        logger.info(
            "Deciding component strategy for scene %d...",
            i + 1,
            extra={"job_id": job_id},
        )
        component_type_name, q_status, anima_composer_json = await decide_and_generate_component(
            i, visual_spec, chunk, duration, job_id, aspect_ratio, user_id
        )

        if i < len(chunks) - 1:
            await asyncio.sleep(4)

        # AE script generation deferred to export step (saves tokens during iteration)
        logger.info(
            "AE script generation deferred to export step (scene %d)",
            i + 1,
            extra={"job_id": job_id},
        )

        timeline_scenes.append(
            {
                "start_time_seconds": round(current_start_time, 2),
                "duration_seconds": round(duration, 2),
                "text": chunk,
                "type": component_type_name,
                "media_query": visual_spec.media_query,
                "quality_status": q_status,
                "remotion_props": {
                    "backgroundColor": visual_spec.backgroundColor,
                    "textColor": visual_spec.textColor,
                },
                "sfx": [],
                "audio_url": audio_url,
                "word_timestamps": word_timestamps,
                "ae_script_code": None,
                "anima_composer": anima_composer_json,  # None si es Standard Library, dict si es custom
            }
        )
        current_start_time += duration

    write_index_ts(job_id, timeline_scenes, user_id)
    return timeline_scenes


async def _regenerate_components_for_reformat(
    job_id: str,
    timeline_scenes: list[dict],
    aspect_ratio: str,
    user_id: Optional[str] = None,
    scene_indices: Optional[list[int]] = None,
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
        new_type, q_status, anima_composer_json = await decide_and_generate_component(
            scene_index=i,
            visual_spec=visual_spec,
            text=scene.get("text", ""),
            duration=scene.get("duration_seconds", 5.0),
            job_id=job_id,
            aspect_ratio=aspect_ratio,
            user_id=user_id,
        )
        scene["type"] = new_type
        scene["quality_status"] = q_status
        if anima_composer_json is not None:
            scene["anima_composer"] = anima_composer_json
    write_index_ts(job_id, timeline_scenes, user_id)
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
    """Fase 1: Segmenta el guion y pausa en 'segmented' para aprobación del usuario."""
    with get_db_context() as db:
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not job:
            return

        # Actualizar aspect_ratio del job
        job.aspect_ratio = aspect_ratio
        db.commit()

        # Handle reformatting: reuse existing spec but regenerate visuals for new ratio
        if reformatted_from:
            original = db.query(JobModel).filter(JobModel.id == reformatted_from).first()
            if original and original.result_spec:
                logger.info(
                    "Reformatting job %s from %s to aspect ratio %s",
                    job_id,
                    reformatted_from,
                    aspect_ratio,
                    extra={"job_id": job_id},
                )
                spec = copy.deepcopy(original.result_spec)
                spec["aspect_ratio"] = aspect_ratio

                timeline_scenes = spec.get("scenes", [])
                if timeline_scenes:
                    indices = None
                    selection = "all"
                    if scenes_to_reformat:
                        indices = scenes_to_reformat.get("indices")
                        selection = scenes_to_reformat.get("selection", "all")

                    asyncio.run(
                        _regenerate_components_for_reformat(
                            job_id, timeline_scenes, aspect_ratio, user_id, indices
                        )
                    )

                    # Add metadata about reformat
                    spec["reformat_metadata"] = {
                        "original_job_id": reformatted_from,
                        "scene_selection": selection,
                        "reformatted_scenes": indices if indices is not None else list(range(len(timeline_scenes))),
                        "aspect_ratio": aspect_ratio,
                    }

                spec_obj = TimelineSpec(**spec)
                job.result_spec = spec_obj.model_dump()
                flag_modified(job, "result_spec")
                job.status = "completed"
                db.commit()
                logger.info(
                    "Reformat completed for job %s",
                    job_id,
                    extra={"job_id": job_id},
                )
                return

        try:
            # Estado 1: Segmentación
            job.status = "segmenting"
            db.commit()

            # 1. Fragmentación Lógica (Multi-Scene) — or use user-provided scenes
            if scenes:
                chunks = [s["text"] for s in scenes]
                logger.info(
                    "Using %d user-provided scenes (skipping auto-segmentation)",
                    len(chunks),
                    extra={"job_id": job_id},
                )
            else:
                chunks = split_text_into_chunks(script_text)
                if not chunks:
                    chunks = [script_text]

                logger.info(
                    "Script segmented into %d scenes (aspect_ratio: %s, tts_provider: %s)",
                    len(chunks),
                    aspect_ratio,
                    tts_provider,
                    extra={"job_id": job_id},
                )

            # Generate visual prompts for each chunk
            batch_visuals = generate_batch_visuals_with_llm(
                chunks, aspect_ratio, user_id, design_md=design_md, system_prompt=system_prompt
            )

            # Estimate duration based on word count (~130 words/minute = 2.17 words/second)
            words_per_second = 2.17

            preliminary_scenes = []
            current_start = 0.0

            for i, chunk in enumerate(chunks):
                word_count = len(chunk.split())
                estimated_duration = max(3.0, word_count / words_per_second)  # Min 3 seconds

                visual = batch_visuals.scenes[i] if i < len(batch_visuals.scenes) else None

                preliminary_scenes.append(
                    {
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
                    }
                )
                current_start += estimated_duration

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

            logger.info(
                "Job %s paused at 'segmented' status awaiting user scene approval (%d scenes)",
                job_id,
                len(chunks),
                extra={"job_id": job_id},
            )

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
            # Estado 2: Generando visuales con Gemini
            job.status = "visuals_generating"
            db.commit()

            logger.info(
                "Generating visual prompts in batch with Gemini...",
                extra={"job_id": job_id},
            )
            batch_visuals = generate_batch_visuals_with_llm(
                chunks, aspect_ratio, user_id, design_md=design_md, system_prompt=system_prompt
            )

            # Estado 3: Procesando escenas (TTS + TSX)
            job.status = "processing_scenes"
            db.commit()

            timeline_scenes = asyncio.run(
                _process_chunks_async(
                    job_id,
                    chunks,
                    batch_visuals,
                    aspect_ratio,
                    user_id,
                    tts_provider,
                    tts_voice_id,
                    tts_api_key,
                    user_scenes=user_scenes,
                    animation_only=animation_only,
                )
            )

            # Limpiar archivos TSX de jobs anteriores para evitar errores de compilación
            cleanup_stale_tsx_files(job_id, user_id)
            # Regenerar index.ts sin los archivos eliminados
            write_index_ts(job_id, timeline_scenes, user_id)

            # Encolar para la Fase 3: Renderizado
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
            job.status = "failed"
            job.error_message = str(e)
            db.commit()


