from typing import Optional, Dict, List
from .providers.elevenlabs import ElevenLabsProvider
from .providers.google_tts import GoogleTTSProvider
from .providers.openai_tts import OpenAITTSProvider
from .providers.gemini_tts import GeminiTTSProvider
from .providers.local_piper import PiperProvider
from .whisper_timestamps import extract_timestamps, get_audio_duration
from app.core.logging import get_logger
from app.core.storage_paths import get_storage_dir
from app.core.error_codes import (
    TTS_API_KEY_MISSING,
    TTS_API_KEY_INVALID,
    TTS_PROVIDER_ERROR,
    TTS_RATE_LIMIT,
)

logger = get_logger("tts.service")

AUDIO_STORAGE = get_storage_dir("audio")


def _translate_http_error(e: Exception, provider_name: str) -> ValueError:
    """Translate httpx HTTP errors into standardized TTS error codes."""
    import httpx
    if isinstance(e, httpx.HTTPStatusError):
        status = e.response.status_code
        if status == 401:
            return ValueError(
                f"[{TTS_API_KEY_INVALID}] Provider '{provider_name}' rejected the API key "
                f"(HTTP {status}). Check your key or use the local model."
            )
        elif status == 429:
            return ValueError(
                f"[{TTS_RATE_LIMIT}] Provider '{provider_name}' rate-limited the request "
                f"(HTTP {status}). Try again later or use the local model."
            )
        else:
            return ValueError(
                f"[{TTS_PROVIDER_ERROR}] Provider '{provider_name}' returned HTTP {status}: {e}"
            )
    return ValueError(f"[{TTS_UNKNOWN_ERROR}] Provider '{provider_name}' error: {e}")

PROVIDERS = {
    "elevenlabs": ElevenLabsProvider(),
    "google_tts": GoogleTTSProvider(),
    "openai_tts": OpenAITTSProvider(),
    "gemini_tts": GeminiTTSProvider(),
    "local_piper": PiperProvider(),
}

async def generate_tts_audio_only(
    text: str,
    provider_name: str = "local_piper",
    voice_id: str = "es_ES-carlfm-x_low",
    api_key: Optional[str] = None,
) -> Dict:
    """Generate TTS audio without timestamps (lightweight for previews).

    Avoids loading Whisper, reducing RAM usage by ~1GB.
    Duration is obtained via ffmpeg probe if available.

    Returns:
        {
            "audio_path": str,
            "duration_seconds": float
        }
    """
    if provider_name not in PROVIDERS:
        logger.warning("Unknown TTS provider: %s. Falling back to openai_tts.", provider_name)
        provider_name = "openai_tts"

    provider = PROVIDERS[provider_name]

    if provider.requires_api_key and not api_key:
        raise ValueError(f"[{TTS_API_KEY_MISSING}] Provider '{provider_name}' requires an API key. Configure one in your settings or use the local model.")

    logger.info("Generating lightweight TTS preview with provider: %s", provider_name)

    # 1. Generate audio only (no Whisper)
    try:
        audio_path = await provider.generate_audio(text, voice_id, api_key)
    except Exception as e:
        raise _translate_http_error(e, provider_name) from e

    # 2. Get duration via ffmpeg (no Whisper load)
    duration = get_audio_duration(audio_path)

    logger.info("TTS preview complete: %s (%.2fs)", audio_path, duration)

    return {
        "audio_path": audio_path,
        "duration_seconds": duration,
    }


async def generate_tts_with_timestamps(
    text: str,
    provider_name: str = "local_piper",
    voice_id: str = "es_ES-carlfm-x_low",
    api_key: Optional[str] = None,
    language: str = "es",
    groq_api_key: Optional[str] = None
) -> Dict:
    """Generate TTS audio and extract word-level timestamps.

    Returns:
        {
            "audio_path": str,
            "word_timestamps": [{"word": str, "start": float, "end": float}],
            "duration_seconds": float
        }
    """
    if provider_name not in PROVIDERS:
        logger.warning("Unknown TTS provider: %s. Falling back to openai_tts.", provider_name)
        provider_name = "openai_tts"

    provider = PROVIDERS[provider_name]

    if provider.requires_api_key and not api_key:
        raise ValueError(f"[{TTS_API_KEY_MISSING}] Provider '{provider_name}' requires an API key. Configure one in your settings or use the local model.")

    logger.info("Generating TTS with provider: %s", provider_name)

    # 1. Generate audio
    try:
        audio_path = await provider.generate_audio(text, voice_id, api_key)
    except Exception as e:
        raise _translate_http_error(e, provider_name) from e

    # 2. Extract timestamps with Whisper
    logger.info("Extracting timestamps with Groq API...")
    try:
        word_timestamps = extract_timestamps(audio_path, language=language, groq_api_key=groq_api_key)
    except Exception as e:
        logger.error("Failed to extract timestamps: %s. Falling back to estimation.", e)
        word_timestamps = []

    duration = get_audio_duration(audio_path)

    logger.info("TTS complete: %s (%.2fs, %d words)", audio_path, duration, len(word_timestamps))

    return {
        "audio_path": audio_path,
        "word_timestamps": word_timestamps,
        "duration_seconds": duration
    }

def get_available_providers() -> List[Dict]:
    """Get list of available TTS providers for user selection."""
    return [
        {
            "id": name,
            "name": provider.name,
            "requires_api_key": provider.requires_api_key,
        }
        for name, provider in PROVIDERS.items()
    ]
