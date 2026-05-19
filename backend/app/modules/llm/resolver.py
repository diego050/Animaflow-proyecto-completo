"""
LLM provider resolution utilities.

Resolves which API key and model to use for LLM calls, prioritizing
user-specific settings and falling back to global configuration.
"""
from typing import Optional
from dataclasses import dataclass


@dataclass
class LLMCredentials:
    """Resolved LLM credentials for a pipeline call."""
    api_key: str
    model: str
    provider: str  # gemini, openai, anthropic, grok


def resolve_llm_credentials(
    user_id: Optional[str] = None,
    provider_override: Optional[str] = None,
) -> LLMCredentials:
    """
    Resolve the API key and model to use for an LLM call.

    Priority order:
    1. User's active API key for their default_provider (or provider_override)
    2. User's default_model (if using their key)
    3. Global settings fallback (GEMINI_API_KEY, GEMINI_MODEL)

    Args:
        user_id: The user's ID. If None, returns global fallback.
        provider_override: Force a specific provider instead of user's default.

    Returns:
        LLMCredentials with resolved api_key, model, and provider.
    """
    from app.core.config import settings
    from app.db.session import SessionLocal
    from app.db.models import User, ApiKey

    # Default fallback to global Gemini config
    fallback_api_key = getattr(settings, "GEMINI_API_KEY", None)
    fallback_model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")
    fallback_provider = "gemini"

    if not user_id:
        return LLMCredentials(
            api_key=fallback_api_key or "",
            model=fallback_model,
            provider=fallback_provider,
        )

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return LLMCredentials(
                api_key=fallback_api_key or "",
                model=fallback_model,
                provider=fallback_provider,
            )

        # Determine which provider to use
        provider = provider_override or user.default_provider or fallback_provider

        # Look up user's active API key for this provider
        key_record = (
            db.query(ApiKey)
            .filter(
                ApiKey.user_id == user_id,
                ApiKey.provider == provider,
                ApiKey.is_active == True,
            )
            .first()
        )

        api_key = key_record.api_key if key_record else (fallback_api_key or "")
        model = user.default_model if (key_record and user.default_model) else fallback_model

        return LLMCredentials(
            api_key=api_key,
            model=model,
            provider=provider,
        )
    finally:
        db.close()
