import os
import json
import httpx
from typing import Optional, Tuple
from app.core.logging import get_logger

logger = get_logger("tts")

VOICEBOX_API_URL = os.getenv("VOICEBOX_API_URL", "http://127.0.0.1:17493")
AUDIO_STORAGE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../storage/audio")
)


async def get_or_create_kokoro_profile() -> str | None:
    """Obtiene o crea el perfil preset de Kokoro para AnimaFlow."""
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{VOICEBOX_API_URL}/profiles", timeout=10.0)
            res.raise_for_status()
            profiles = res.json()
            existing = next(
                (p["id"] for p in profiles if p["name"] == "animaflow-kokoro-es"),
                None,
            )
            if existing:
                return existing

            payload = {
                "name": "animaflow-kokoro-es",
                "language": "es",
                "voice_type": "preset",
                "preset_engine": "kokoro",
                "preset_voice_id": "em_alex",
            }
            res = await client.post(
                f"{VOICEBOX_API_URL}/profiles", json=payload, timeout=10.0
            )
            if not res.is_success:
                logger.error(
                    "Error creando perfil Kokoro %d: %s", res.status_code, res.text
                )
                return None
            profile_id = res.json()["id"]
            logger.info("Perfil Kokoro creado: %s", profile_id)
            return profile_id
    except (httpx.HTTPError, httpx.TimeoutException, json.JSONDecodeError) as e:
        logger.error("No se pudo obtener/crear perfil Kokoro: %s", e)
        return None
    except Exception as e:
        # Fallback: return None on any unexpected error
        logger.exception("No se pudo obtener/crear perfil Kokoro: %s", e)
        return None


async def generate_tts_with_voicebox(
    text: str, scene_id: str
) -> Tuple[Optional[float], Optional[str]]:
    """Llama a la API local de Voicebox y retorna la duración en segundos y la URL del audio."""
    try:
        profile_id = await get_or_create_kokoro_profile()
        if not profile_id:
            logger.warning("Sin perfil Kokoro disponible para %s.", scene_id)
            return None, None

        payload = {
            "text": text,
            "profile_id": profile_id,
            "language": "es",
            "engine": "kokoro",
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{VOICEBOX_API_URL}/generate",
                json=payload,
                timeout=30.0,
            )
            if not response.is_success:
                logger.error(
                    "Error %d en %s: %s", response.status_code, scene_id, response.text
                )
                return None, None

            data = response.json()
            generation_id = data.get("id")
            if not generation_id:
                return None, None

            status_url = f"{VOICEBOX_API_URL}/generate/{generation_id}/status"
            async with client.stream("GET", status_url, timeout=120.0) as stream:
                async for line in stream.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            msg = json.loads(line[6:])
                            status = msg.get("status")
                            if status == "completed":
                                duration = msg.get("duration")
                                audio_url = f"{VOICEBOX_API_URL}/audio/{generation_id}"
                                return duration, audio_url
                            elif status == "failed":
                                logger.error(
                                    "Generación fallida %s: %s", scene_id, msg.get('error')
                                )
                                return None, None
                        except json.JSONDecodeError:
                            continue

        return None, None
    except (httpx.HTTPError, httpx.TimeoutException) as e:
        logger.error("Error o no disponible: %s", e)
        return None, None
    except Exception as e:
        # Fallback: return None on any unexpected error
        logger.exception("Error o no disponible: %s", e)
        return None, None
