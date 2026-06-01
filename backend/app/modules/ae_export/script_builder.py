"""
AE script builder: per-scene script generation and full script assembly.
"""
import os
from typing import Dict, Tuple

from app.db.models import JobModel
from app.core.logging import get_logger

logger = get_logger("ae_export")

from .deterministic.utils import hex_to_rgb_array
from .shape_renderers import SHAPE_RENDERERS, generate_ae_shape_generic

ASPECT_RATIOS = {
    "9:16": (1080, 1920),
    "4:5": (1080, 1350),
    "3:4": (1080, 1440),
    "1:1": (1080, 1080),
    "16:9": (1920, 1080),
}
DEFAULT_ASPECT_RATIO = "9:16"


def get_resolution(aspect_ratio: str) -> Tuple[int, int]:
    return ASPECT_RATIOS.get(aspect_ratio, ASPECT_RATIOS[DEFAULT_ASPECT_RATIO])


def generate_ae_script(scene: Dict, index: int, width: int = 1080, height: int = 1920) -> str:
    """
    Genera código ExtendScript (.jsx) para una escena de After Effects.
    """
    ae_metadata = scene.get('ae_metadata') or {}
    elements = ae_metadata.get('elements', [])
    text_animation = ae_metadata.get('text_animation', 'fade_in')
    audio_layer = ae_metadata.get('audio_layer', {})
    bg_color = scene.get('remotion_props', {}).get('backgroundColor', '#0f172a')
    text_color = scene.get('remotion_props', {}).get('textColor', '#38bdf8')
    
    script_lines = [
        f"// Escena {index + 1} - Generado por AnimaFlow",
        f'var comp = app.project.items.addComp("AnimaFlow_Scene_{index + 1}", {width}, {height}, 1, {scene.get("duration_seconds", 6)}, 30);',
        "",
        "// ====================================",
        "// FONDO",
        "// ====================================",
        f'var bgLayer = comp.layers.addSolid({hex_to_rgb_array(bg_color)}, "Fondo", {width}, {height}, 1);',
        "bgLayer.inPoint = 0;",
        "bgLayer.outPoint = comp.duration;",
        "",
        "// ====================================",
        "// ELEMENTOS SVG",
        "// ====================================",
    ]
    
    # Generar elementos usando el registro de renderers
    for elem in elements:
        elem_type = elem.get('type', 'rectangle')
        renderer = SHAPE_RENDERERS.get(elem_type, generate_ae_shape_generic)
        script_lines.extend(renderer(elem, width, height))
    
    # Agregar capa de texto
    duration = scene.get('duration_seconds', 6)
    text_y = int(height * 0.8)

    script_lines.extend([
        "",
        "// ====================================",
        "// TEXTO",
        "// ====================================",
        f'var textLayer = comp.layers.addText("{scene.get("text", "")}");',
        "textLayer.name = \"Texto_Principal\";",
        f"textLayer.inPoint = 0;",
        f"textLayer.outPoint = {duration};",
        "",
        "// Color del texto (via TextDocument)",
        "var textDoc = textLayer.property(\"Source Text\").value;",
        f"textDoc.fillColor = {hex_to_rgb_array(text_color)};",
        "textDoc.applyFill = true;",
        "textLayer.property(\"Source Text\").setValue(textDoc);",
        "",
        "// Posición: centrado en X, Y según análisis de colisión con animación",
        f'var textPos = textLayer.property("ADBE Transform Group").property("ADBE Position");',
        f'textPos.setValue([{width // 2}, {text_y}]);',
        "",
        "// Animación de texto: fade-in entrada, fade-out salida",
        "var textOpac = textLayer.property(\"ADBE Transform Group\").property(\"ADBE Opacity\");",
    ])

    if text_animation == 'letter_by_letter':
        script_lines.extend([
            "textOpac.setValueAtTime(0, 0);",
            "textOpac.setValueAtTime(1.0, 100);",
            f"textOpac.setValueAtTime({duration - 0.3}, 100);",
            f"textOpac.setValueAtTime({duration}, 0);",
        ])
    elif text_animation == 'scale_emerge':
        script_lines.extend([
            "var textScale = textLayer.property(\"ADBE Transform Group\").property(\"ADBE Scale\");",
            "textScale.setValueAtTime(0, [0, 0]);",
            "textScale.setValueAtTime(0.8, [100, 100]);",
            "textOpac.setValueAtTime(0, 0);",
            "textOpac.setValueAtTime(0.5, 100);",
            f"textOpac.setValueAtTime({duration - 0.3}, 100);",
            f"textOpac.setValueAtTime({duration}, 0);",
        ])
    else:  # fade_in
        script_lines.extend([
            "textOpac.setValueAtTime(0, 0);",
            "textOpac.setValueAtTime(0.8, 100);",
            f"textOpac.setValueAtTime({duration - 0.3}, 100);",
            f"textOpac.setValueAtTime({duration}, 0);",
        ])
    
    # Agregar audio
    if audio_layer:
        audio_file = audio_layer.get('file', f'audio/escena_{index + 1}.mp3')
        script_lines.extend([
            "",
            "// ====================================",
            "// AUDIO",
            "// ====================================",
            f'var audioFile = new File("./{audio_file}");',
            "if (audioFile.exists) {",
            "    var audioLayer = comp.layers.add(audioFile);",
            "    audioLayer.inPoint = 0;",
            "}",
        ])
    
    script_lines.extend([
        "",
        "// ====================================",
        "// FIN ESCENA",
        "// ====================================",
    ])
    
    return "\n".join(script_lines)


