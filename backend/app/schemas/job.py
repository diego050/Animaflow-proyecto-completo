from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
import datetime

JobStatus = Literal[
    "draft",
    "pending",
    "segmenting",
    "segmented",
    "visuals_generating",
    "processing_scenes",
    "rendering_scenes",
    "queued_render",
    "rendering",
    "completed",
    "failed",
    "failed_render",
    "queued_scene_regen",
]

class SceneData(BaseModel):
    text: str
    media_query: str = ""
    start_time_seconds: float = 0.0
    duration_seconds: float = 0.0

class SceneApprovalRequest(BaseModel):
    scenes: list[SceneData]

class SceneInput(BaseModel):
    text: str = ""
    media_query: Optional[str] = None
    duration_seconds: Optional[float] = None

class JobCreate(BaseModel):
    script_text: str
    aspect_ratio: str = "9:16"
    tts_provider: str = Field(default="local_piper", description="TTS provider: local_piper, elevenlabs, google_tts, gemini_tts")
    tts_voice_id: str = Field(default="es_ES-carlfm-x_low", description="Voice ID for the selected TTS provider")
    tts_api_key: Optional[str] = Field(default=None, description="Optional API key for external TTS providers")
    scenes: Optional[list[SceneInput]] = Field(default=None, description="Optional pre-defined scenes. If provided, skips automatic segmentation.")
    design_md: Optional[str] = Field(default=None, description="Optional design.md content for custom visual instructions")
    system_prompt: Optional[str] = Field(default=None, description="Optional custom system prompt for LLM visual generation")
    animation_only: bool = Field(default=False, description="If true, skips TTS and Audio alignment")

class JobDraftRequest(BaseModel):
    draft_data: Dict[str, Any]

class SceneRegenerateRequest(BaseModel):
    media_query: str
    text: str

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    result_spec: Optional[Dict[str, Any]] = None
    video_url: Optional[str] = None
    error_message: Optional[str] = None

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
    api_key: Optional[str] = Field(default=None, description="Optional user-provided API key for LLM. Falls back to global config if not provided.")
    provider: Optional[str] = Field(default=None, description="Optional LLM provider override (gemini, openai, anthropic). Falls back to user default or global config.")
    target_duration_seconds: int = Field(default=30, ge=10, le=120, description="Target duration in seconds (10-120)")

class ScriptGenerateResponse(BaseModel):
    script_text: str
