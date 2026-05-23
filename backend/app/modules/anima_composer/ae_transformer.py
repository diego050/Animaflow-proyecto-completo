"""
Transformador deterministico: JSON AnimaComposer → ExtendScript de After Effects.
Sin LLM. Sin AST. Solo mapeo 1:1 de tipos JSON a capas AE.

Uso:
    from app.modules.anima_composer import anima_composer_to_aescript

    spec = {
        "background": {"type": "solid", "colors": ["#1a1a2e"]},
        "layers": [
            {"type": "text", "text": "Hola Mundo", "fontSize": 72, "fill": "#ffffff", "x": 540, "y": 960},
            {"type": "rect", "width": 200, "height": 100, "fill": "#e94560", "x": 540, "y": 1080},
        ],
    }
    script = anima_composer_to_aescript(spec, text="Hola Mundo")
"""
from __future__ import annotations

import json
from typing import Any

from .utils import hex_to_ae_array, hex_to_rgb


# ---------------------------------------------------------------------------
# Resolucion de valores animados
# ---------------------------------------------------------------------------

def resolve_anim_value(value: Any, fps: int = 30) -> tuple[bool, str]:
    """
    Resuelve AnimValue a propiedades AE.

    Si es numero → valor estatico.
    Si es objeto con from/to → keyframes animados.

    Returns:
        (is_animated: bool, code: str)
    """
    if isinstance(value, (int, float)):
        return False, str(value)

    if isinstance(value, dict) and "from" in value and "to" in value:
        d = value
        duration = d.get("duration", 30)          # frames
        delay = d.get("delay", 0)                 # frames
        easing = d.get("easing", "linear")

        time_a = delay / fps
        time_b = (delay + duration) / fps

        keyframes = [
            f"  .setValueAtTime({time_a}, {d['from']})",
            f"  .setValueAtTime({time_b}, {d['to']})",
        ]

        # Easing aproximado con KeyframeEase(influence, speed)
        easing_map = {
            "linear":    "[new KeyframeEase(0, 0)], [new KeyframeEase(0, 0)]",
            "ease-in":   "[new KeyframeEase(33, 0)], [new KeyframeEase(33, 0)]",
            "ease-out":  "[new KeyframeEase(10, 0)], [new KeyframeEase(50, 0)]",
            "ease-in-out": "[new KeyframeEase(33, 0)], [new KeyframeEase(33, 0)]",
            "spring":    "[new KeyframeEase(50, 0)], [new KeyframeEase(10, 0)]",
        }
        ae_easing = easing_map.get(easing, easing_map["linear"])
        keyframes.append(f"  .setTemporalEaseAtKey(1, {ae_easing});")

        return True, "\n".join(keyframes)

    return False, "0"


# ---------------------------------------------------------------------------
# Background
# ---------------------------------------------------------------------------

