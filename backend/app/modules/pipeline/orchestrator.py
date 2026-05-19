import os
import asyncio
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import JobModel
from app.schemas.spec import TimelineSpec
from app.core.logging import get_logger

logger = get_logger("pipeline")

from ..tts.service import generate_tts_with_voicebox, AUDIO_STORAGE
from ..segmentation.service import split_text_into_chunks
from ..llm.visual_spec import generate_batch_visuals_with_llm
from ..remotion.component_generator import generate_remotion_component
from ..remotion.index_writer import write_index_ts


async def _process_chunks_async(
    job_id: str,
    chunks: list[str],
    batch_visuals,
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
) -> list[dict]:
    from app.core.resolutions import get_resolution

    w, h = get_resolution(aspect_ratio)
    timeline_scenes = []
    current_start_time = 0.0

    for i, chunk in enumerate(chunks):
        logger.info("Enviando escena %d a Voicebox para TTS...", i + 1, extra={"job_id": job_id})
        duration, audio_url = await generate_tts_with_voicebox(chunk, f"Escena-{i+1}")
        logger.info("TTS escena %d: duration=%s, audio_url=%s", i + 1, duration, audio_url, extra={"job_id": job_id})

        if duration is None:
            duration = max(3.0, len(chunk) / 15.0)

        # Download audio from Voicebox and cache locally
        if audio_url:
            os.makedirs(AUDIO_STORAGE, exist_ok=True)
            local_path = os.path.join(AUDIO_STORAGE, f"{job_id}_{i}.mp3")
            try:
                import httpx

                async with httpx.AsyncClient() as client:
                    response = await client.get(audio_url, timeout=10)
                    if response.status_code == 200:
                        with open(local_path, "wb") as f:
                            f.write(response.content)
                        audio_url = f"http://localhost:8000/api/audio/{job_id}_{i}.mp3"
                        logger.info("Audio cached locally: %s", local_path, extra={"job_id": job_id})
                    else:
                        logger.warning(
                            "Failed to download audio from Voicebox: %d",
                            response.status_code,
                            extra={"job_id": job_id},
                        )
                        audio_url = None
            except (httpx.HTTPError, httpx.TimeoutException, OSError) as e:
                logger.error("Error downloading audio: %s", e, extra={"job_id": job_id})
                audio_url = None

        visual_spec = (
            batch_visuals.scenes[i]
            if i < len(batch_visuals.scenes)
            else batch_visuals.scenes[-1]
        )

        logger.info("Generando código TSX de Remotion para escena %d...", i + 1, extra={"job_id": job_id})
        component_type_name = await generate_remotion_component(
            i, visual_spec, chunk, duration, job_id, aspect_ratio, user_id
        )

        if i < len(chunks) - 1:
            await asyncio.sleep(4)

        # AE script generation deferred to export step (saves tokens during iteration)
        logger.info("AE script generation deferred to export step (escena %d)", i + 1, extra={"job_id": job_id})

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
                "ae_script_code": None,
            }
        )
        current_start_time += duration

    write_index_ts(job_id, timeline_scenes)
    return timeline_scenes


def run_pipeline(
    job_id: str, script_text: str, aspect_ratio: str = "9:16", user_id: Optional[str] = None
):
    """Ejecuta el pipeline completo de generación de video."""
    db: Session = SessionLocal()
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        db.close()
        return

    # Actualizar aspect_ratio del job
    job.aspect_ratio = aspect_ratio
    db.commit()

    try:
        # Estado 1: Segmentación
        job.status = "segmenting"
        db.commit()

        # 1. Fragmentación Lógica (Multi-Scene)
        chunks = split_text_into_chunks(script_text)
        if not chunks:
            chunks = [script_text]

        logger.info(
            "Guion segmentado en %d escenas (aspect_ratio: %s)",
            len(chunks),
            aspect_ratio,
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
            _process_chunks_async(job_id, chunks, batch_visuals, aspect_ratio, user_id)
        )

        # Guardamos el timeline completo y lo validamos con Pydantic
        final_spec = {"scenes": timeline_scenes, "aspect_ratio": aspect_ratio}
        spec_obj = TimelineSpec(**final_spec)
        job.result_spec = spec_obj.model_dump()

        # Estado 4: Completado
        job.status = "completed"
        db.commit()

    except Exception as e:
        # Fallback: mark job as failed on any unexpected pipeline error
        logger.exception("Pipeline failed unexpectedly: %s", e, extra={"job_id": job_id})
        job.status = f"failed: {str(e)}"
        db.commit()
    finally:
        db.close()
