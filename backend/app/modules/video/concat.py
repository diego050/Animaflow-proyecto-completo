import os
import subprocess
from typing import List
from app.core.logging import get_logger
from app.core.storage_paths import get_storage_dir

logger = get_logger("video.concat")

SCENES_STORAGE = get_storage_dir("scenes")
VIDEOS_STORAGE = get_storage_dir("videos")


def concat_scenes(job_id: str, scene_mp4s: List[str]) -> str:
    """
    Une múltiples MP4s de escenas en un video final usando ffmpeg concat demuxer.

    Args:
        job_id: ID del job
        scene_mp4s: Lista de paths a los MP4s de cada escena (en orden)

    Returns:
        Path al video final
    """
    os.makedirs(VIDEOS_STORAGE, exist_ok=True)

    final_path = os.path.join(VIDEOS_STORAGE, f"{job_id}.mp4")

    # Si ya existe, borrarlo
    if os.path.exists(final_path):
        os.remove(final_path)

    # Crear archivo de lista para ffmpeg
    list_path = os.path.join(SCENES_STORAGE, job_id, "concat_list.txt")
    os.makedirs(os.path.dirname(list_path), exist_ok=True)

    with open(list_path, "w", encoding="utf-8") as f:
        for mp4_path in scene_mp4s:
            # ffmpeg concat requiere paths absolutos o relativos con file '
            f.write(f"file '{mp4_path}'\n")

    logger.info(
        "Uniendo %d escenas para job %s...",
        len(scene_mp4s),
        job_id,
        extra={"job_id": job_id},
    )

    try:
        # Usar concat demuxer con -c copy (sin re-encode, ultra rápido)
        cmd = [
            "ffmpeg",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            list_path,
            "-c",
            "copy",  # Sin re-encode
            "-y",  # Sobrescribir si existe
            final_path,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,  # 30 segundos max
        )

        if result.returncode != 0:
            logger.error(
                "Error uniendo escenas: %s",
                result.stderr,
                extra={"job_id": job_id},
            )
            raise RuntimeError(f"FFmpeg concat failed: {result.stderr}")

        logger.info(
            "Video final unido: %s (%.1f MB)",
            final_path,
            os.path.getsize(final_path) / (1024 * 1024),
            extra={"job_id": job_id},
        )
        return final_path

    except subprocess.TimeoutExpired:
        logger.error("Timeout uniendo escenas", extra={"job_id": job_id})
        raise TimeoutError("Concat timeout after 30s")
    except Exception as e:
        logger.exception("Error uniendo escenas: %s", e, extra={"job_id": job_id})
        raise
