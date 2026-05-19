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
        audio_dir = "storage/audio/piper"
        os.makedirs(audio_dir, exist_ok=True)
        safe_hash = abs(hash(text)) % (10 ** 12)
        audio_path = f"{audio_dir}/{safe_hash}.wav"

        model_path = f"storage/models/piper/{voice_id}.onnx"
        config_path = f"storage/models/piper/{voice_id}.onnx.json"

        if not os.path.exists(model_path):
            logger.warning("Piper model not found: %s. Using default voice.", model_path)
            # Fallback to a default model or raise error
            raise FileNotFoundError(
                f"Piper voice model not found: {model_path}. "
                "Download from https://github.com/rhasspy/piper/releases"
            )

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
