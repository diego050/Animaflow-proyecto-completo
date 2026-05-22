import os
import re
from typing import Optional
from google import genai
from app.core.logging import get_logger

logger = get_logger("remotion")

from .component_postprocess import fix_interpolate_mismatch, wrap_radius_with_math_max
from ..llm.client import _call_gemini_with_retry
from ..llm.visual_spec import VisualSpecResult


async def generate_remotion_component(
    scene_index: int,
    visual_spec: VisualSpecResult,
    text: str,
    duration: float,
    job_id: str,
    aspect_ratio: str = "9:16",
    user_id: Optional[str] = None,
) -> str:
    """Usa Gemini para generar el código React/Remotion dinámico para una escena."""
    from app.core.config import settings
    from app.core.resolutions import get_resolution
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model

    if not api_key:
        logger.warning("GEMINI_API_KEY no encontrada. Fallback a componente predeterminado.")
        return "FadeText"

    try:
        client = genai.Client(api_key=api_key)
        w, h = get_resolution(aspect_ratio)

        prompt_header = (
            "Eres el director de animación SENIOR de AnimaFlow. Creas animaciones SVG 2D complejas en React + Remotion.\n"
            "Tu trabajo es comparable a motion graphics de Apple, Stripe o MrBeast intros — IMPACTANTES y DETALLADAS.\n\n"
            "════════════════════════════════════════\n"
            "ESCENA A ANIMAR\n"
            "════════════════════════════════════════\n"
            f'Texto del guion: "{text}"\n'
            f'Descripción visual: "{visual_spec.media_query}"\n'
            f"Duración: {duration} segundos ({round(duration * 30)} frames a 30fps)\n"
            f"Color base: fondo {visual_spec.backgroundColor} · texto {visual_spec.textColor}\n"
            f"Aspect ratio: {aspect_ratio} (canvas {w}x{h} píxeles)\n\n"
            "════════════════════════════════════════\n"
            "DIRECTRICES DEL DIRECTOR DE ARTE (NUEVO PARADIGMA)\n"
            "════════════════════════════════════════\n"
            "Eres el Director de Arte de AnimaFlow. Tu tarea ya NO es inventar matemáticas ni generar formas SVG desde cero.\n"
            "Tu tarea es ensamblar la escena utilizando EXACTAMENTE los componentes premium de nuestra librería.\n\n"
            "1. ANALIZA el media_query y el sentimiento de la escena.\n"
            "2. ELIGE los parámetros (Props) correctos para los componentes (colores, velocidad, estilo).\n"
            "3. NO generes etiquetas <svg>, <rect>, <circle> ni uses interpolate() o spring() manualmente.\n\n"
            "════════════════════════════════════════\n"
            "LIBRERÍA DE COMPONENTES DISPONIBLES\n"
            "════════════════════════════════════════\n"
            "A) <KineticBackground />\n"
            "   Props opcionales:\n"
            "   - theme: 'default', 'neon', 'dark_glow'\n"
            "   - color1: Hexadecimal (ej. '#ff0000')\n"
            "   - color2: Hexadecimal (ej. '#0000ff')\n\n"
            "B) <TextReveal />\n"
            "   Props:\n"
            "   - text: {text} (SIEMPRE debes pasar el texto que te enviamos)\n"
            "   - color: Hexadecimal\n"
            "   - animation: 'fade' | 'blur' | 'slide_up' (default: 'slide_up')\n"
            "   - glowIntensity: 0 a 1 (float, default: 0.5)\n"
            f"   - x: Posición X del centro del texto (number, default: {w // 2})\n"
            f"   - y: Posición Y del centro del texto (number, default: {int(h * 0.8)})\n"
            "   - fontSize: Tamaño de la fuente en px (number, default: 60)\n"
            f"   - width: Ancho máximo de la caja de texto (number, default: {int(w * 0.8)})\n\n"
            "════════════════════════════════════════\n"
            "REGLAS ABSOLUTAS DE CÓDIGO\n"
            "════════════════════════════════════════\n"
            "- Nombre del componente exportado: SceneComponent (exacto).\n"
            "- Props recibidos: text (string), durationInFrames (number).\n"
            "- DEBES importar los componentes desde '../components/KineticBackground' y '../components/TextReveal'.\n"
            "- PROHIBIDO usar <svg> crudos.\n"
            "- PROHIBIDO agregar librerías externas o Tailwind.\n\n"
            "ESTRUCTURA BASE (REEMPLAZA LOS COLORES Y ESTILOS SEGÚN EL MEDIA_QUERY):\n"
        )

        bg_color = visual_spec.backgroundColor
        txt_color = visual_spec.textColor
        prompt_code = (
            "import React from 'react';\n"
            "import { KineticBackground } from '../../components/KineticBackground';\n"
            "import { TextReveal } from '../../components/TextReveal';\n\n"
            "export const SceneComponent = ({ text, durationInFrames }) => {\n"
            "    // Analiza el media_query y configura los colores de fondo y texto adecuadamente.\n"
            "    // Puedes cambiar theme, colores, y animaciones de acuerdo al contexto.\n"
            "    return (\n"
            f"        <div style={{{{ width: '100%', height: '100%', backgroundColor: '{bg_color}', overflow: 'hidden' }}}}>\n"
            f"            <KineticBackground color1=\"{bg_color}\" color2=\"#1e293b\" theme=\"default\" />\n"
            f"            <TextReveal text={{text}} color=\"{txt_color}\" animation=\"slide_up\" fontSize={{80}} x={{{w // 2}}} y={{{int(h * 0.8)}}} width={{{int(w * 0.8)}}} glowIntensity={{0.5}} />\n"
            "        </div>\n"
            "    );\n"
            "};\n\n"
            "DEVUELVE UNICAMENTE EL CODIGO TSX PLANO. SIN BLOQUES DE MARKDOWN. SOLO CODIGO."
        )

        prompt = prompt_header + prompt_code

        # Intentar con modelo principal con retry automático
        response = None
        try:
            response = await _call_gemini_with_retry(
                client, prompt, max_retries=3, model=model
            )
        except Exception as e:
            # Fallback to secondary model if primary fails
            logger.warning("Modelo principal %s saturado. Usando fallback.", model)
            try:
                response = await _call_gemini_with_retry(
                    client, prompt, max_retries=1, model=model
                )
            except Exception as e2:
                logger.warning(
                    "Fallback también falló (%s...). Usando componente por defecto FadeText.",
                    str(e2)[:60],
                )
                return "FadeText"

        code = response.text.strip()

        # Limpieza básica por si el LLM incluye bloques markdown
        if code.startswith("```tsx"):
            code = code[6:]
        elif code.startswith("```javascript"):
            code = code[13:]
        elif code.startswith("```"):
            code = code[3:]
        if code.endswith("```"):
            code = code[:-3]
        code = code.strip()

        # Post-procesamiento para evitar errores comunes en TSX generado
        # 1. Corregir 'easing.' (minúscula) a 'Easing.' (mayúscula)
        code = re.sub(r"\beasing\.", "Easing.", code)

        # 2. Asegurar que Easing está en el import de remotion
        if "from 'remotion'" in code and "Easing" not in code:
            code = code.replace(
                "interpolate } from 'remotion'", "interpolate, Easing } from 'remotion'"
            )

        # 3. Asegurar que React está importado
        if "import React" not in code and "from 'react'" not in code:
            code = "import React from 'react';\n" + code

        # 4. Validar que no haya valores negativos en atributos SVG
        if "r={" in code and "Math.max" not in code:
            logger.warning("Posible valor negativo en radio SVG para escena %d", scene_index)

        # 5. Corregir mismatches en interpolate()
        code = fix_interpolate_mismatch(code)

        # 6. Envolver TODOS los r={{}} con Math.max(0, ...) si no lo tienen ya
        code = wrap_radius_with_math_max(code)

        # 7. Fix double-brace Math.max errors
        code = re.sub(r"\{Math\.max\(0,\s*\{", "{Math.max(0, ", code)
        code = re.sub(r"\)\)\}\}", "))}", code)
        code = re.sub(r"\{Math\.max\(0,\s*\{", "{Math.max(0, ", code)
        code = re.sub(r"\)\)\}\}", "))}", code)

        # 8. Fix unbalanced parentheses in Math.max
        code = re.sub(r"Math\.max\(0,\s*\{([^}]+)\)", r"Math.max(0, \1)", code)

        # Guardar archivo físicamente en subdirectorio por usuario
        from app.core.config import settings
        generated_dir = os.path.join(settings.frontend_path, "src", "remotion", "generated")
        user_dir = os.path.join(generated_dir, f"user_{user_id or 'anonymous'}")
        os.makedirs(user_dir, exist_ok=True)

        file_name = f"Scene_{job_id}_{scene_index}.tsx"
        file_path = os.path.join(user_dir, file_name)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)

        logger.info("Componente TSX generado para escena %d -> %s (user: %s)", scene_index, file_name, user_id or 'anonymous', extra={"job_id": job_id})
        return f"Scene_{job_id}_{scene_index}"
    except (TimeoutError, ValueError) as e:
        logger.error("Error programando componente para escena %d: %s", scene_index, e, extra={"job_id": job_id})
        return "FadeText"
    except Exception as e:
        # Fallback: return default component on any unexpected error
        logger.exception("Error programando componente para escena %d: %s", scene_index, e, extra={"job_id": job_id})
        return "FadeText"


