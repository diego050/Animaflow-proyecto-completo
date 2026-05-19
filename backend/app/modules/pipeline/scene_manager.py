import asyncio
import os
from typing import Optional
from app.db.session import SessionLocal
from app.db.models import JobModel
from app.core.logging import get_logger

logger = get_logger("pipeline")

from ..tts.service import generate_tts_with_voicebox, AUDIO_STORAGE
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
        duration, audio_url = await generate_tts_with_voicebox(
            new_text, f"Escena-{scene_index+1}"
        )
        logger.info("TTS escena %d: duration=%s, audio_url=%s", scene_index + 1, duration, audio_url, extra={"job_id": job_id})
        if duration is not None:
            scene["duration_seconds"] = round(duration, 2)
            # Download and cache audio
            if audio_url:
                os.makedirs(AUDIO_STORAGE, exist_ok=True)
                local_path = os.path.join(AUDIO_STORAGE, f"{job_id}_{scene_index}.mp3")
                try:
                    import httpx

                    async with httpx.AsyncClient() as client:
                        response = await client.get(audio_url, timeout=10)
                        if response.status_code == 200:
                            with open(local_path, "wb") as f:
                                f.write(response.content)
                            audio_url = f"http://localhost:8000/api/audio/{job_id}_{scene_index}.mp3"
                            logger.info("Audio cached locally: %s", local_path, extra={"job_id": job_id})
                        else:
                            logger.warning(
                                "Failed to download audio: %d",
                                response.status_code,
                                extra={"job_id": job_id},
                            )
                            audio_url = None
                except (httpx.HTTPError, httpx.TimeoutException, OSError) as e:
                    logger.error("Error downloading audio: %s", e, extra={"job_id": job_id})
                    audio_url = None
            scene["audio_url"] = audio_url

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

    write_index_ts(job_id, spec["scenes"])

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
