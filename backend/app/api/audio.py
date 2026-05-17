"""
Router para servir archivos de audio TTS cacheados localmente.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os

router = APIRouter(prefix="/api", tags=["audio"])

AUDIO_STORAGE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../storage/audio"))


@router.get("/audio/{job_id}_{scene_id}.mp3")
async def get_audio(job_id: str, scene_id: str):
    """
    Serves cached audio files for Remotion preview and rendering.
    Files are downloaded from Voicebox during pipeline execution.
    """
    local_path = os.path.join(AUDIO_STORAGE, f"{job_id}_{scene_id}.mp3")
    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(local_path, media_type="audio/mpeg")
