import os
import httpx
from typing import List, Dict, Optional
from app.core.logging import get_logger

logger = get_logger("tts.whisper")

def extract_timestamps(audio_path: str, language: str = "es", groq_api_key: Optional[str] = None) -> List[Dict]:
    """Extract word-level timestamps from any audio file using Groq API.

    Returns:
        List of dicts: [{"word": "hello", "start": 0.0, "end": 0.5}, ...]
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    api_key = groq_api_key or os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.warning("GROQ_API_KEY not found. Fallback to estimation.")
        return _estimate_timestamps(audio_path)

    logger.info("Transcribing audio with Groq: %s", audio_path)

    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {api_key}",
    }
    data = {
        "model": "whisper-large-v3",
        "response_format": "verbose_json",
        "language": language,
        "timestamp_granularities[]": "word",
    }
    
    # httpx.post with files
    with open(audio_path, "rb") as f:
        files = {
            "file": (os.path.basename(audio_path), f, "audio/mpeg")
        }
        with httpx.Client() as client:
            response = client.post(url, headers=headers, data=data, files=files, timeout=120)
            
            try:
                response.raise_for_status()
            except Exception as e:
                logger.error("Groq API error: %s - %s", response.status_code, response.text)
                return _estimate_timestamps(audio_path)

            result = response.json()

    word_timestamps = []

    if "words" in result:
        for word_info in result["words"]:
            word_timestamps.append({
                "word": word_info["word"].strip(),
                "start": round(word_info["start"], 3),
                "end": round(word_info["end"], 3)
            })
    elif "segments" in result:
        # Fallback if words not at top level
        for segment in result["segments"]:
            if "words" in segment:
                for word_info in segment["words"]:
                    word_timestamps.append({
                        "word": word_info["word"].strip(),
                        "start": round(word_info["start"], 3),
                        "end": round(word_info["end"], 3)
                    })

    # If groq didn't return words, just do a rough estimation (fallback)
    if not word_timestamps:
        logger.warning("No words returned from Groq. Falling back to estimation.")
        return _estimate_timestamps(audio_path)

    logger.info("Extracted %d word timestamps", len(word_timestamps))
    return word_timestamps

def _estimate_timestamps(audio_path: str) -> List[Dict]:
    """Fallback: Estimate timestamps based on duration and a mock text. 
    Actually, since we don't have the text here, we just create empty timestamps
    and let the orchestrator handle it. But wait, we can't estimate words without text.
    So we just return an empty list. The pipeline will detect 0 timestamps and fallback 
    to a single block for the whole scene duration.
    """
    logger.warning("Using empty timestamps fallback (duration only).")
    return []

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
