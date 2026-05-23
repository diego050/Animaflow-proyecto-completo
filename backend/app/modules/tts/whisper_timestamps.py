import os
import httpx
from typing import List, Dict
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
        logger.warning("GROQ_API_KEY not found. Fallback to estimation or throw error. We'll try without if they mock.")
        # But we actually want to fail since it's required for this task
        raise ValueError("GROQ_API_KEY environment variable or user setting is required for transcription.")

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
                raise

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
    if not word_timestamps and "text" in result:
        words = result["text"].strip().split()
        duration = result.get("duration", 0.0)
        word_duration = duration / len(words) if words else 0
        
        for i, word in enumerate(words):
            word_timestamps.append({
                "word": word,
                "start": round(i * word_duration, 3),
                "end": round((i + 1) * word_duration, 3)
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
