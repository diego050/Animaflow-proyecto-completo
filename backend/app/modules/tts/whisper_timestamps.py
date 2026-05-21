import whisper
import os
from typing import List, Dict
from app.core.logging import get_logger

logger = get_logger("tts.whisper")

# Load model once at module level (lazy load)
_model = None

def _get_model():
    global _model
    if _model is None:
        logger.info("Loading Whisper small model...")
        _model = whisper.load_model("small")
        logger.info("Whisper model loaded")
    return _model

def extract_timestamps(audio_path: str, language: str = "es") -> List[Dict]:
    """Extract word-level timestamps from any audio file using Whisper.

    Returns:
        List of dicts: [{"word": "hello", "start": 0.0, "end": 0.5}, ...]
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    model = _get_model()

    logger.info("Transcribing audio with Whisper: %s", audio_path)

    # Transcribe with word-level timestamps
    result = model.transcribe(
        audio_path,
        language=language,
        word_timestamps=True,
        verbose=False
    )

    # Extract word timestamps
    word_timestamps = []

    for segment in result["segments"]:
        if "words" in segment:
            for word_info in segment["words"]:
                word_timestamps.append({
                    "word": word_info["word"].strip(),
                    "start": round(word_info["start"], 3),
                    "end": round(word_info["end"], 3)
                })
        else:
            # Fallback: use segment-level timestamps
            # Split segment text into words and distribute timestamps
            words = segment["text"].strip().split()
            duration = segment["end"] - segment["start"]
            word_duration = duration / len(words) if words else 0

            for i, word in enumerate(words):
                word_timestamps.append({
                    "word": word,
                    "start": round(segment["start"] + (i * word_duration), 3),
                    "end": round(segment["start"] + ((i + 1) * word_duration), 3)
                })

    logger.info("Extracted %d word timestamps", len(word_timestamps))
    return word_timestamps

def get_audio_duration(audio_path: str) -> float:
    """Get total duration of audio file."""
    # Try ffmpeg first
    try:
        import ffmpeg
        probe = ffmpeg.probe(audio_path)
        duration = float(probe['format']['duration'])
        return duration
    except Exception:
        pass

    # Fallback: use wave module for WAV files (Piper generates WAV)
    if audio_path.endswith('.wav'):
        try:
            import wave
            with wave.open(audio_path, 'rb') as wf:
                frames = wf.getnframes()
                rate = wf.getframerate()
                return frames / float(rate)
        except Exception:
            pass

    # Last resort: rough estimation (avoid Whisper - too heavy)
    logger.warning("Could not get exact duration for %s, using estimation", audio_path)
    return 0.0
