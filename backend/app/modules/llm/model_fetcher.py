"""
Dynamic model fetching for LLM providers.

Fetches available models from provider APIs or returns static lists
for providers that don't expose a models endpoint.
"""
from typing import Optional
import requests
from app.core.logging import get_logger

logger = get_logger("llm")

# Static model lists for providers without a public models endpoint
GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-pro-exp-02-05",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-3.1-flash",
    "gemini-3.1-flash-lite-preview",
]

ANTHROPIC_MODELS = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
]


def fetch_openai_models(api_key: str) -> list[str]:
    """Fetch available models from OpenAI API, filtering for GPT models."""
    try:
        response = requests.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()

        allowed_prefixes = ("gpt-", "o1", "o3")
        models = []
        for item in data.get("data", []):
            model_id = item.get("id", "")
            if any(model_id.startswith(prefix) for prefix in allowed_prefixes):
                models.append(model_id)

        models.sort()
        logger.info("Fetched %d OpenAI models", len(models))
        return models
    except Exception as e:
        logger.error("Failed to fetch OpenAI models: %s", e)
        # Fallback to known models
        return [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-4",
            "gpt-3.5-turbo",
            "o1-preview",
            "o1-mini",
            "o3-mini",
        ]


def fetch_gemini_models() -> list[str]:
    """Return available Gemini models (static curated list)."""
    return sorted(GEMINI_MODELS)


def fetch_anthropic_models(api_key: str | None = None) -> list[str]:
    """Return available Claude models (static curated list).

    Anthropic does not expose a public models endpoint, so we maintain
    a known-good list. The api_key parameter is accepted for interface
    consistency but is not required.
    """
    return sorted(ANTHROPIC_MODELS)


def fetch_available_models(provider: str, api_key: Optional[str] = None) -> list[str]:
    """
    Return a list of available models for a given provider.

    Args:
        provider: One of 'gemini', 'openai', 'anthropic'.
        api_key: Required for OpenAI dynamic fetching. Optional for static providers.

    Returns:
        Sorted list of model IDs.
    """
    provider = provider.lower().strip()

    if provider == "openai":
        if not api_key:
            logger.warning("No API key provided for OpenAI model fetch, using static fallback")
            return sorted([
                "gpt-4o",
                "gpt-4o-mini",
                "gpt-4-turbo",
                "gpt-4",
                "gpt-3.5-turbo",
                "o1-preview",
                "o1-mini",
                "o3-mini",
            ])
        return fetch_openai_models(api_key)

    if provider == "gemini":
        return fetch_gemini_models()

    if provider == "anthropic":
        return fetch_anthropic_models(api_key)

    logger.warning("Unknown provider '%s', returning empty list", provider)
    return []
