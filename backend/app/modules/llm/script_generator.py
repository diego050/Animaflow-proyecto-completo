from typing import Optional
from google import genai
from app.core.logging import get_logger

logger = get_logger("llm")

from .client import _call_llm_sync
from .script_context import get_template


def generate_script_from_info(
    info: str,
    user_id: Optional[str] = None,
    template_id: str = "viral_shorts",
    custom_system_prompt: Optional[str] = None,
    language: str = "es"
) -> str:
    """Usa Gemini para generar un guion narrativo basado en la información del usuario."""
    from app.core.config import settings
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model

    if not api_key:
        return "El motor IA generativo está apagado. Configura GEMINI_API_KEY o agrega tu API key."

    template = get_template(template_id)
    system_prompt = custom_system_prompt or template.system_prompt

    prompt = f"""{system_prompt}

ESTILO SELECCIONADO: {template.name}

EJEMPLOS DE HOOKS PARA ESTE ESTILO:
{chr(10).join(f"- {h}" for h in template.hook_examples)}

GUÍAS DE ESTILO:
{chr(10).join(f"- {g}" for g in template.style_guidelines)}

TEMA DEL USUARIO:
{info}

INSTRUCCIÓN: Genera un guion completo dividido en escenas de aproximadamente 7 segundos cada una.
Cada escena debe tener un texto narrativo y una indicación visual.

FORMATO DE RESPUESTA:
Escena 1: [texto narrativo]
Visual: [descripción de lo que se muestra]

Escena 2: [texto narrativo]
Visual: [descripción de lo que se muestra]

... etc
"""

    try:
        client = genai.Client(api_key=api_key)
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
