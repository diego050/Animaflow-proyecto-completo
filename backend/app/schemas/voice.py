"""Pydantic schemas for Voice management endpoints."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class VoiceCreate(BaseModel):
    """Schema for creating a new voice."""

    name: str = Field(..., min_length=1, max_length=255)
    gender: str = Field(default="neutral", pattern="^(male|female|neutral)$")
    language: str = Field(default="es", max_length=10)
    is_default: bool = Field(default=False)


class VoiceUpdate(BaseModel):
    """Schema for updating an existing voice."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    gender: Optional[str] = Field(None, pattern="^(male|female|neutral)$")
    language: Optional[str] = Field(None, max_length=10)
    is_default: Optional[bool] = None


class VoiceResponse(BaseModel):
    """Schema returned when reading a voice."""

    id: str
    user_id: str
    name: str
    gender: str
    language: str
    is_default: bool
    is_active: bool
    audio_sample_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VoicePreviewRequest(BaseModel):
    """Schema for generating a voice preview."""

    text: str = Field(default="Hola, esta es una prueba de mi voz.", max_length=500)
