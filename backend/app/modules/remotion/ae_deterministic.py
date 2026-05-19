import os
import re
from datetime import datetime
from typing import Optional
from app.core.logging import get_logger

logger = get_logger("remotion")


def generate_ae_script_from_tsx(
    tsx_code: str,
    text: str,
    duration: float,
    bg_color: str = "#0f172a",
    text_color: str = "#38bdf8",
    width: int = 1080,
    height: int = 1920,
    job_id: str = None,
    scene_id: int = None,
    user_id: Optional[str] = None,
) -> Optional[str]:
    """
    Traduce codigo TSX de Remotion a ExtendScript de After Effects.
    Usa generador DETERMINISTICO (sin LLM) para maxima fidelidad y confiabilidad.
    """
    logger.info(
        "Iniciando generacion (width=%d, height=%d, duration=%s)", width, height, duration
    )

    try:
        from app.modules.parsers.svg.extractor import parse_svg_from_tsx
        from app.modules.parsers.tsx.analyzer import analyze_tsx_for_ae
        from app.modules.ae_export.deterministic import generate_deterministic_script
        from ..llm.ae_postprocess import _post_process_script

        # 1. Parse SVG elements (shape geometry, colors, effects)
        svg_elements = parse_svg_from_tsx(tsx_code)
        logger.info("SVG parser: %d elementos", len(svg_elements))

        # 2. Enriched analysis (positions, animations, particles, text)
        enriched = analyze_tsx_for_ae(tsx_code, width, height, 30)
        elem_count = len(enriched.get("elements", []))
        anim_count = len(enriched.get("animations", []))
        map_count = len(enriched.get("map_expansions", []))
        logger.info(
            "Enriched: %d elementos, %d animaciones, %d map expansions", elem_count, anim_count, map_count
        )

        # 3. Generate deterministic script (NO LLM)
        full_script = generate_deterministic_script(
            svg_elements=svg_elements,
            enriched=enriched,
            text=text,
            duration=duration,
            bg_color=bg_color,
            text_color=text_color,
            width=width,
            height=height,
            fps=30,
        )

        if not full_script:
            logger.error("ERROR: generador retorno vacio")
            return None

        logger.info("Script generado: %d chars", len(full_script))

        # 4. Post-processing (matchName fixes, safety checks)
        full_script = _post_process_script(full_script)

        # 5. Debug file logging
        try:
            debug_dir = os.path.join(
                os.path.dirname(
                    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                ),
                "storage",
                "debug",
            )
            os.makedirs(debug_dir, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            scene_str = f"scene_{scene_id}" if scene_id is not None else "scene_X"
            job_str = job_id if job_id else "job_unknown"
            debug_filename = f"{job_str}_{scene_str}_{timestamp}.txt"
            debug_path = os.path.join(debug_dir, debug_filename)

            addshape_count = len(re.findall(r"\.addShape\(\)", full_script))
            addtext_count = len(re.findall(r"\.addText\(", full_script))
            addsolid_count = len(re.findall(r"\.addSolid\(", full_script))
            setvalueat_count = len(re.findall(r"\.setValueAtTime\(", full_script))

            debug_content = f"""=== METADATA ===
job_id: {job_id or 'unknown'}
scene_id: {scene_id if scene_id is not None else 'unknown'}
timestamp: {timestamp}
phase: DETERMINISTIC (no LLM)
svg_elements_found: {len(svg_elements)}
enriched_elements: {elem_count}
enriched_animations: {anim_count}
map_expansions: {map_count}
total_script_length: {len(full_script)}

=== VALIDATION ===
addShape() calls: {addshape_count}
addText() calls: {addtext_count}
addSolid() calls: {addsolid_count}
setValueAtTime() calls: {setvalueat_count}

=== FULL SCRIPT ===
{full_script}
"""

            with open(debug_path, "w", encoding="utf-8") as f:
                f.write(debug_content)

            logger.info(
                "Debug: %s (shapes=%d, text=%d, anims=%d)", debug_filename, addshape_count, addtext_count, setvalueat_count
            )
        except (OSError, IOError) as debug_err:
            logger.warning("Warning debug file: %s", debug_err)

        return full_script

    except (ValueError, KeyError) as e:
        logger.error("ERROR: %s: %s", type(e).__name__, e)
        return None
    except Exception as e:
        # Fallback: return None on any unexpected error
        logger.exception("ERROR: %s: %s", type(e).__name__, e)
        return None
