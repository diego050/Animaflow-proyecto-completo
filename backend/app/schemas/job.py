from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, Literal
import datetime
import re

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
    "queued_enrichment",
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
    script_text: str = Field(max_length=11000)
    aspect_ratio: str = "9:16"
    tts_provider: str = Field(default="local_piper", description="TTS provider: local_piper, elevenlabs, google_tts, openai_tts")
    tts_voice_id: str = Field(default="es_ES-carlfm-x_low", description="Voice ID for the selected TTS provider")
    tts_api_key: Optional[str] = Field(default=None, description="Optional API key for external TTS providers")
    scenes: Optional[list[SceneInput]] = Field(default=None, description="Optional pre-defined scenes. If provided, skips automatic segmentation.")
    design_md: Optional[str] = Field(default=None, description="Optional design.md content for custom visual instructions")
    design_template_id: Optional[str] = Field(default=None, description="Optional ID of a saved design template. Takes precedence over design_md if both provided.")
    system_prompt: Optional[str] = Field(default=None, description="Optional custom system prompt for LLM visual generation")
    animation_only: bool = Field(default=False, description="If true, skips TTS and Audio alignment")
    model: Optional[str] = Field(default=None, description="Optional LLM model override")

    @field_validator("aspect_ratio")
    @classmethod
    def validate_aspect_ratio(cls, v: str) -> str:
        """Accept ratio format (e.g., '9:16') or pixel format (e.g., '1900x2000')."""
        ratio_pattern = r"^\d+:\d+$"      # e.g., "9:16", "16:9"
        pixel_pattern = r"^\d+x\d+$"       # e.g., "1900x2000", "1080x1920"
        if not re.match(ratio_pattern, v) and not re.match(pixel_pattern, v):
            raise ValueError(
                f"Invalid aspect ratio '{v}'. "
                "Use ratio format (e.g., '9:16', '16:9', '1:1') "
                "or pixel format (e.g., '1900x2000', '1080x1920')."
            )
        return v

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
    aspect_ratio: Optional[str] = None
    parent_job_id: Optional[str] = None

class ScriptGenerateRequest(BaseModel):
    info: str
    template_id: str = Field(default="viral_shorts", description="Script template ID: viral_shorts, educational, storytelling, promotional")
    custom_prompt: Optional[str] = Field(default=None, description="Optional custom system prompt override")
    api_key: Optional[str] = Field(default=None, description="Optional user-provided API key for LLM. Falls back to global config if not provided.")
    provider: Optional[str] = Field(default=None, description="Optional LLM provider override (gemini, openai, anthropic). Falls back to user default or global config.")
    model: Optional[str] = Field(default=None, description="Optional LLM model override (e.g. gemini-3.5-flash). Falls back to the user's default model.")
    target_duration_seconds: int = Field(default=30, ge=10, le=120, description="Target duration in seconds (10-120)")

class ScriptGenerateResponse(BaseModel):
    script_text: str


class SceneEditRequest(BaseModel):
    """Request body for editing a scene's spec."""
    mode: Literal["manual", "conversational"]
    # For manual mode
    changes: list[dict[str, Any]] | None = None  # [{"field_path": "...", "value": ...}]
    # For conversational mode
    prompt: str | None = None


class JobReformatRequest(BaseModel):
    """Request body for reformatting a job to a new aspect ratio."""
    aspect_ratio: str = Field(..., description="Aspect ratio in 'width:height' format (e.g., '16:9', '2.39:1')")
    scene_selection: Literal["all", "selected", "current"] = Field(default="all", description="Which scenes to reformat")
    scene_indices: list[int] = Field(default=[], description="Required when scene_selection='selected'")
    current_scene_index: Optional[int] = Field(default=None, description="Required when scene_selection='current'")
