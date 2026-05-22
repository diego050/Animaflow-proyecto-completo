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
            "REQUISITOS DE ANIMACIÓN COMPLEJA\n"
            "════════════════════════════════════════\n"
            "1. ANALIZA el media_query y determina QUÉ tipo de animación necesita:\n"
            "   - Colisión: formas que chocan, generan destello, rebotan\n"
            "   - Morphing: una forma se transforma en otra\n"
            "   - Partículas: elementos pequeños que se agrupan/dispersan\n"
            "   - Conexión: nodos que se conectan progresivamente\n"
            "   - Revelación: capas que se deslizan para revelar contenido\n"
            "   - Construcción: elementos que se ensamblan pieza por pieza\n"
            "   - O cualquier otra animación contextual que el media_query describa\n\n"
            "2. USA EASING CURVES para movimiento natural:\n"
            "   - Easing.out(Easing.back(2)) para rebote\n"
            "   - Easing.inOut(Easing.cubic) para transiciones suaves\n"
            "   - Easing.out(Easing.quad) para desaceleración\n"
            "   - spring({ config: { damping: 8, stiffness: 200 } }) para elasticidad\n"
            "   - Easing.bezier([0.68, -0.55, 0.265, 1.55]) para custom curves\n\n"
            "3. SVG DETALLADO: Mínimo 3-5 elementos (rect, circle, path, line, ellipse).\n"
            "   - Usa <defs> para gradientes y filtros\n"
            "   - Aplica drop-shadow para profundidad\n"
            "   - Incluye glow effects con filter: blur()\n\n"
            "4. ANIMACIONES EN CAPAS:\n"
            "   - Entrada (frames 0-30): aparición de elementos principales\n"
            "   - Desarrollo (frames 30-durationInFrames-30): animación central\n"
            "   - Salida (últimos 30 frames): transición de salida o loop\n\n"
            "5. TEXTO PREMIUM:\n"
            "   - fontSize 56-72px, fontWeight 800-900\n"
            "   - Animación: letter_by_letter, word_reveal, o scale_emerge\n"
            "   - textShadow con glow del color del objeto principal\n\n"
            f"6. CANVAS: El viewBox del SVG debe ser exactamente \"0 0 {w} {h}\".\n"
            f"   Todas las posiciones y tamaños deben caber dentro de {w}x{h}.\n"
            f"   Centro del canvas: [{w//2}, {h//2}].\n\n"
            "════════════════════════════════════════\n"
            "EJEMPLOS DE CÓDIGO PARA DIFERENTES ANIMACIONES\n"
            "════════════════════════════════════════\n"
            "COLISIÓN:\n"
            "  const block1X = interpolate(frame, [0, 40], [-200, 0], {{ easing: Easing.out(Easing.back(2)) }});\n"
            "  const block2X = interpolate(frame, [0, 40], [200, 0], {{ easing: Easing.out(Easing.back(2)) }});\n"
            "  const flashOpacity = interpolate(frame, [40, 45, 50], [0, 1, 0], {{ extrapolateRight: 'clamp' }});\n"
            "  const flashScale = interpolate(frame, [40, 45], [0, 3], {{ easing: Easing.out(Easing.quad) }});\n\n"
            "MORPHING:\n"
            "  const morphProgress = interpolate(frame, [20, 60], [0, 1], {{ easing: Easing.inOut(Easing.cubic) }});\n"
            "  // Interpola entre dos paths SVG o transforma shapes\n\n"
            "PARTÍCULAS:\n"
            "  const particles = Array.from({{ length: 8 }}).map((_, i) => ({{\n"
            "    x: interpolate(frame, [i*5, i*5+30], [-100, 0], {{ easing: Easing.out(Easing.quad) }}),\n"
            "    opacity: interpolate(frame, [i*5, i*5+20, i*5+40], [0, 1, 0])\n"
            "  }}));\n\n"
            "BOUNCE IN:\n"
            "  const bounceY = interpolate(frame, [0, 30], [-200, 0], {{ easing: Easing.out(Easing.back(3)) }});\n"
            "  const bounceScale = spring({{ frame, fps, config: {{ damping: 10, stiffness: 150 }} }});\n\n"
            "════════════════════════════════════════\n"
            "REGLAS ABSOLUTAS DE CÓDIGO\n"
            "════════════════════════════════════════\n"
            "- SOLO importa de 'remotion' y 'react'. NADA más.\n"
            "- Nombre del componente: SceneComponent (exacto).\n"
            "- Props: text (string), durationInFrames (number).\n"
            "- SVG inline en JSX. Usa <svg viewBox> + <defs> para gradientes internos.\n"
            "- PROHIBIDO: CSS transitions, Tailwind, librerías externas, @keyframes.\n"
            "- PROHIBIDO: objetos placeholder, SVGs vacíos, rectángulos sin detalle.\n"
            "- El código debe compilar sin errores y ser 100% funcional.\n"
            "- IMPORTA Easing de 'remotion': import {{ useCurrentFrame, useVideoConfig, spring, interpolate, Easing }} from 'remotion';\n"
            "- NUNCA uses 'easing' en minúscula. SIEMPRE usa 'Easing' con E mayúscula.\n"
            "- Si usas easing en interpolate, debe ser: easing: Easing.out(Easing.back(2))\n"
            "- CRUCIAL: En interpolate(), inputRange y outputRange DEBEN tener exactamente la misma cantidad de elementos.\n"
            "  Ejemplo CORRECTO: interpolate(frame, [0, 10, 20], [0, 1, 0]) → 3 inputs, 3 outputs\n"
            "  Ejemplo INCORRECTO: interpolate(frame, [0, 20], [0, 1, 0]) → 2 inputs, 3 outputs ← FALLA\n"
            "- Si necesitas fade in/out, usa: interpolate(frame, [start, mid, end], [0, 1, 0]) con 3 valores en ambos\n"
            "- CRUCIAL para SVG: NUNCA uses valores directos en r={{}}. SIEMPRE usa Math.max(0, expression).\n"
            "  Ejemplo CORRECTO: r={{Math.max(0, 100 * springScale)}}\n"
            "  Ejemplo INCORRECTO: r={{100 * springScale}} ← puede ser negativo y romper SVG\n\n"
            "ESTRUCTURA BASE (REEMPLAZA Y EXPANDE — NO copies literal):\n"
        )

        bg_color = visual_spec.backgroundColor
        txt_color = visual_spec.textColor
        prompt_code = (
            "import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';\n"
            "import React from 'react';\n\n"
            "export const SceneComponent = ({ text, durationInFrames }) => {\n"
            "    const frame = useCurrentFrame();\n"
            "    const { fps } = useVideoConfig();\n\n"
            "    // Analiza el media_query y crea animaciones SVG complejas contextualizadas\n"
            "    // Usa easing curves: Easing.out(Easing.back(2)), Easing.inOut(Easing.cubic), spring()\n"
            "    // Crea mínimo 3-5 elementos SVG (rect, circle, path, line, ellipse)\n"
            "    // Implementa: entrada (0-30f), desarrollo (30f-durationInFrames-30f), salida (últimos 30f)\n"
            "    // IMPORTANTE: Cuando uses spring() para escalar circulos, usa Math.max(0, radius * scale)\n"
            "    // para evitar valores negativos. Ejemplo: r={{Math.max(0, 20 * coreScale)}}\n\n"
            "    return (\n"
            f"        <div style={{{{ width: '100%', height: '100%', backgroundColor: '{bg_color}', overflow: 'hidden', fontFamily: 'Inter, Outfit, sans-serif' }}}}>\n"
            "            {/* SVG principal con animaciones complejas */}\n"
            f'            <svg viewBox="0 0 {w} {h}" style={{ position: \'absolute\', width: \'100%\', height: \'100%\' }}>\n'
            "                {/* Elementos SVG animados aquí */}\n"
            "            </svg>\n"
            "            \n"
            "            {/* Texto con animación de entrada */}\n"
            "            <div style={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>\n"
            f"                <h1 style={{{{ color: '{txt_color}', fontSize: '64px', fontWeight: 900, margin: 0, textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}}}>{{text}}</h1>\n"
            "            </div>\n"
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