def generate_ae_background(
    bg: dict,
    width: int,
    height: int,
    duration: float,
) -> list[str]:
    """Genera codigo AE para el fondo de la composicion."""
    lines: list[str] = []
    bg_type = bg.get("type", "solid")
    colors = bg.get("colors", ["#000000"])

    if bg_type == "solid":
        color = colors[0] if colors else "#000000"
        lines.append(
            f'var bgLayer = comp.layers.addSolid('
            f'{hex_to_ae_array(color)}, "Background", '
            f'{width}, {height}, 1, {duration});'
        )
        lines.append("bgLayer.moveToBeginning();")

    elif bg_type in ("linear-gradient", "radial-gradient"):
        # AE no soporta gradientes nativos en solidos.
        # Simulamos con un shape layer + blur.
        main_color = colors[0] if colors else "#000000"
        lines.append(
            f'var bgLayer = comp.layers.addSolid('
            f'{hex_to_ae_array(main_color)}, "Background", '
            f'{width}, {height}, 1, {duration});'
        )
        lines.append("bgLayer.moveToBeginning();")

        if len(colors) > 1:
            angle = bg.get("angle", 0)
            center = bg.get("center", [width // 2, height // 2])
            lines.append("// Gradient simulation layer")
            lines.append("var gradientLayer = comp.layers.addShape();")
            lines.append('gradientLayer.name = "Gradient_Accent";')
            lines.append(
                'var gGroup = gradientLayer.property("ADBE Root Vectors Group")'
                '.addProperty("ADBE Vector Group");'
            )
            lines.append(
                'var gEllipse = gGroup.property("ADBE Vectors Group")'
                '.addProperty("ADBE Vector Shape - Ellipse");'
            )
            lines.append(
                f'gEllipse.property("ADBE Vector Ellipse Size")'
                f'.setValue([{width * 2}, {height * 2}]);'
            )
            lines.append(
                f'gEllipse.property("ADBE Vector Ellipse Position")'
                f'.setValue([{center[0]}, {center[1]}]);'
            )
            lines.append(
                'gGroup.property("ADBE Vectors Group")'
                '.addProperty("ADBE Vector Graphic - Fill")'
                f'.property("ADBE Vector Fill Color")'
                f'.setValue({hex_to_ae_array(colors[1])});'
            )
            lines.append(
                'gradientLayer.property("ADBE Transform Group")'
                '.property("ADBE Opacity").setValue(30);'
            )
            lines.append(
                'gradientLayer.property("ADBE Effect Parade")'
                '.addProperty("ADBE Fast Blur");'
            )
            lines.append(
                'gradientLayer.property("ADBE Effect Parade")'
                '.property(1).property("ADBE Fast Blur-0001").setValue(200);'
            )

    return lines


# ---------------------------------------------------------------------------
# Capas individuales
# ---------------------------------------------------------------------------

def generate_ae_layer(
    layer: dict,
    index: int,
    duration: float,
    width: int,
    height: int,
    fps: int,
    scene_text: str = "",
) -> list[str]:
    """Genera codigo AE para UNA capa del JSON AnimaComposer."""
    lines: list[str] = []
    layer_type = layer.get("type", "")
    lid = layer.get("id", f"Layer_{index}")

    # --- Rectangulo --------------------------------------------------------
    if layer_type == "rect":
        w = layer.get("width", 200)
        h = layer.get("height", 200)
        fill = layer.get("fill", "#ffffff")
        x = layer.get("x", width // 2)
        y = layer.get("y", height // 2)

        lines.append(f"var rect{index} = comp.layers.addShape();")
        lines.append(f'rect{index}.name = "Rect_{lid}";')
        lines.append(
            f'var rGroup{index} = rect{index}.property("ADBE Root Vectors Group")'
            f'.addProperty("ADBE Vector Group");'
        )
        lines.append(
            f'var rRect{index} = rGroup{index}.property("ADBE Vectors Group")'
            f'.addProperty("ADBE Vector Shape - Rect");'
        )
        lines.append(
            f'rRect{index}.property("ADBE Vector Rect Size")'
            f'.setValue([{w}, {h}]);'
        )
        lines.append(
            f'rRect{index}.property("ADBE Vector Rect Position")'
            f'.setValue([0, 0]);'
        )
        lines.append(
            'rGroup{index}.property("ADBE Vectors Group")'
            '.addProperty("ADBE Vector Graphic - Fill")'
            f'.property("ADBE Vector Fill Color")'
            f'.setValue({hex_to_ae_array(fill)});'
        )
        lines.append(
            f'rect{index}.property("ADBE Transform Group")'
            f'.property("ADBE Position").setValue([{x}, {y}]);'
        )

        # Animacion de posicion X
        is_anim_x, anim_code_x = resolve_anim_value(layer.get("x"), fps)
        is_anim_y, anim_code_y = resolve_anim_value(layer.get("y"), fps)
        if is_anim_x or is_anim_y:
            lines.append(
                f'rect{index}.property("ADBE Transform Group")'
                f'.property("ADBE Position");'
            )
            if is_anim_x:
                lines.append(anim_code_x)

        # Opacidad animada
        opacity_val = layer.get("opacity")
        if isinstance(opacity_val, dict):
            lines.append(
                f'rect{index}.property("ADBE Transform Group")'
                f'.property("ADBE Opacity");'
            )
            lines.append(f"  .setValueAtTime(0, 0)")
            lines.append(
                f"  .setValueAtTime({opacity_val.get('duration', 30) / fps}, "
                f"{opacity_val['to'] * 100});"
            )

        # Rotacion animada
        rot_val = layer.get("rotation")
        if isinstance(rot_val, dict):
            lines.append(
                f'rect{index}.property("ADBE Transform Group")'
                f'.property("ADBE Rotate Z");'
            )
            lines.append(f"  .setValueAtTime(0, {rot_val['from']})")
            lines.append(
                f"  .setValueAtTime({rot_val.get('duration', 30) / fps}, "
                f"{rot_val['to']});"
            )

    # --- Circulo / Elipse --------------------------------------------------
    elif layer_type == "circle":
        r = layer.get("r", 50)
        fill = layer.get("fill", "#ffffff")
        x = layer.get("x", width // 2)
        y = layer.get("y", height // 2)

        lines.append(f"var circle{index} = comp.layers.addShape();")
        lines.append(f'circle{index}.name = "Circle_{lid}";')
        lines.append(
            f'var cGroup{index} = circle{index}.property("ADBE Root Vectors Group")'
            f'.addProperty("ADBE Vector Group");'
        )
        lines.append(
            f'var cEllipse{index} = cGroup{index}.property("ADBE Vectors Group")'
            f'.addProperty("ADBE Vector Shape - Ellipse");'
        )
        lines.append(
            f'cEllipse{index}.property("ADBE Vector Ellipse Size")'
            f'.setValue([{r * 2}, {r * 2}]);'
        )
        lines.append(
            'cGroup{index}.property("ADBE Vectors Group")'
            '.addProperty("ADBE Vector Graphic - Fill")'
            f'.property("ADBE Vector Fill Color")'
            f'.setValue({hex_to_ae_array(fill)});'
        )
        lines.append(
            f'circle{index}.property("ADBE Transform Group")'
            f'.property("ADBE Position").setValue([{x}, {y}]);'
        )

        # Opacidad animada
        opacity_val = layer.get("opacity")
        if isinstance(opacity_val, dict):
            lines.append(
                f'circle{index}.property("ADBE Transform Group")'
                f'.property("ADBE Opacity");'
            )
            lines.append(f"  .setValueAtTime(0, 0)")
            lines.append(
                f"  .setValueAtTime({opacity_val.get('duration', 30) / fps}, "
                f"{opacity_val['to'] * 100});"
            )

    # --- Texto -------------------------------------------------------------
    elif layer_type == "text":
        text_content = layer.get("text", "")
        if "{{text}}" in text_content:
            text_content = text_content.replace("{{text}}", scene_text)

        font_size = layer.get("fontSize", 60)
        color = layer.get("fill", "#ffffff")
        x = layer.get("x", width // 2)
        y = layer.get("y", height // 2)

        lines.append(f'var textLayer{index} = comp.layers.addText("{text_content}");')
        lines.append(f'textLayer{index}.name = "Text_{lid}";')
        lines.append(
            f'textLayer{index}.property("ADBE Transform Group")'
            f'.property("ADBE Position").setValue([{x}, {y}]);'
        )
        lines.append(
            f'var textDoc{index} = textLayer{index}.property("ADBE Text Properties")'
            f'.property("ADBE Text Document").value;'
        )
        lines.append(f"textDoc{index}.fontSize = {font_size};")
        lines.append('textDoc{index}.font = "Arial";')
        lines.append(
            f"textDoc{index}.fillColor = {hex_to_ae_array(color)};"
        )
        lines.append(
            f'textLayer{index}.property("ADBE Text Properties")'
            f'.property("ADBE Text Document").setValue(textDoc{index});'
        )

        # Opacidad animada
        opacity_val = layer.get("opacity")
        if isinstance(opacity_val, dict):
            lines.append(
                f'textLayer{index}.property("ADBE Transform Group")'
                f'.property("ADBE Opacity");'
            )
            lines.append(f"  .setValueAtTime(0, 0)")
            lines.append(
                f"  .setValueAtTime({opacity_val.get('duration', 30) / fps}, "
                f"{opacity_val['to'] * 100});"
            )

    # --- Path SVG ----------------------------------------------------------
    elif layer_type == "path":
        path_data = layer.get("pathData", "")
        fill = layer.get("fill", "none")
        stroke = layer.get("stroke", "#ffffff")
        stroke_width = layer.get("strokeWidth", 2)
        x = layer.get("x", width // 2)
        y = layer.get("y", height // 2)

        lines.append(f"var path{index} = comp.layers.addShape();")
        lines.append(f'path{index}.name = "Path_{lid}";')
        lines.append(
            f'var pGroup{index} = path{index}.property("ADBE Root Vectors Group")'
            f'.addProperty("ADBE Vector Group");'
        )
        # SVG path → AE path es complejo; guardamos como referencia
        lines.append(f"// SVG Path: {path_data[:120]}...")
        lines.append(
            "// ATENCION: AE no soporta import directo de SVG paths. "
            "Se necesita convertir manualmente o usar un script externo."
        )
        lines.append("// Temporal: rectangulo como placeholder")
        lines.append(
            f'var pRect{index} = pGroup{index}.property("ADBE Vectors Group")'
            f'.addProperty("ADBE Vector Shape - Rect");'
        )
        lines.append(
            f'pRect{index}.property("ADBE Vector Rect Size")'
            f'.setValue([100, 100]);'
        )
        lines.append(
            'pGroup{index}.property("ADBE Vectors Group")'
            '.addProperty("ADBE Vector Graphic - Fill")'
            f'.property("ADBE Vector Fill Color")'
            f'.setValue({hex_to_ae_array(fill) if fill != "none" else "[0,0,0,0]"});'
        )
        lines.append(
            'pGroup{index}.property("ADBE Vectors Group")'
            '.addProperty("ADBE Vector Graphic - Stroke")'
            f'.property("ADBE Vector Stroke Color")'
            f'.setValue({hex_to_ae_array(stroke)});'
        )
        lines.append(
            f'pGroup{index}.property("ADBE Vectors Group")'
            f'.property("ADBE Vector Stroke Width")'
            f'.setValue({stroke_width});'
        )
        lines.append(
            f'path{index}.property("ADBE Transform Group")'
            f'.property("ADBE Position").setValue([{x}, {y}]);'
        )

    # --- Imagen ------------------------------------------------------------
    elif layer_type == "image":
        src = layer.get("src", "")
        w = layer.get("width", 300)
        h = layer.get("height", 300)
        x = layer.get("x", width // 2)
        y = layer.get("y", height // 2)

        lines.append(f"// Image layer: {src}")
        lines.append(
            "// ATENCION: AE no soporta URLs externas directamente. "
            "Se necesita descargar la imagen primero."
        )
        lines.append(
            f'var imgLayer{index} = comp.layers.addSolid('
            f'{hex_to_ae_array("#cccccc")}, "Image_{lid}", '
            f'{w}, {h}, 1, {duration});'
        )
        lines.append(
            f'imgLayer{index}.property("ADBE Transform Group")'
            f'.property("ADBE Position").setValue([{x}, {y}]);'
        )
        lines.append(
            f"// INSTRUCCION MANUAL: Reemplazar el solid con la imagen: {src}"
        )

    # --- Grupo (pre-composicion) -------------------------------------------
    elif layer_type == "group":
        children = layer.get("children", [])
        # Los grupos en AE se representan como capas anidadas (sin pre-comp)
        lines.append(f"// Group: {lid} ({len(children)} children)")
        lines.append(
            "// Los grupos en AE se representan como capas con nombres similares, "
            "no como pre-composiciones."
        )
        for ci, child in enumerate(children):
            # Indice compuesto para evitar colision de nombres de variable
            child_code = generate_ae_layer(
                child, int(f"{index}{ci}"), duration, width, height, fps, scene_text
            )
            lines.extend("  " + line for line in child_code)

    # --- Particulas --------------------------------------------------------
    elif layer_type == "particles":
        count = layer.get("count", 20)
        shape = layer.get("shape", "circle")
        spread = layer.get("spread", 200)
        colors = layer.get("colors", ["#ffffff"])
        x = layer.get("x", width // 2)
        y = layer.get("y", height // 2)

        lines.append(f"// Particles: {count} {shape}s spread={spread}")
        lines.append("// En AE se generan shape layers individuales")

        # Limitar a 10 particulas para no saturar el script
        particle_limit = min(count, 10)
        for pi in range(particle_limit):
            color = colors[pi % len(colors)]
            px = x + (pi - count / 2) * (spread / count) * 2
            py = y + ((pi * 7) % spread) - spread / 2

            lines.append(f"var p{index}_{pi} = comp.layers.addShape();")
            lines.append(f'p{index}_{pi}.name = "Particle_{lid}_{pi}";')

            if shape == "circle":
                lines.append(
                    f'var pg{index}_{pi} = p{index}_{pi}.property("ADBE Root Vectors Group")'
                    f'.addProperty("ADBE Vector Group");'
                )
                lines.append(
                    f'var pe{index}_{pi} = pg{index}_{pi}.property("ADBE Vectors Group")'
                    f'.addProperty("ADBE Vector Shape - Ellipse");'
                )
                lines.append(
                    f'pe{index}_{pi}.property("ADBE Vector Ellipse Size")'
                    f'.setValue([10, 10]);'
                )
            else:
                # Si no es circulo, rectangulo por defecto
                lines.append(
                    f'var pg{index}_{pi} = p{index}_{pi}.property("ADBE Root Vectors Group")'
                    f'.addProperty("ADBE Vector Group");'
                )
                lines.append(
                    f'var pr{index}_{pi} = pg{index}_{pi}.property("ADBE Vectors Group")'
                    f'.addProperty("ADBE Vector Shape - Rect");'
                )
                lines.append(
                    f'pr{index}_{pi}.property("ADBE Vector Rect Size")'
                    f'.setValue([10, 10]);'
                )

            lines.append(
                f'pg{index}_{pi}.property("ADBE Vectors Group")'
                f'.addProperty("ADBE Vector Graphic - Fill")'
                f'.property("ADBE Vector Fill Color")'
                f'.setValue({hex_to_ae_array(color)});'
            )
            lines.append(
                f'p{index}_{pi}.property("ADBE Transform Group")'
                f'.property("ADBE Position").setValue([{px:.1f}, {py:.1f}]);'
            )

    return lines


# ---------------------------------------------------------------------------
# Exportador principal
# ---------------------------------------------------------------------------

def anima_composer_to_aescript(
    spec: dict,
    text: str = "",
    duration: float = 5.0,
    width: int = 1080,
    height: int = 1920,
    fps: int = 30,
) -> str:
    """
    Convierte un JSON AnimaComposer completo a ExtendScript de After Effects.

    Parametros:
        spec: Diccionario con la escena (background + layers).
        text: Texto opcional para reemplazar {{text}} en capas de tipo 'text'.
        duration: Duracion en segundos de la composicion.
        width: Ancho de la composicion en pixeles.
        height: Alto de la composicion en pixeles.
        fps: Frames por segundo (por defecto 30).

    Returns:
        String con el codigo .jsx listo para ejecutar en Adobe After Effects.
    """
    lines: list[str] = []

    # Header
    lines.append("// ============================================================")
    lines.append("// AnimaFlow - AnimaComposer Export")
    lines.append("// Generated deterministically from AnimaComposer JSON")
    lines.append("// Execute in Adobe After Effects via File > Scripts > Run Script")
    lines.append("// ============================================================")
    lines.append("")
    lines.append(
        f'var comp = app.project.items.addComp('
        f'"Scene", {width}, {height}, 1, {duration}, {fps});'
    )
    lines.append("")

    # Background
    bg = spec.get("background", {"type": "solid", "colors": ["#000000"]})
    bg_lines = generate_ae_background(bg, width, height, duration)
    lines.extend(bg_lines)
    lines.append("")

    # Layers
    layers = spec.get("layers", [])
    for i, layer in enumerate(layers):
        layer_lines = generate_ae_layer(
            layer, i, duration, width, height, fps, text
        )
        lines.extend(layer_lines)
        lines.append("")

    # Footer
    lines.append("// ============================================================")
    lines.append("// End of generated script")
    lines.append("// ============================================================")

    return "\n".join(lines)
