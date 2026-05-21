import os
import subprocess
from typing import Optional
from .base import TTSProvider
from app.core.logging import get_logger

logger = get_logger("tts.piper")

class PiperProvider(TTSProvider):
    """Local Piper TTS. Runs on the VPS."""

    @property
    def name(self) -> str:
        return "local_piper"

    @property
    def requires_api_key(self) -> bool:
        return False

    async def generate_audio(self, text: str, voice_id: str = "es_ES-carlfm-x_low", api_key: Optional[str] = None) -> str:
        """Generate audio using local Piper.

        Requires piper-tts to be installed:
        pip install piper-tts

        Also requires voice model files (.onnx + .json) in storage/models/piper/
        """
        from app.core.config import settings

        audio_dir = os.path.join(settings.STORAGE_BASE_DIR, "storage", "audio", "piper")
        os.makedirs(audio_dir, exist_ok=True)
        safe_hash = abs(hash(text)) % (10 ** 12)
        audio_path = os.path.join(audio_dir, f"{safe_hash}.wav")

        model_dir = os.path.join(settings.STORAGE_BASE_DIR, "storage", "models", "piper")
        os.makedirs(model_dir, exist_ok=True)

        model_path = os.path.join(model_dir, f"{voice_id}.onnx")
        config_path = os.path.join(model_dir, f"{voice_id}.onnx.json")

        # Fallback to default voice if model not found
        if not os.path.exists(model_path):
            fallback_id = "es_ES-carlfm-x_low"
            model_path = os.path.join(model_dir, f"{fallback_id}.onnx")
            config_path = os.path.join(model_dir, f"{fallback_id}.onnx.json")
            logger.warning("Voice %s not found, falling back to %s", voice_id, fallback_id)

        try:
            # Run piper
            result = subprocess.run(
                [
                    "piper",
                    "--model", model_path,
                    "--config", config_path,
                    "--output_file", audio_path
                ],
                input=text,
                text=True,
                capture_output=True,
                timeout=60
            )

            if result.returncode != 0:
                logger.error("Piper failed: %s", result.stderr)
                raise RuntimeError(f"Piper TTS failed: {result.stderr}")

            logger.info("Piper audio generated: %s", audio_path)
            return audio_path

        except FileNotFoundError:
            logger.error("piper command not found. Install with: pip install piper-tts")
            raise RuntimeError("Piper TTS not installed. Run: pip install piper-tts")
