"""Standardized error codes for AnimaFlow API responses."""

# TTS Error Codes
TTS_API_KEY_MISSING = "TTS_API_KEY_MISSING"
TTS_API_KEY_INVALID = "TTS_API_KEY_INVALID"
TTS_PROVIDER_ERROR = "TTS_PROVIDER_ERROR"
TTS_RATE_LIMIT = "TTS_RATE_LIMIT"
TTS_UNKNOWN_ERROR = "TTS_UNKNOWN_ERROR"


# Standard error response structure
from typing import Any, Optional
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standard error response for all API endpoints."""
    error: str
    code: str
    message: str
    details: Optional[dict[str, Any]] = None


def create_error_response(code: str, message: str, details: Optional[dict[str, Any]] = None) -> dict:
    """Create a standardized error response dict."""
    return ErrorResponse(code=code, message=message, details=details).model_dump()
