# modules/tts/__init__.py
from .service import (
    AUDIO_STORAGE,
    generate_tts_with_timestamps,
    get_available_providers,
)
from .whisper_timestamps import extract_timestamps, get_audio_duration
