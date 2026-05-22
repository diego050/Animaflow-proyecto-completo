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

    # Crear archivo de lista para ffmpeg (Video)
    list_path = os.path.join(SCENES_STORAGE, job_id, "concat_list.txt")
    os.makedirs(os.path.dirname(list_path), exist_ok=True)

    with open(list_path, "w", encoding="utf-8") as f:
        for mp4_path in scene_mp4s:
            f.write(f"file '{mp4_path}'\n")

    # Crear archivo de lista para ffmpeg (Audio)
    audio_list_path = os.path.join(SCENES_STORAGE, job_id, "audio_list.txt")
    audio_dir = get_storage_dir("audio")
    
    # Check what extension the audio files have (.wav or .mp3)
    # We map from scene_mp4 index. e.g. /app/storage/scenes/123/0.mp4 -> /app/storage/audio/123_0.wav
    has_audio = False
    with open(audio_list_path, "w", encoding="utf-8") as f:
        for i, mp4_path in enumerate(scene_mp4s):
            # Obtener el nombre base sin extensión del mp4 (ej: "0")
            scene_idx = os.path.splitext(os.path.basename(mp4_path))[0]
            
            # Buscar el archivo de audio correspondiente
            audio_path = None
            for ext in [".wav", ".mp3"]:
                p = os.path.join(audio_dir, f"{job_id}_{scene_idx}{ext}")
                if os.path.exists(p):
                    audio_path = p
                    break
            
            if audio_path:
                f.write(f"file '{audio_path}'\n")
                has_audio = True

    logger.info(
        "Uniendo %d escenas para job %s... (Con audio: %s)",
        len(scene_mp4s),
        job_id,
        has_audio,
        extra={"job_id": job_id},
    )

    try:
        # Usar concat demuxer con -c copy (sin re-encode visual, ultra rápido)
        if has_audio:
            cmd = [
                "ffmpeg",
                "-f", "concat", "-safe", "0", "-i", list_path,          # Input 0: Video list
                "-f", "concat", "-safe", "0", "-i", audio_list_path,    # Input 1: Audio list
                "-c:v", "copy",                                         # Copy video stream
                "-c:a", "aac", "-b:a", "192k",                          # Encode audio to AAC
                "-y",                                                   # Overwrite
                final_path,
            ]
        else:
            cmd = [
                "ffmpeg",
                "-f", "concat", "-safe", "0", "-i", list_path,
                "-c", "copy",
                "-y",
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
