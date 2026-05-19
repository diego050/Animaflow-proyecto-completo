import httpx
import os
from typing import Optional
from .base import TTSProvider
from app.core.logging import get_logger

logger = get_logger("tts.elevenlabs")

class ElevenLabsProvider(TTSProvider):
    API_BASE = "https://api.elevenlabs.io/v1"

    @property
    def name(self) -> str:
        return "elevenlabs"

    @property
    def requires_api_key(self) -> bool:
        return True

    async def generate_audio(self, text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM", api_key: Optional[str] = None) -> str:
        if not api_key:
            raise ValueError("ElevenLabs requires an API key")

        url = f"{self.API_BASE}/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=60)
            response.raise_for_status()

            # Save audio file
            audio_dir = "storage/audio/elevenlabs"
            os.makedirs(audio_dir, exist_ok=True)
            safe_hash = abs(hash(text)) % (10 ** 12)
            audio_path = f"{audio_dir}/{safe_hash}.mp3"

            with open(audio_path, "wb") as f:
                f.write(response.content)

            logger.info("ElevenLabs audio generated: %s", audio_path)
            return audio_path
