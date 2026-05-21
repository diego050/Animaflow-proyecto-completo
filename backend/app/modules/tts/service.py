from typing import Optional, Dict, List
from .providers.elevenlabs import ElevenLabsProvider
from .providers.google_tts import GoogleTTSProvider
from .providers.local_piper import PiperProvider
from .providers.gemini_tts import GeminiTTSProvider
from .whisper_timestamps import extract_timestamps, get_audio_duration
from app.core.logging import get_logger
from app.core.storage_paths import get_storage_dir

logger = get_logger("tts.service")

AUDIO_STORAGE = get_storage_dir("audio")

PROVIDERS = {
    "elevenlabs": ElevenLabsProvider(),
    "google_tts": GoogleTTSProvider(),
    "local_piper": PiperProvider(),
    "gemini_tts": GeminiTTSProvider(),
}

async def generate_tts_with_timestamps(
    text: str,
    provider_name: str = "local_piper",
    voice_id: str = "es_ES-carlfm-x_low",
    api_key: Optional[str] = None,
    language: str = "es"
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
        logger.warning("Unknown TTS provider: %s. Falling back to local_piper.", provider_name)
        provider_name = "local_piper"

    provider = PROVIDERS[provider_name]

    if provider.requires_api_key and not api_key:
        raise ValueError(f"Provider '{provider_name}' requires an API key")

    logger.info("Generating TTS with provider: %s", provider_name)

    # 1. Generate audio
    audio_path = await provider.generate_audio(text, voice_id, api_key)

    # 2. Extract timestamps with Whisper
    logger.info("Extracting timestamps with Whisper...")
    word_timestamps = extract_timestamps(audio_path, language=language)

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
