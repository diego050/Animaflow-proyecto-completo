from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class SFX(BaseModel):
    keyword: str
    time_in_seconds: float
    file: str

class Spec(BaseModel):
    start_time_seconds: float
    duration_seconds: float
    text: str
    type: str
    media_query: str = Field(..., max_length=500)
    remotion_props: Optional[Dict[str, Any]] = None
    sfx: List[SFX]
    audio_url: Optional[str] = None

class TimelineSpec(BaseModel):
    scenes: List[Spec]
