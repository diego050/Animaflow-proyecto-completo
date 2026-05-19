import json
import time
from typing import Optional, Dict, Any
from google import genai
from google.genai import types
from app.core.logging import get_logger

logger = get_logger("llm")

from .client import _call_llm_sync


def generate_ae_metadata_from_tsx(
    tsx_code: str,
    text: str,
    duration: float,
    width: int = 1080,
    height: int = 1920,
    user_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Genera ae_metadata analizando el código TSX generado por Remotion.
    Esto asegura que AE y Remotion tengan los mismos elementos visuales.
    """
    from app.core.config import settings
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model
    if not api_key:
        logger.warning("GEMINI_API_KEY no encontrada. ae_metadata será null.")
        return None

    try:
        client = genai.Client(api_key=api_key)

        prompt = f"""
Eres un experto en After Effects y Remotion. Analiza este código TSX de Remotion y genera metadata equivalente para After Effects.

CANVAS AE: {width}x{height} píxeles. TODAS las posiciones [x, y] deben estar dentro de este rango.
  - X válido: 0 a {width}
  - Y válido: 0 a {height}
  - Centro del canvas: [{width//2}, {height//2}]

TEXTO DE LA ESCENA: "{text}"
DURACIÓN: {duration} segundos

CÓDIGO TSX DE REMOTION:
```tsx
{tsx_code[:4000]}
```

Tu tarea: Traduce los elementos visuales del TSX a ae_metadata para After Effects.

Genera un JSON con:
- animation_type: ELIGE UNO basado en lo que ves en el TSX: collision, bounce_in, morphing, particles, connection, reveal, construction, flash, fade_in, scale_emerge
- elements: Lista de 3-8 elementos que correspondan a lo que hay en el TSX. Cada elemento tiene:
  - type: rectangle, circle, flash, line, particle (elige el más cercano al elemento SVG del TSX)
  - id: nombre descriptivo basado en el TSX
  - position_keyframes: [{{"time": 0, "value": [x, y]}}, {{"time": duracion, "value": [x, y]}}]
  - scale_keyframes: [{{"time": 0, "value": [0, 0]}}, {{"time": duracion, "value": [100, 100]}}]
  - opacity_keyframes: [{{"time": 0, "value": 0}}, {{"time": 0.5, "value": 100}}]
  - effects: [{{"type": "glow", "intensity": 50, "color": "#38bdf8"}}]
  - CRÍTICO: Las posiciones [x, y] DEBEN estar dentro del canvas {width}x{height}.
- text_animation: ELIGE UNO basado en cómo aparece el texto en el TSX: letter_by_letter, word_reveal, scale_emerge, fade_in

IMPORTANTE:
- Los elementos deben reflejar lo que realmente existe en el TSX (paths, circles, lines, etc.)
- Si el TSX tiene un path de hoja, genera un circle o rectangle que lo represente
- Si el TSX tiene partículas, genera elementos type "particle"
- Las posiciones y tiempos deben ser coherentes con la animación del TSX
- NUNCA inventes elementos que no existen en el TSX

Responde SOLO con JSON válido.
"""

        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = _call_llm_sync(
                    client,
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.7,
                    ),
                    label="LLM AE-Metadata-TSX",
                )
                break
            except Exception as e:
                error_str = str(e)
                is_retryable = any(
                    code in error_str
                    for code in ["429", "500", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"]
                )

                if is_retryable and attempt < max_retries - 1:
                    wait_time = 3 * (2**attempt)
                    logger.warning(
                        "Retry en %ds (intento %d/%d)",
                        wait_time,
                        attempt + 1,
                        max_retries,
                    )
                    time.sleep(wait_time)
                    continue
                logger.exception("AE-Metadata-TSX LLM call failed after %d attempts", attempt + 1)
                raise

        if response is None:
            logger.warning("Modelo principal saturado. Usando fallback.")
            response = _call_llm_sync(
                client,
                model=settings.GEMINI_FALLBACK_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7,
                ),
                label="LLM AE-Metadata-TSX",
            )

        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            json_lines = []
            in_json = False
            for line in lines:
                if line.startswith("```json") or line.startswith("```"):
                    in_json = not in_json
                    continue
                if in_json:
                    json_lines.append(line)
            raw_text = "\n".join(json_lines)

        return json.loads(raw_text)

    except (json.JSONDecodeError, ValueError, TimeoutError) as e:
        logger.error("Error generando ae_metadata desde TSX: %s", e)
        return None
    except Exception as e:
        # Fallback: return None on any unexpected LLM error
        logger.exception("Error generando ae_metadata desde TSX: %s", e)
        return None


def generate_ae_metadata_with_llm(
    text: str,
    media_query: str,
    duration: float,
    width: int = 1080,
    height: int = 1920,
    user_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Genera ae_metadata para After Effects en llamada separada.
    width y height se pasan para que el LLM genere posiciones dentro del canvas.
    """
    from app.core.config import settings
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model
    if not api_key:
        logger.warning("GEMINI_API_KEY no encontrada. ae_metadata será null.")
        return None

    try:
        client = genai.Client(api_key=api_key)

        prompt = f"""
Eres un experto en After Effects. Genera metadata de animación para una escena de video.

CANVAS: {width}x{height} píxeles. TODAS las posiciones [x, y] deben estar dentro de este rango.
  - X válido: 0 a {width}
  - Y válido: 0 a {height}
  - Centro del canvas: [{width//2}, {height//2}]

TEXTO: "{text}"
ANIMACIÓN: "{media_query}"
DURACIÓN: {duration} segundos

Genera un JSON con:
- animation_type: ELIGE UNO: collision, bounce_in, morphing, particles, connection, reveal, construction, flash, fade_in, scale_emerge
- elements: Lista de 3-8 elementos SVG con keyframes. Cada elemento tiene:
  - type: rectangle, circle, flash, line, particle
  - id: nombre único (ej: "block_1", "flash_1")
  - position_keyframes: [{{"time": 0, "value": [x, y]}}, {{"time": 1, "value": [x, y]}}]
  - scale_keyframes: [{{"time": 0, "value": [0, 0]}}, {{"time": 1, "value": [100, 100]}}]
  - opacity_keyframes: [{{"time": 0, "value": 0}}, {{"time": 0.5, "value": 100}}]
  - effects: [{{"type": "glow", "intensity": 50, "color": "#38bdf8"}}]
  - CRÍTICO: Los valores de position_keyframes [x, y] DEBEN estar dentro del canvas {width}x{height}.
- text_animation: ELIGE UNO: letter_by_letter, word_reveal, scale_emerge, fade_in

Ejemplo:
{{
  "animation_type": "collision",
  "elements": [
    {{"type": "rectangle", "id": "block_1", "position_keyframes": [{{"time": 0, "value": [400, 540]}}, {{"time": 1.5, "value": [800, 540]}}], "opacity_keyframes": [{{"time": 0, "value": 0}}, {{"time": 0.3, "value": 100}}], "effects": [{{"type": "drop_shadow", "distance": 10, "color": "#000000", "opacity": 50}}]}},
    {{"type": "flash", "id": "collision_flash", "opacity_keyframes": [{{"time": 1.5, "value": 0}}, {{"time": 1.6, "value": 100}}, {{"time": 1.8, "value": 0}}], "scale_keyframes": [{{"time": 1.5, "value": [0, 0]}}, {{"time": 1.6, "value": [300, 300]}}], "effects": [{{"type": "glow", "intensity": 100, "color": "#fbbf24"}}]}}
  ],
  "text_animation": "word_reveal"
}}

Responde SOLO con JSON válido.
"""

        # Retry con backoff
        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = _call_llm_sync(
                    client,
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.7,
                    ),
                    label="LLM AE-Metadata",
                )
                break
            except Exception as e:
                error_str = str(e)
                is_retryable = any(
                    code in error_str
                    for code in ["429", "500", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"]
                )

                if is_retryable and attempt < max_retries - 1:
                    wait_time = 3 * (2**attempt)
                    logger.warning(
                        "Retry en %ds (intento %d/%d)",
                        wait_time,
                        attempt + 1,
                        max_retries,
                    )
                    time.sleep(wait_time)
                    continue
                logger.exception("AE-Metadata LLM call failed after %d attempts", attempt + 1)
                raise

        # Fallback si el modelo principal falló
        if response is None:
            logger.warning("Modelo principal saturado. Usando fallback.")
            response = _call_llm_sync(
                client,
                model=settings.GEMINI_FALLBACK_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7,
                ),
                label="LLM AE-Metadata",
            )

        return json.loads(response.text)

    except (json.JSONDecodeError, ValueError, TimeoutError) as e:
        logger.error("Error generando ae_metadata: %s", e)
        return None
    except Exception as e:
        # Fallback: return None on any unexpected LLM error
        logger.exception("Error generando ae_metadata: %s", e)
        return None