def generate_minimal_fallback(scene: Dict, index: int, width: int = 1080, height: int = 1920) -> str:
    """
    Generate a minimal AE script with just background + text.
    Last resort when both ae_script_code and deterministic fallback fail.
    """
    bg_color = scene.get('remotion_props', {}).get('backgroundColor', '#0f172a')
    text_color = scene.get('remotion_props', {}).get('textColor', '#38bdf8')
    duration = scene.get('duration_seconds', 6)
    text = scene.get('text', '')
    
    safe_text = text.replace('"', '\\"').replace("'", "\\'")
    
    return f"""// Escena {index + 1} - Minimal Fallback (AnimaFlow)
var comp = app.project.items.addComp("Scene_{index + 1}", {width}, {height}, 1, {duration}, 30);
comp.layers.addSolid({hex_to_rgb_array(bg_color)}, "Background", {width}, {height}, 1, {duration});

var textLayer = comp.layers.addBoxText([{int(width * 0.9)}, 300], "{safe_text}");
var td = textLayer.property("Source Text").value;
td.resetCharStyle();
td.font = "Arial-BoldMT";
td.fontSize = 68;
td.fauxBold = true;
td.applyFill = true;
td.fillColor = {hex_to_rgb_array(text_color)};
td.justification = ParagraphJustification.CENTER_JUSTIFY;
textLayer.property("Source Text").setValue(td);
textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width // 2}, {int(height * 0.8)}]);

var textOpac = textLayer.property("ADBE Transform Group").property("ADBE Opacity");
textOpac.setValueAtTime(0, 0);
textOpac.setValueAtTime(0.8, 100);
textOpac.setValueAtTime({duration - 0.3}, 100);
textOpac.setValueAtTime({duration}, 0);
"""


