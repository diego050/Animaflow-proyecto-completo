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


# Transiciones que se representan como un velo/sólido (no mezclan 2 escenas).
# Las "direccionales" además barren la pantalla con un sólido.
_DIRECTIONAL_TRANSITIONS = {"WipeTransition", "SlideWipe", "WhipPanTransition"}
# Transiciones de 2 escenas reales (mezcla por opacidad/escala/desplazamiento de
# las precomps): la saliente se duplica y se transforma sobre la entrante.
_BLEND_TRANSITIONS = {"CrossDissolve", "ZoomThroughTransition", "MorphTransition", "SpatialPush"}


def _param_float(params: dict, key: str, default: float) -> float:
    """Lee un float de transition_params con fallback seguro."""
    if isinstance(params, dict):
        try:
            return float(params.get(key, default))
        except (TypeError, ValueError):
            return default
    return default


def _transition_layer_code(i: int, ttype: str, color: str, params: dict,
                           out_offset: float, boundary: float, T: float,
                           width: int, height: int) -> list:
    """Genera las capas AE de una transición en la comp maestra, sobre el corte
    entre la escena i (saliente) y la i+1 (entrante)."""
    lines = [f"// --- Transición {i + 1}->{i + 2}: {ttype} ---"]

    if ttype in _BLEND_TRANSITIONS:
        # Mezcla real: duplicamos la escena SALIENTE alineada a su timeline,
        # extendida (congela el último frame) y transformada ENCIMA de la entrante.
        #   ZoomThrough → zoom-in | Morph → zoom-out | SpatialPush → desliza fuera.
        target = 1.0
        fade = True
        dx = 0.0
        dy = 0.0
        if ttype == "ZoomThroughTransition":
            target = _param_float(params, "targetScale", 2.5)
        elif ttype == "MorphTransition":
            target = _param_float(params, "scaleTo", 0.5)
        elif ttype == "SpatialPush":
            fade = False  # se desliza fuera, opaca
            direction = params.get("direction", "left") if isinstance(params, dict) else "left"
            if direction == "right":
                dx = width
            elif direction == "up":
                dy = -height
            elif direction == "down":
                dy = height
            else:
                dx = -width  # left (default)
        zoom = abs(target - 1.0) > 1e-6
        slide = (dx != 0.0 or dy != 0.0)
        bt = boundary + T
        lines += [
            f"if (__afScenes[{i}]) {{",
            f"  var td{i} = master.layers.add(__afScenes[{i}]);",
            f"  td{i}.startTime = {out_offset:.3f};",
            f"  td{i}.timeRemapEnabled = true;  // congela el último frame al extender",
            f"  td{i}.outPoint = {bt:.3f};",
            f'  td{i}.name = "Transition {ttype}";',
        ]
        if fade:
            lines += [
                f'  var td{i}o = td{i}.property("ADBE Transform Group").property("ADBE Opacity");',
                f"  td{i}o.setValueAtTime({boundary:.3f}, 100);",
                f"  td{i}o.setValueAtTime({bt:.3f}, 0);",
            ]
        if zoom:
            lines += [
                f'  var td{i}s = td{i}.property("ADBE Transform Group").property("ADBE Scale");',
                f"  td{i}s.setValueAtTime({boundary:.3f}, [100, 100]);",
                f"  td{i}s.setValueAtTime({bt:.3f}, [{target * 100:.1f}, {target * 100:.1f}]);",
            ]
        if slide:
            lines += [
                f'  var td{i}p = td{i}.property("ADBE Transform Group").property("ADBE Position");',
                f"  td{i}p.setValueAtTime({boundary:.3f}, [{width / 2:.1f}, {height / 2:.1f}]);",
                f"  td{i}p.setValueAtTime({bt:.3f}, [{width / 2 + dx:.1f}, {height / 2 + dy:.1f}]);",
            ]
        lines.append("}")
        return lines

    half = T / 2.0
    start = max(0.0, boundary - half)
    end = boundary + half

    if ttype == "IrisTransition":
        # Iris: sólido de color con máscara circular (resta) que se cierra y abre.
        rgb = hex_to_rgb_array(color or "#000000")
        cx = width / 2.0
        cy = height / 2.0
        max_r = 0.9 * ((width / 2.0) ** 2 + (height / 2.0) ** 2) ** 0.5
        lines += [
            f'var iv{i} = master.layers.addSolid({rgb}, "Transition IrisTransition", {width}, {height}, 1);',
            f"iv{i}.startTime = {start:.3f};",
            f"iv{i}.inPoint = {start:.3f};",
            f"iv{i}.outPoint = {end:.3f};",
            f'var iv{i}m = iv{i}.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");',
            f"iv{i}m.property(\"ADBE Mask Mode\").setValue(MaskMode.SUBTRACT);",
            f'var iv{i}s = iv{i}m.property("ADBE Mask Shape");',
            f"iv{i}s.setValueAtTime({start:.3f}, __afCircleShape({max_r:.1f}, {cx:.1f}, {cy:.1f}));",
            f"iv{i}s.setValueAtTime({boundary:.3f}, __afCircleShape(1, {cx:.1f}, {cy:.1f}));",
            f"iv{i}s.setValueAtTime({end:.3f}, __afCircleShape({max_r:.1f}, {cx:.1f}, {cy:.1f}));",
        ]
        return lines

    # Velo: sólido de color centrado en el corte.
    rgb = hex_to_rgb_array(color or "#000000")
    lines += [
        f'var tv{i} = master.layers.addSolid({rgb}, "Transition {ttype}", {width}, {height}, 1);',
        f"tv{i}.startTime = {start:.3f};",
        f"tv{i}.inPoint = {start:.3f};",
        f"tv{i}.outPoint = {end:.3f};",
    ]
    if ttype in _DIRECTIONAL_TRANSITIONS:
        # Barrido direccional: el sólido entra, cubre y sale (wipe).
        lines += [
            f'var tv{i}p = tv{i}.property("ADBE Transform Group").property("ADBE Position");',
            f"tv{i}p.setValueAtTime({start:.3f}, [{-width / 2:.1f}, {height / 2:.1f}]);",
            f"tv{i}p.setValueAtTime({boundary:.3f}, [{width / 2:.1f}, {height / 2:.1f}]);",
            f"tv{i}p.setValueAtTime({end:.3f}, [{width * 1.5:.1f}, {height / 2:.1f}]);",
        ]
    else:
        # Velo por opacidad (Fade/Glitch/LightLeak/Gradient/Frosted/Pixelate/Chromatic).
        lines += [
            f'var tv{i}o = tv{i}.property("ADBE Transform Group").property("ADBE Opacity");',
            f"tv{i}o.setValueAtTime({start:.3f}, 0);",
            f"tv{i}o.setValueAtTime({boundary:.3f}, 100);",
            f"tv{i}o.setValueAtTime({end:.3f}, 0);",
        ]
    return lines


