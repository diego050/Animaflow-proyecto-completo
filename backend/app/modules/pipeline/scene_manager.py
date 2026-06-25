import os
import shutil
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import JobModel
from app.core.logging import get_logger
from app.core.storage_paths import get_storage_dir
from app.core.async_utils import run_async

logger = get_logger("pipeline")

AUDIO_STORAGE = get_storage_dir("audio")


from app.modules.tts.service import generate_tts_with_timestamps
from app.modules.llm.visual_spec import VisualSpecResult


async def _regenerate_scene_async(
    job_id: str,
    spec: dict,
    scene_index: int,
    new_media_query: str,
    new_text: str,
    user_id: Optional[str] = None,
    db: Optional[Session] = None,
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

    logger.info("Regenerando escena %d con code-gen...", scene_index, extra={"job_id": job_id})

    from app.modules.llm.animation_generator import generate_scene_animation, fallback_scene_code
    try:
        anim = generate_scene_animation(
            text=new_text,
            duration_seconds=scene.get("duration_seconds", 0.0),
            bg_hint=visual_spec.backgroundColor,
            art_direction=new_media_query,
            user_id=user_id,
            aspect_ratio=aspect_ratio,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Code-gen excepción (editor regen escena %d)", scene_index)
        anim = None

    scene["type"] = "custom_code"
    scene.pop("anima_composer", None)  # limpiar dato viejo del orquestador, si lo había
    scene["remotion_props"] = {
        **(scene.get("remotion_props") or {}),
        "backgroundColor": visual_spec.backgroundColor,
    }
    if anim and anim.get("valid") and anim.get("code"):
        scene["custom_code"] = anim["code"]
        scene["quality_status"] = "passed"
    else:
        scene["custom_code"] = fallback_scene_code(new_text, visual_spec.backgroundColor)
        scene["quality_status"] = "fallback"

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
        updated_spec = run_async(coro)

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
