"""
Audio file finder service.

Provides utilities for locating TTS audio files across storage directories
and provider subdirectories.
"""
import os

from app.core.storage_paths import get_storage_dir

AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a"]
PROVIDER_SUBDIRS = ["piper", "elevenlabs", "google", "gemini"]


def find_audio_file(base_name: str) -> str | None:
    """Find an audio file by base name (without extension).

    Search order:
    1. Root audio directory with exact filename
    2. Known provider subdirectories (piper, elevenlabs, google, gemini)
    3. Full directory walk (catches any provider)
    4. Try other common extensions in root, subdirs, and walk

    Args:
        base_name: Filename without extension (e.g., "job_123_0" or "preview_abc123")

    Returns:
        Absolute path to the audio file, or None if not found.
    """
    audio_storage = get_storage_dir("audio")

    # Try each extension in root first
    for ext in AUDIO_EXTENSIONS:
        candidate = os.path.abspath(os.path.join(audio_storage, base_name + ext))
        if candidate.startswith(audio_storage + os.sep) and os.path.exists(candidate):
            return candidate

    # Try provider subdirectories
    for subdir in PROVIDER_SUBDIRS:
        for ext in AUDIO_EXTENSIONS:
            candidate = os.path.abspath(os.path.join(audio_storage, subdir, base_name + ext))
            if candidate.startswith(audio_storage + os.sep) and os.path.exists(candidate):
                return candidate

    # Fallback: full directory walk
    for root, dirs, files in os.walk(audio_storage):
        for ext in AUDIO_EXTENSIONS:
            if base_name + ext in files:
                candidate = os.path.abspath(os.path.join(root, base_name + ext))
                if candidate.startswith(audio_storage + os.sep):
                    return candidate

    return None