def _build_master_timeline(scenes: list, width: int, height: int, fps: int) -> str:
    """Arma la comp maestra: cada escena como precomp en su offset temporal, más
    las capas de transición en cada corte. Reproduce el video completo y editable."""
    durations = [float(s.get("duration_seconds", 6) or 6) for s in scenes]
    offsets = []
    acc = 0.0
    for d in durations:
        offsets.append(acc)
        acc += d
    total = max(acc, 0.1)
    default_t_frames = 18.0  # SCENE_TRANSITION_FRAMES (front), default si el usuario no fija

    lines = [
        "",
        "// ============================================",
        "// COMPOSICIÓN MAESTRA — video completo (escenas + transiciones).",
        "// Cada escena es una precomp colocada en su offset; editable capa por capa.",
        "// ============================================",
        f'var master = app.project.items.addComp("AnimaFlow_Video", {width}, {height}, 1, {total:.3f}, {fps});',
        "var __afL;",
    ]
    for i in range(len(scenes)):
        lines += [
            f"if (__afScenes[{i}]) {{",
            f"  __afL = master.layers.add(__afScenes[{i}]);",
            f"  __afL.startTime = {offsets[i]:.3f};",
            "}",
        ]
    for i in range(len(scenes) - 1):
        out_scene = scenes[i]
        ac = out_scene.get("anima_composer") or {}
        ttype = out_scene.get("transition") or ac.get("transition") or "FadeThroughBlack"
        tcolor = out_scene.get("transition_color") or ac.get("transition_color") or "#000000"
        tparams = out_scene.get("transition_params") or ac.get("transition_params") or {}
        # Duración por corte: la decide el usuario vía transition_params.durationFrames.
        t_frames = default_t_frames
        if isinstance(tparams, dict):
            try:
                df = float(tparams.get("durationFrames", default_t_frames))
                if df > 0:
                    t_frames = df
            except (TypeError, ValueError):
                pass
        T = t_frames / fps
        lines += _transition_layer_code(i, ttype, tcolor, tparams, offsets[i], offsets[i + 1], T, width, height)
    lines += ["", "try { master.openInViewer(); } catch (e) {}", ""]
    return "\n".join(lines)


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
        # Envolvemos cada escena para capturar SU comp (precomp) sin depender del
        # nombre de variable interno: medimos los items del proyecto antes/después.
        script_parts.append(
            f"// ===== Escena {i + 1} (precomp) =====\n"
            f"__afN = app.project.numItems;\n"
            f"{scene_script}\n"
            f"__afScenes[{i}] = __afFindNewComp(__afN);\n"
            f'if (__afScenes[{i}]) {{ __afScenes[{i}].name = "Scene {i + 1}"; }}\n'
        )

    # Helpers + arreglo de precomps (se insertan tras la cabecera).
    master_helpers = (
        "\n// ---- Soporte de timeline maestro ----\n"
        "function __afFindNewComp(startCount) {\n"
        "  for (var k = startCount + 1; k <= app.project.numItems; k++) {\n"
        "    if (app.project.item(k) instanceof CompItem) return app.project.item(k);\n"
        "  }\n"
        "  return null;\n"
        "}\n"
        "// Círculo bezier (radio r centrado en cx,cy) para máscaras (iris).\n"
        "function __afCircleShape(r, cx, cy) {\n"
        "  var k = 0.5522847498 * r;\n"
        "  var s = new Shape();\n"
        "  s.closed = true;\n"
        "  s.vertices = [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]];\n"
        "  s.inTangents = [[-k, 0], [0, -k], [k, 0], [0, k]];\n"
        "  s.outTangents = [[k, 0], [0, k], [-k, 0], [0, -k]];\n"
        "  return s;\n"
        "}\n"
        "var __afScenes = [];\n"
        "var __afN = 0;\n\n"
    )

    master_code = _build_master_timeline(scenes, width, height, 30)

    script_footer = """
// ============================================
// FIN DEL SCRIPT
// ============================================

} catch (e) {
    alert("AnimaFlow Script Error: " + e.message + "\\nLine: " + $.line);
}
"""

    return script_header + master_helpers + "\n".join(script_parts) + "\n" + master_code + script_footer
