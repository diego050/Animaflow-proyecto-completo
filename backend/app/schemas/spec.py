from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class SFX(BaseModel):
    keyword: str
    time_in_seconds: float
    file: str

class AEKeyframe(BaseModel):
    time: float
    value: Any
    easing: Optional[str] = None

class AEElement(BaseModel):
    type: str
    id: str
    position_keyframes: Optional[List[AEKeyframe]] = None
    scale_keyframes: Optional[List[AEKeyframe]] = None
    opacity_keyframes: Optional[List[AEKeyframe]] = None
    color_keyframes: Optional[List[AEKeyframe]] = None
    effects: Optional[List[Dict[str, Any]]] = None

class AEMetadata(BaseModel):
    animation_type: str
    elements: List[AEElement]
    text_animation: str
    connections: Optional[List[Dict[str, Any]]] = None

class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float

class Spec(BaseModel):
    start_time_seconds: float
    duration_seconds: float
    text: str
    type: str
    media_query: str = Field(..., max_length=1500)
    animation_spec: Optional[Dict[str, Any]] = None
    remotion_props: Optional[Dict[str, Any]] = None
    sfx: List[SFX] = Field(default_factory=list)
    audio_url: Optional[str] = None
    word_timestamps: Optional[List[WordTimestamp]] = None
    ae_metadata: Optional[Dict[str, Any]] = None
    ae_script_code: Optional[str] = None
    scene_video_url: Optional[str] = None
    quality_status: Optional[str] = None

class TimelineSpec(BaseModel):
    scenes: List[Spec]
    aspect_ratio: str = "9:16"
    quality_metrics: Optional[Dict[str, Any]] = None