async def heal_remotion_component(
    user_id: Optional[str],
    job_id: str,
    scene_index: int,
    error_message: str,
) -> bool:
    """Intenta curar un componente TSX que falló al compilar."""
    from app.core.config import settings
    from app.modules.llm.resolver import resolve_llm_credentials

    creds = resolve_llm_credentials(user_id)
    api_key = creds.api_key
    model = creds.model

    if not api_key:
        return False

    # Leer el código actual
    generated_dir = os.path.join(settings.frontend_path, "src", "remotion", "generated")
    user_dir = os.path.join(generated_dir, f"user_{user_id or 'anonymous'}")
    file_name = f"Scene_{job_id}_{scene_index}.tsx"
    file_path = os.path.join(user_dir, file_name)

    if not os.path.exists(file_path):
        logger.error("No se puede curar %s porque no existe", file_path)
        return False

    with open(file_path, "r", encoding="utf-8") as f:
        broken_code = f.read()

    prompt = (
        "El siguiente código React/Remotion falló al compilar con este error de esbuild/TSX:\n\n"
        f"ERROR: {error_message}\n\n"
        "CÓDIGO ROTO:\n"
        "```tsx\n"
        f"{broken_code}\n"
        "```\n\n"
        "Tu tarea es arreglar el error de sintaxis y devolver el código TSX completo y funcional. "
        "NO cambies la animación ni el diseño, SOLO arregla el error técnico (etiquetas mal cerradas, llaves, etc).\n"
        "DEVUELVE UNICAMENTE EL CODIGO TSX PLANO. SIN BLOQUES DE MARKDOWN. SOLO CODIGO."
    )

    try:
        client = genai.Client(api_key=api_key)
        response = await _call_gemini_with_retry(
            client, prompt, max_retries=2, model=model
        )
        
        code = response.text.strip()
        if code.startswith("```tsx"): code = code[6:]
        elif code.startswith("```javascript"): code = code[13:]
        elif code.startswith("```"): code = code[3:]
        if code.endswith("```"): code = code[:-3]
        code = code.strip()
        
        # Post-procesamiento
        code = re.sub(r"\beasing\.", "Easing.", code)
        if "from 'remotion'" in code and "Easing" not in code:
            code = code.replace("interpolate } from 'remotion'", "interpolate, Easing } from 'remotion'")
        if "import React" not in code and "from 'react'" not in code:
            code = "import React from 'react';\n" + code
        code = fix_interpolate_mismatch(code)
        code = wrap_radius_with_math_max(code)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)

        logger.info("Componente curado con éxito: %s", file_name, extra={"job_id": job_id})
        return True
    except Exception as e:
        logger.error("Fallo la curación de %s: %s", file_name, e, extra={"job_id": job_id})
        return False
