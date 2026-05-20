from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
import datetime

JobStatus = Literal[
    "pending",
    "segmenting",
    "visuals_generating",
    "processing_scenes",
    "queued_render",
    "rendering",
    "completed",
    "failed",
    "queued_scene_regen",
]

class JobCreate(BaseModel):
    script_text: str
    aspect_ratio: str = "9:16"
    tts_provider: str = Field(default="local_piper", description="TTS provider: local_piper, elevenlabs, google_tts, gemini_tts")
    tts_voice_id: str = Field(default="es_ES-carlfm-x_low", description="Voice ID for the selected TTS provider")
    tts_api_key: Optional[str] = Field(default=None, description="Optional API key for external TTS providers")

class SceneRegenerateRequest(BaseModel):
    media_query: str
    text: str

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    result_spec: Optional[Dict[str, Any]] = None
    video_url: Optional[str] = None

class JobListResponse(BaseModel):
    job_id: str
    status: JobStatus
    script_text: str
    video_url: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

class ScriptGenerateRequest(BaseModel):
    info: str
    template_id: str = Field(default="viral_shorts", description="Script template ID: viral_shorts, educational, storytelling, promotional")
    custom_prompt: Optional[str] = Field(default=None, description="Optional custom system prompt override")

class ScriptGenerateResponse(BaseModel):
    script_text: str
