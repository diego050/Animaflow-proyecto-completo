from typing import Optional
from google import genai
from app.core.logging import get_logger

logger = get_logger("llm")

from .client import _call_llm_sync


def generate_script_from_info(info: str, user_id: Optional[str] = None) -> str:
    """Usa Gemini para generar un guion narrativo basado en la información del usuario."""
    from app.core.config import settings
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model

    if not api_key:
        return "El motor IA generativo está apagado. Configura GEMINI_API_KEY o agrega tu API key."

    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
        Eres un experto guionista de videos B2B y SaaS.
        El usuario te ha proporcionado la siguiente información, idea o producto:
        "{info}"

        Tu tarea es escribir un guion dinámico, conciso y directo para un video corto (máximo 6 oraciones).
        El guion debe estar escrito de forma persuasiva, atrapante, y estar listo para ser locutado.
        NO incluyas indicaciones de escena (como "Corte a", "Música", "Voz en off", "Narrador:").
        SOLO escribe el texto puro que la persona o IA leerá.
        """
        response = _call_llm_sync(
            client,
            model=model,
            contents=prompt,
            label="LLM Script",
        )
        return response.text.strip()
    except (TimeoutError, ValueError) as e:
        logger.error("Error generando guion: %s", e)
        return "Error al generar guion. Por favor, intenta de nuevo o escríbelo manualmente."
    except Exception as e:
        # Fallback: return user-friendly message on any unexpected LLM error
        logger.exception("Error generando guion: %s", e)
        return "Error al generar guion. Por favor, intenta de nuevo o escríbelo manualmente."
