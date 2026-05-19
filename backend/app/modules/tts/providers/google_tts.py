import httpx
import os
import base64
from typing import Optional
from .base import TTSProvider
from app.core.logging import get_logger

logger = get_logger("tts.google")

class GoogleTTSProvider(TTSProvider):
    API_BASE = "https://texttospeech.googleapis.com/v1"

    @property
    def name(self) -> str:
        return "google_tts"

    @property
    def requires_api_key(self) -> bool:
        return True

    async def generate_audio(self, text: str, voice_id: str = "es-ES-Neural2-A", api_key: Optional[str] = None) -> str:
        if not api_key:
            raise ValueError("Google Cloud TTS requires an API key")

        url = f"{self.API_BASE}/text:synthesize?key={api_key}"
        payload = {
            "input": {"text": text},
            "voice": {
                "languageCode": "es-ES",
                "name": voice_id,
                "ssmlGender": "NEUTRAL"
            },
            "audioConfig": {
                "audioEncoding": "MP3"
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()

            audio_content = base64.b64decode(data["audioContent"])

            audio_dir = "storage/audio/google"
            os.makedirs(audio_dir, exist_ok=True)
            safe_hash = abs(hash(text)) % (10 ** 12)
            audio_path = f"{audio_dir}/{safe_hash}.mp3"

            with open(audio_path, "wb") as f:
                f.write(audio_content)

            logger.info("Google TTS audio generated: %s", audio_path)
            return audio_path
