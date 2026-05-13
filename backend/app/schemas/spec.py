from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class SFX(BaseModel):
    keyword: str
    time_in_seconds: float
    file: str

class AEKeyframe(BaseModel):
    time: float
    value: Any  # [x, y] para posición, [scaleX, scaleY] para escala, número para opacidad
    easing: Optional[str] = None  # "ease_out_back", "linear", etc.

class AEElement(BaseModel):
    type: str  # rectangle, circle, flash, calendar, line, particle
    id: str
    position_keyframes: Optional[List[AEKeyframe]] = None
    scale_keyframes: Optional[List[AEKeyframe]] = None
    opacity_keyframes: Optional[List[AEKeyframe]] = None
    color_keyframes: Optional[List[AEKeyframe]] = None
    effects: Optional[List[Dict[str, Any]]] = None  # [{type: "glow", intensity: 50, color: "#38bdf8"}]

class AEMetadata(BaseModel):
    animation_type: str  # collision, bounce_in, morphing, particles, connection, reveal, construction, flash, fade_in, scale_emerge
    elements: List[AEElement]
    text_animation: str  # letter_by_letter, scale_emerge, fade_in, word_reveal
    connections: Optional[List[Dict[str, Any]]] = None  # [{from: "node_1", to: "node_2", appear_time: 1}]

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

class TimelineSpec(BaseModel):
    scenes: List[Spec]
