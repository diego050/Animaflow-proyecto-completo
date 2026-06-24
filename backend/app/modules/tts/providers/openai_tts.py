import httpx
import os
from typing import Optional
from .base import TTSProvider
from app.core.logging import get_logger

logger = get_logger("tts.openai")

class OpenAITTSProvider(TTSProvider):
    API_BASE = "https://api.openai.com/v1"

    @property
    def name(self) -> str:
        return "openai_tts"

    @property
    def requires_api_key(self) -> bool:
        return True

    async def generate_audio(self, text: str, voice_id: str = "alloy", api_key: Optional[str] = None) -> str:
        if not api_key:
            raise ValueError("OpenAI TTS requires an API key")

        url = f"{self.API_BASE}/audio/speech"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "tts-1",
            "input": text,
            "voice": voice_id
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=60)
            response.raise_for_status()

            # Save audio file
            audio_dir = "storage/audio/openai"
            os.makedirs(audio_dir, exist_ok=True)
            safe_hash = abs(hash(text)) % (10 ** 12)
            audio_path = f"{audio_dir}/{safe_hash}.mp3"

            with open(audio_path, "wb") as f:
                f.write(response.content)

            logger.info("OpenAI TTS audio generated: %s", audio_path)
            return audio_path
