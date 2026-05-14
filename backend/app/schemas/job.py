from pydantic import BaseModel
from typing import Optional, Dict, Any
import datetime

class JobCreate(BaseModel):
    script_text: str
    aspect_ratio: str = "9:16"

class SceneRegenerateRequest(BaseModel):
    media_query: str
    text: str

class JobResponse(BaseModel):
    job_id: str
    status: str
    result_spec: Optional[Dict[str, Any]] = None
    video_url: Optional[str] = None

class JobListResponse(BaseModel):
    job_id: str
    status: str
    script_text: str
    video_url: Optional[str] = None
    created_at: Optional[datetime.datetime] = None

class ScriptGenerateRequest(BaseModel):
    info: str

class ScriptGenerateResponse(BaseModel):
    script_text: str
