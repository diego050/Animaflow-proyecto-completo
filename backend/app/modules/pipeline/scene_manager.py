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

from ..tts.service import generate_tts_with_timestamps
from ..llm.visual_spec import VisualSpecResult
from ..remotion.component_generator import generate_remotion_component
from ..remotion.index_writer import write_index_ts


async def _regenerate_scene_async(
    job_id: str,
    spec: dict,
    scene_index: int,
    new_media_query: str,
    new_text: str,
    user_id: Optional[str] = None,
) -> dict:
    from app.core.resolutions import get_resolution

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

    logger.info("Regenerando TSX para escena %d...", scene_index, extra={"job_id": job_id})
    component_type_name = await generate_remotion_component(
        scene_index, visual_spec, new_text, scene["duration_seconds"], job_id, aspect_ratio, user_id
    )

    scene["type"] = component_type_name

    # AE script generation deferred to export step
    scene["ae_script_code"] = None

    spec["scenes"][scene_index] = scene

    write_index_ts(job_id, spec["scenes"], user_id)

    return spec


def regenerate_single_scene_sync(
    job_id: str,
    spec: dict,
    scene_index: int,
    new_media_query: str,
    new_text: str,
    user_id: Optional[str] = None,
) -> dict:
    return asyncio.run(
        _regenerate_scene_async(job_id, spec, scene_index, new_media_query, new_text, user_id)
    )
