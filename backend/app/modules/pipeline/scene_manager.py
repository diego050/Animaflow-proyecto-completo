import asyncio
import os
import shutil
from typing import Optional
from app.db.session import SessionLocal
from app.db.models import JobModel
from app.core.logging import get_logger
from app.core.storage_paths import get_storage_dir

logger = get_logger("pipeline")

AUDIO_STORAGE = get_storage_dir("audio")

from app.modules.tts.service import generate_tts_with_timestamps
from app.modules.llm.visual_spec import VisualSpecResult
from app.modules.llm.component_strategy import generate_scene_composer


async def _regenerate_scene_async(
    job_id: str,
    spec: dict,
    scene_index: int,
    new_media_query: str,
    new_text: str,
    user_id: Optional[str] = None,
    db=None,
) -> dict:
    from typing import Tuple

    ASPECT_RATIOS = {
        "9:16": (1080, 1920),
        "4:5": (1080, 1350),
        "3:4": (1080, 1440),
        "1:1": (1080, 1080),
        "16:9": (1920, 1080),
    }
    DEFAULT_ASPECT_RATIO = "9:16"

    def get_resolution(aspect_ratio: str) -> Tuple[int, int]:
        return ASPECT_RATIOS.get(aspect_ratio, ASPECT_RATIOS[DEFAULT_ASPECT_RATIO])

    scene = spec["scenes"][scene_index]
    aspect_ratio = spec.get("aspect_ratio", "9:16")
    w, h = get_resolution(aspect_ratio)

    if new_text != scene["text"]:
        logger.info("Regenerando TTS para escena %d...", scene_index, extra={"job_id": job_id})
        result = await generate_tts_with_timestamps(
            text=new_text,
            provider_name="local_piper",
            voice_id="es_ES-carlfm-x_low",
        )
        logger.info("TTS escena %d: duration=%s, audio_path=%s", scene_index + 1, result.get("duration_seconds"), result.get("audio_path"), extra={"job_id": job_id})
        duration = result.get("duration_seconds")
        if duration is not None:
            scene["duration_seconds"] = round(duration, 2)
            # Convert disk path to web-accessible URL
            audio_path = result.get("audio_path")
            if audio_path:
                filename = os.path.basename(audio_path)
                standard_path = os.path.join(AUDIO_STORAGE, filename)
                if os.path.abspath(audio_path) != os.path.abspath(standard_path):
                    shutil.copy(audio_path, standard_path)
                scene["audio_url"] = f"/api/audio/{filename}"

    scene["text"] = new_text
    scene["media_query"] = new_media_query

    visual_spec = VisualSpecResult(
        media_query=new_media_query,
        backgroundColor=scene.get("remotion_props", {}).get("backgroundColor", "#0f172a"),
        textColor=scene.get("remotion_props", {}).get("textColor", "#ffffff"),
    )

    logger.info("Regenerando JSON para escena %d...", scene_index, extra={"job_id": job_id})
    
    from app.modules.pipeline.orchestrator import _get_user_api_key
    with SessionLocal() as temp_session:
        groq_api_key = _get_user_api_key(user_id, "groq", temp_session)
    api_key = groq_api_key or os.getenv("GROQ_API_KEY") or ""
    
    composer_spec = generate_scene_composer(
        text=new_text,
        media_query=new_media_query,
        api_key=api_key,
        model="gemini-2.0-flash",
        db=db,
    )

    scene["type"] = "custom"
    scene["quality_status"] = "passed"
    scene["anima_composer"] = composer_spec.model_dump(exclude_none=True)

    # AE script generation deferred to export step
    scene["ae_script_code"] = None

    spec["scenes"][scene_index] = scene

    return spec


def regenerate_single_scene_sync(
    job_id: str,
    spec: dict,
    scene_index: int,
    new_media_query: str,
    new_text: str,
    user_id: Optional[str] = None,
) -> dict:
    """Sync wrapper that also persists changes to DB."""
    from sqlalchemy.orm.attributes import flag_modified

    # Open DB session first so vector search can use it during regeneration
    db = SessionLocal()
    try:
        coro = _regenerate_scene_async(job_id, spec, scene_index, new_media_query, new_text, user_id, db=db)
        try:
            updated_spec = asyncio.run(coro)
        except RuntimeError as e:
            if "event loop" in str(e).lower():
                # Called from within an existing event loop
                updated_spec = asyncio.get_event_loop().run_until_complete(coro)
            else:
                raise

        # Persist to DB — the RQ worker receives a serialized copy, so we must
        # write back using the same session.
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if job:
            job.result_spec = updated_spec
            flag_modified(job, "result_spec")
            job.status = "completed"
            db.commit()
            logger.info(
                "Scene %d regenerated and persisted for job %s",
                scene_index,
                job_id,
                extra={"job_id": job_id},
            )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    return updated_spec
