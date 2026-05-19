import json
import time
from typing import Optional
from google import genai
from google.genai import types
from app.core.logging import get_logger

logger = get_logger("llm")

from .client import _call_llm_sync


def generate_ae_animations(
    layer_names: list,
    animation_data: dict,
    duration: float,
    tsx_code: str = None,
    fase1_output: str = None,
    svg_elements: list = None,
    missing_layers: list = None,
    text_info: dict = None,
    width: int = 1080,
    height: int = 1920,
    job_id: str = None,
    scene_id: int = None,
    user_id: Optional[str] = None,
) -> Optional[str]:
    """
    FASE 2: Genera SOLO las animaciones (setValueAtTime calls) para un script AE.
    Recibe contexto COMPLETO: TSX original, output de Fase 1, geometría SVG.
    """
    from app.core.config import settings
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model
    if not api_key:
        logger.warning("GEMINI_API_KEY no encontrada.")
        return None

    try:
        layers_str = "\n".join([f"- {name}" for name in layer_names])

        animations_filtered = animation_data.get("animations", [])
        anims_compact = []
        for a in animations_filtered:
            anims_compact.append(
                {
                    "variable": a["variable"],
                    "type": a["type"],
                    "keyframes": a["keyframes"],
                    "easing": a.get("easing", "linear"),
                    "ae_property": a.get("ae_property", ""),
                }
            )

        text_anim_context = ""
        if text_info and text_info.get("style"):
            style = text_info["style"]
            pos = text_info.get("position", {})
            text_anim_context = f"""
TEXTO DETALLES:
- Color: {style.get('color', 'N/A')}
- FontSize: {style.get('fontSize', '68px')}
- FontWeight: {style.get('fontWeight', 900)}
- TextShadow: {style.get('textShadow', 'N/A')}
- Posición: {pos}
"""

        missing_context = ""
        if missing_layers:
            missing_context = f"""
ATENCIÓN: En un intento anterior, los siguientes layers NO fueron animados:
{", ".join(missing_layers)}

Debes generar animaciones para TODOS los layers, INCLUYENDO estos que faltaron.
"""

        tsx_context = ""
        if tsx_code:
            tsx_context = f"""
=== CÓDIGO TSX ORIGINAL (React/Remotion) ===
Este es el código fuente que genera la animación en el frontend.
Analiza CADA elemento y su animación para traducirlo fielmente a After Effects.

```tsx
{tsx_code[:6000]}
```
"""

        fase1_context = ""
        if fase1_output:
            fase1_context = f"""
=== ESTRUCTURA EXISTENTE EN AFTER EFFECTS (Fase 1) ===
Estos son los layers que YA fueron creados. Usa EXACTAMENTE estos nombres de variable.

{fase1_output[:6000]}
"""

        svg_context = ""
        if svg_elements:
            svg_context = f"""
=== GEOMETRÍA SVG EXACTA (coordenadas reales) ===
{json.dumps(svg_elements, indent=2)}
"""

        client = genai.Client(api_key=api_key)

        prompt = f"""Tienes el contexto COMPLETO para generar animaciones fieles al diseño original de React.

{fase1_context}
{tsx_context}
{svg_context}

=== LAYERS QUE DEBES ANIMAR (USA EXACTAMENTE ESTOS NOMBRES) ===
{layers_str}
- textLayer (text layer)

=== ANIMACIONES DEL PARSER (keyframes a replicar) ===
{json.dumps(anims_compact, indent=2)}

{text_anim_context}
{missing_context}

REGLAS CRÍTICAS:
1. SOLO setValueAtTime() calls — NO crear layers, NO var comp, NO addShape
2. USA EXACTAMENTE los nombres de layers de la lista. NO inventes nombres.
3. Genera animaciones para TODOS los layers de la lista. Si hay {len(layer_names)} layers, genera {len(layer_names)} bloques.
4. Si un layer no tiene animación específica en el TSX, agrega al menos fade-in de opacidad:
   var {layer_names[0]}Opac = {layer_names[0]}.property("ADBE Transform Group").property("ADBE Opacity");
   {layer_names[0]}Opac.setValueAtTime(0, 0);
   {layer_names[0]}Opac.setValueAtTime(0.5, 100);
5. Para opacity: valores 0-100 (no 0-1)
6. Para scale: valores tipo [100, 100] para 100%, [0, 0] para 0%, [120, 120] para 120%
   - NUNCA uses valores mayores a 500% ([500, 500])
7. Para position: [X, Y] dentro del canvas {width}x{height}
8. Comenta cada bloque con el nombre del layer

COORDENADAS:
- Si "isOffset": true → SUMA el offset a la posición base
- Si "isPixelValue": true → convierte a scale % máximo 300%
- NUNCA uses valores de offset como posiciones absolutas
- Para positionY: [X_fijo, baseY + offset]

MAPEO DE PROPIEDADES:
- position → .property("ADBE Transform Group").property("ADBE Position")
- scale → .property("ADBE Transform Group").property("ADBE Scale")
- opacity → .property("ADBE Transform Group").property("ADBE Opacity")
- rotation → .property("ADBE Transform Group").property("ADBE Rotate Z")

EJEMPLO FORMATO:
// Animations for Leaf_1
var leafPos = Leaf_1.property("ADBE Transform Group").property("ADBE Position");
leafPos.setValueAtTime(0.0, [540, 1400]);
leafPos.setValueAtTime(2.0, [540, 960]);

var leafOpac = Leaf_1.property("ADBE Transform Group").property("ADBE Opacity");
leafOpac.setValueAtTime(0.0, 0);
leafOpac.setValueAtTime(0.667, 100);

// Animations for textLayer
var textOpac = textLayer.property("ADBE Transform Group").property("ADBE Opacity");
textOpac.setValueAtTime(0, 0);
textOpac.setValueAtTime(0.8, 100);

SOLO código ExtendScript de animaciones. Sin comentarios largos. Sin crear layers. Sin var comp."""

        max_retries = 3
        response = None
        for attempt in range(max_retries):
            try:
                response = _call_llm_sync(
                    client,
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(temperature=0.2),
                    label="LLM AE-Animations",
                )
                break
            except Exception as e:
                error_str = str(e)
                is_retryable = any(
                    code in error_str
                    for code in ["429", "500", "502", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE", "INTERNAL"]
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
                logger.exception("AE-Animations LLM call failed after %d attempts", attempt + 1)
                raise

        if response is None:
            response = _call_llm_sync(
                client,
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.2),
                label="LLM AE-Animations",
            )

        script = response.text.strip()
        if script.startswith("```"):
            lines = script.split("\n")
            code_lines = []
            in_code = False
            for line in lines:
                if (
                    line.startswith("```jsx")
                    or line.startswith("```javascript")
                    or line.startswith("```")
                ):
                    in_code = not in_code
                    continue
                if in_code:
                    code_lines.append(line)
            script = "\n".join(code_lines)

        return script

    except (TimeoutError, ValueError) as e:
        logger.error("ERROR: %s: %s", type(e).__name__, e)
        return None
    except Exception as e:
        # Fallback: return None on any unexpected LLM error
        logger.exception("ERROR: %s: %s", type(e).__name__, e)
        return None
