import json
import time
from pydantic import BaseModel, Field
from typing import Optional
from google import genai
from google.genai import types
from app.core.logging import get_logger

logger = get_logger("llm")

from .client import _call_llm_sync


class VisualSpecResult(BaseModel):
    media_query: str = Field(
        description="Descripción visual detallada de la escena (en INGLÉS, ideal para generadores de IA)."
    )
    backgroundColor: str = Field(
        description="Color de fondo en formato HEX oscuro, ejemplo #1e293b."
    )
    textColor: str = Field(
        description="Color del texto principal en formato HEX contrastante, ejemplo #38bdf8."
    )


class BatchVisualSpec(BaseModel):
    scenes: list[VisualSpecResult]


def generate_batch_visuals_with_llm(
    chunks: list[str],
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
    design_md: Optional[str] = None,
    system_prompt: Optional[str] = None,
) -> BatchVisualSpec:
    """Usa Gemini para generar un arreglo de escenas visuales para cada bloque de texto."""
    from app.core.config import settings
    from app.core.resolutions import get_resolution
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model

    if not api_key:
        logger.warning("GEMINI_API_KEY no encontrada. Fallback a escenas genéricas.")
        return BatchVisualSpec(
            scenes=[
                VisualSpecResult(
                    media_query="A cinematic wide shot of a futuristic landscape",
                    backgroundColor="#0f172a",
                    textColor="#38bdf8",
                )
                for _ in chunks
            ]
        )

    try:
        client = genai.Client(api_key=api_key)

        w, h = get_resolution(aspect_ratio)
        scenes_context = "\n".join(
            [f"Escena {i+1}: \"{t}\"" for i, t in enumerate(chunks)]
        )

        custom_instructions = ""
        if design_md:
            custom_instructions += f"\n\nINSTRUCCIONES DE DISEÑO DEL USUARIO (design.md):\n{design_md}\n"
        if system_prompt:
            custom_instructions += f"\n\nSYSTEM PROMPT DEL USUARIO:\n{system_prompt}\n"

        prompt = f"""
Eres el Director de Arte SENIOR de AnimaFlow. Analiza este guion y crea instrucciones visuales de alto nivel (media_query) para configurar los componentes de nuestra librería.

CANVAS: {aspect_ratio} ({w}x{h} píxeles).

{scenes_context}
{custom_instructions}

TU TAREA: Para cada escena, define el "mood", la paleta de colores, y el estilo de animación de texto y fondo que mejor refleje el mensaje.

REQUISITOS CRÍTICOS:

1. DESCRIPCIÓN CONCEPTUAL (media_query):
   - NO describas "formas SVG", "coordenadas X,Y", ni "radios".
   - Describe la **Atmósfera**, **Paleta de Colores**, y **Estilo de Animación**.
   - Ejemplo 1: "Cyberpunk theme with neon pink and cyan kinetic background. Text uses a fast slide-up reveal with intense glowing shadows."
   - Ejemplo 2: "Corporate elegant style. Dark slate background shifting to deep indigo. Smooth and slow text fade with minimal blur."
   - Ejemplo 3: "Aggressive and energetic. Pure black background contrasting with bright crimson red. Text pops up instantly with zero delay."

2. ESTILO VISUAL Y COLORES:
   - Elige un `backgroundColor` oscuro y elegante (Hexadecimal).
   - Elige un `textColor` contrastante y vibrante (Hexadecimal).
   - Mantén cohesión cromática entre escenas a menos que haya un giro dramático en el guion.

3. REGLAS ABSOLUTAS:
   - El `media_query` DEBE estar en INGLÉS.
   - NUNCA uses frases genéricas como "generic abstract background" o "particle effects".
   - Devuelve exactamente {len(chunks)} escenas en el mismo orden.

Responde SOLO con JSON válido.
"""

        # INTENTO 1: Modelo principal con retry
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
                        response_schema=BatchVisualSpec,
                        temperature=0.7,
                    ),
                    label="LLM Visuals",
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
                        "Batch visuals: retry en %ds (intento %d/%d)",
                        wait_time,
                        attempt + 1,
                        max_retries,
                    )
                    time.sleep(wait_time)
                    continue
                logger.exception("Batch visuals LLM call failed after %d attempts", attempt + 1)
                raise

        if response is None:
            logger.warning(
                "Modelo principal %s saturado para batch visuals. Usando fallback.", model
            )
            response = _call_llm_sync(
                client,
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=BatchVisualSpec,
                    temperature=0.7,
                ),
                label="LLM Visuals",
            )

        # Parsear JSON con limpieza
        raw_text = response.text.strip()
        # Extraer JSON de bloques markdown si existen
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

        data = json.loads(raw_text)

        # Validar que media_query no sea genérico
        generic_phrases = ["generic abstract background", "particle effects", "futuristic landscape"]
        for scene in data.get("scenes", []):
            media_query = scene.get("media_query", "").lower()
            if any(phrase in media_query for phrase in generic_phrases):
                logger.warning("media_query genérico detectado. Regenerando...")
                raise ValueError("media_query genérico detectado, reintentando")

        return BatchVisualSpec(**data)
    except (json.JSONDecodeError, ValueError, TimeoutError) as e:
        logger.error("Error processing LLM response: %s", e)
        # Fallback con escenas diferenciadas
        fallback_queries = [
            "A plant leaf growing from bottom center with organic curves and glowing particles",
            "A heart shape forming from connected dots with warm golden light",
            "Water drops falling into a pool creating expanding ripple circles",
            "Sun rays expanding from center with warm gradient transitions",
            "Mountain peaks emerging from fog with layered parallax movement",
            "A tree branching upward with leaves appearing one by one",
        ]
        return BatchVisualSpec(
            scenes=[
                VisualSpecResult(
                    media_query=fallback_queries[i % len(fallback_queries)],
                    backgroundColor="#0f172a",
                    textColor="#38bdf8",
                )
                for i, _ in enumerate(chunks)
            ]
        )
    except Exception as e:
        # Fallback: return generic scenes on any unexpected LLM error
        logger.exception("Error conectando con Gemini: %s", e)
        fallback_queries = [
            "A plant leaf growing from bottom center with organic curves and glowing particles",
            "A heart shape forming from connected dots with warm golden light",
            "Water drops falling into a pool creating expanding ripple circles",
            "Sun rays expanding from center with warm gradient transitions",
            "Mountain peaks emerging from fog with layered parallax movement",
            "A tree branching upward with leaves appearing one by one",
        ]
        return BatchVisualSpec(
            scenes=[
                VisualSpecResult(
                    media_query=fallback_queries[i % len(fallback_queries)],
                    backgroundColor="#0f172a",
                    textColor="#38bdf8",
                )
                for i, _ in enumerate(chunks)
            ]
        )
