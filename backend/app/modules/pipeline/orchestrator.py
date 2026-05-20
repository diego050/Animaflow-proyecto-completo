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
from ..remotion.component_generator import generate_remotion_component
from ..remotion.index_writer import write_index_ts


def _get_user_api_key(user_id: str, provider: str, db: Session) -> Optional[str]:
    """Look up user's stored API key for a given provider."""
    key_entry = db.query(ApiKey).filter(
        ApiKey.user_id == user_id,
        ApiKey.provider == provider,
        ApiKey.is_active == True,
    ).first()
    return key_entry.api_key if key_entry else None


async def _process_chunks_async(
    job_id: str,
    chunks: list[str],
    batch_visuals,
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
    tts_provider: str = "local_piper",
    tts_voice_id: str = "es_ES-carlfm-x_low",
    tts_api_key: Optional[str] = None,
) -> list[dict]:
    from app.core.resolutions import get_resolution

    w, h = get_resolution(aspect_ratio)
    timeline_scenes = []
    current_start_time = 0.0

    for i, chunk in enumerate(chunks):
        logger.info(
            "Generando TTS para escena %d con proveedor %s...",
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
                "TTS falló para escena %d, usando fallback de duración estimada: %s",
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
                shutil.copy2(audio_path, standard_path)
                audio_url = f"/api/audio/{standard_name}"
                logger.info(
                    "Audio copiado a ubicación estándar: %s",
                    standard_path,
                    extra={"job_id": job_id},
                )
            except OSError as copy_err:
                logger.error(
                    "Error copiando audio: %s", copy_err, extra={"job_id": job_id}
                )
                audio_url = None
        else:
            audio_url = None

        visual_spec = (
            batch_visuals.scenes[i]
            if i < len(batch_visuals.scenes)
            else batch_visuals.scenes[-1]
        )

        logger.info(
            "Generando código TSX de Remotion para escena %d...",
            i + 1,
            extra={"job_id": job_id},
        )
        component_type_name = await generate_remotion_component(
            i, visual_spec, chunk, duration, job_id, aspect_ratio, user_id
        )

        if i < len(chunks) - 1:
            await asyncio.sleep(4)

        # AE script generation deferred to export step (saves tokens during iteration)
        logger.info(
            "AE script generation deferred to export step (escena %d)",
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
                "remotion_props": {
                    "backgroundColor": visual_spec.backgroundColor,
                    "textColor": visual_spec.textColor,
                },
                "sfx": [],
                "audio_url": audio_url,
                "word_timestamps": word_timestamps,
                "ae_script_code": None,
            }
        )
        current_start_time += duration

    write_index_ts(job_id, timeline_scenes)
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
        new_type = await generate_remotion_component(
            scene_index=i,
            visual_spec=visual_spec,
            text=scene.get("text", ""),
            duration=scene.get("duration_seconds", 5.0),
            job_id=job_id,
            aspect_ratio=aspect_ratio,
            user_id=user_id,
        )
        scene["type"] = new_type
    write_index_ts(job_id, timeline_scenes)
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
):
    """Ejecuta el pipeline completo de generación de video."""
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

        # Si no se proporcionó API key explícita, intentar buscarla en DB
        if tts_api_key is None and user_id is not None:
            tts_api_key = _get_user_api_key(user_id, tts_provider, db)

        try:
            # Estado 1: Segmentación
            job.status = "segmenting"
            db.commit()

            # 1. Fragmentación Lógica (Multi-Scene)
            chunks = split_text_into_chunks(script_text)
            if not chunks:
                chunks = [script_text]

            logger.info(
                "Guion segmentado en %d escenas (aspect_ratio: %s, tts_provider: %s)",
                len(chunks),
                aspect_ratio,
                tts_provider,
                extra={"job_id": job_id},
            )

            # Estado 2: Generando visuales con Gemini
            job.status = "visuals_generating"
            db.commit()

            logger.info("Generando prompts visuales en Batch con Gemini...", extra={"job_id": job_id})
            batch_visuals = generate_batch_visuals_with_llm(chunks, aspect_ratio, user_id)

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
                )
            )

            # Guardamos el timeline completo y lo validamos con Pydantic
            final_spec = {"scenes": timeline_scenes, "aspect_ratio": aspect_ratio}
            spec_obj = TimelineSpec(**final_spec)
            job.result_spec = spec_obj.model_dump()
            flag_modified(job, "result_spec")

            # Estado 4: Completado
            job.status = "completed"
            db.commit()

        except Exception as e:
            # Fallback: mark job as failed on any unexpected pipeline error
            logger.exception("Pipeline failed unexpectedly: %s", e, extra={"job_id": job_id})
            job.status = "failed"
            job.error_message = str(e)
            db.commit()
