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

class Spec(BaseModel):
    start_time_seconds: float
    duration_seconds: float
    text: str
    type: str
    media_query: str = Field(..., max_length=1500)
    remotion_props: Optional[Dict[str, Any]] = None
    sfx: List[SFX]
    audio_url: Optional[str] = None
    ae_metadata: Optional[AEMetadata] = None
    ae_script_code: Optional[str] = None

class TimelineSpec(BaseModel):
    scenes: List[Spec]
    aspect_ratio: str = "9:16"
