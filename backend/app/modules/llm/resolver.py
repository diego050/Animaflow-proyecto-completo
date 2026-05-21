"""
LLM provider resolution utilities.

Resolves which API key and model to use for LLM calls, prioritizing
user-specific settings and falling back to global configuration ONLY for
unauthenticated or admin contexts. Authenticated regular users MUST provide
their own API key.
"""
from typing import Optional
from dataclasses import dataclass


class MissingApiKeyError(Exception):
    """Raised when an authenticated user has no configured API key."""

    def __init__(self, message: str = "API key not configured. Please add your API key in Settings > API Keys."):
        self.message = message
        super().__init__(self.message)


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
    3. Global settings fallback (GEMINI_API_KEY, GEMINI_MODEL) — ONLY when
       user_id is None (unauthenticated) or user does not exist.

    Args:
        user_id: The user's ID. If None, returns global fallback.
        provider_override: Force a specific provider instead of user's default.

    Returns:
        LLMCredentials with resolved api_key, model, and provider.

    Raises:
        MissingApiKeyError: If the user is authenticated but has no active API key.
    """
    from app.core.config import settings
    from app.db.session import get_db_context
    from app.db.models import User, ApiKey

    # Default fallback to global Gemini config (unauthenticated only)
    fallback_api_key = getattr(settings, "GEMINI_API_KEY", None)
    fallback_model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")
    fallback_provider = "gemini"

    if not user_id:
        return LLMCredentials(
            api_key=fallback_api_key or "",
            model=fallback_model,
            provider=fallback_provider,
        )

    with get_db_context() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Unknown user — allow global fallback to avoid breaking edge cases
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

        if not key_record:
            raise MissingApiKeyError()

        api_key = key_record.api_key
        model = user.default_model if user.default_model else fallback_model

        return LLMCredentials(
            api_key=api_key,
            model=model,
            provider=provider,
        )
