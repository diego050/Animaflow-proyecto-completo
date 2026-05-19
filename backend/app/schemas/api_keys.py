from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ApiKeyCreate(BaseModel):
    """Schema for creating a new API key."""
    provider: str = Field(..., pattern="^(gemini|openai|anthropic|grok)$")
    api_key: str = Field(..., min_length=10)


class ApiKeyResponse(BaseModel):
    """Schema for API key responses. NEVER includes the actual key value."""
    id: str
    provider: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserSettingsUpdate(BaseModel):
    """Schema for updating user LLM settings."""
    default_provider: Optional[str] = None
    default_model: Optional[str] = None
    available_models: Optional[list[str]] = None
