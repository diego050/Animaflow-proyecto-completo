from pydantic import BaseModel, Field
from typing import Optional
import datetime

class DesignTemplateBase(BaseModel):
    name: str = Field(..., max_length=255)
    content: str

class DesignTemplateCreate(DesignTemplateBase):
    pass

class DesignTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = None

class DesignTemplateResponse(DesignTemplateBase):
    id: str
    user_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True