def create_ae_full_script(job: JobModel) -> str:
    """
    Crea un script completo de After Effects para todo el job.
    Usa ae_script_code directamente si está disponible, fallback a generación desde ae_metadata.
    """
    if not job.result_spec:
        return "// Error: No hay spec.json para este job"
    
    scenes = job.result_spec.get('scenes', [])
    aspect_ratio = job.result_spec.get('aspect_ratio', job.aspect_ratio or "9:16")
    width, height = get_resolution(aspect_ratio)
    
    script_header = f"""// ============================================
// ANIMAFLOW - After Effects Export Script
// Generado automáticamente
// Aspect Ratio: {aspect_ratio} ({width}x{height})
// ============================================

// Safety wrapper
try {{

// Verificar que hay un proyecto abierto
if (app.project == null) {{
    app.newProject();
}}

"""
    
    script_parts = []
    for i, scene in enumerate(scenes):
        ae_script_code = scene.get('ae_script_code')
        logger.info("Scene %d: ae_script_code=%s (len=%d)", i + 1, 'PRESENT' if ae_script_code else 'MISSING', len(ae_script_code) if ae_script_code else 0)
        if ae_script_code:
            scene_script = f"// Escena {i + 1} - Generado por AnimaFlow\n{ae_script_code}\n"
        else:
            # Try deterministic fallback using TSX
            logger.info("Scene %d: Using deterministic fallback", i + 1)
            generated_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/src/remotion/generated"))
            tsx_path = os.path.join(generated_dir, f"Scene_{job.id}_{i}.tsx")

            if os.path.exists(tsx_path):
                try:
                    from app.modules.parsers.tsx.components import parse_components_from_tsx
                    from app.modules.ae_export.deterministic.components_generator import generate_component_script
                    
                    with open(tsx_path, 'r', encoding='utf-8') as f:
                        tsx_code = f.read()

                    components = parse_components_from_tsx(tsx_code)
                    
                    if components:
                        logger.info("Scene %d: Found components %s", i + 1, list(components.keys()))
                        scene_script = generate_component_script(
                            components=components,
                            text=scene.get('text', ''),
                            duration=scene.get('duration_seconds', 6),
                            width=width,
                            height=height,
                            fps=30,
                        )
                        scene_script = f"// Escena {i + 1} - Generado por AnimaFlow (Components Fallback)\n{scene_script}\n"
                        logger.info("Scene %d: Components fallback OK (len=%d)", i + 1, len(scene_script))
                    else:
                        logger.info("Scene %d: No components found, falling back to SVG parser", i + 1)
                        from app.modules.parsers.svg.extractor import parse_svg_from_tsx
                        from app.modules.parsers.tsx.analyzer import analyze_tsx_for_ae
                        from app.modules.ae_export.deterministic.generator import generate_deterministic_script
    
                        svg_elements = parse_svg_from_tsx(tsx_code)
                        enriched = analyze_tsx_for_ae(tsx_code, width, height, 30)
                        bg_color = scene.get('remotion_props', {}).get('backgroundColor', '#0f172a')
                        txt_color = scene.get('remotion_props', {}).get('textColor', '#38bdf8')
    
                        scene_script = generate_deterministic_script(
                            svg_elements=svg_elements,
                            enriched=enriched,
                            text=scene.get('text', ''),
                            duration=scene.get('duration_seconds', 6),
                            bg_color=bg_color,
                            text_color=txt_color,
                            width=width,
                            height=height,
                            fps=30,
                        )
                        scene_script = f"// Escena {i + 1} - Generado por AnimaFlow (Deterministic SVG Fallback)\n{scene_script}\n"
                        logger.info("Scene %d: Deterministic SVG fallback OK (len=%d)", i + 1, len(scene_script))
                except (ValueError, KeyError, OSError) as fallback_e:
                    logger.error("Scene %d: Deterministic fallback failed: %s", i + 1, fallback_e)
                    # Last resort: minimal script with just text + background
                    scene_script = generate_minimal_fallback(scene, i, width, height)
                except Exception as fallback_e:
                    # Fallback: use minimal fallback on any unexpected error
                    logger.exception("Scene %d: Deterministic fallback failed: %s", i + 1, fallback_e)
                    # Last resort: minimal script with just text + background
                    scene_script = generate_minimal_fallback(scene, i, width, height)
            else:
                logger.info("Scene %d: No TSX found, using minimal fallback", i + 1)
                scene_script = generate_minimal_fallback(scene, i, width, height)
        script_parts.append(scene_script)
    
    script_footer = """
// ============================================
// FIN DEL SCRIPT
// ============================================

} catch (e) {
    alert("AnimaFlow Script Error: " + e.message + "\\nLine: " + $.line);
}
"""
    
    return script_header + "\n".join(script_parts) + script_footer
