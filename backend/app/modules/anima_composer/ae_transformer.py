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
from app.services.layout_solver import solve_layout


# ---------------------------------------------------------------------------
# LayerStyle → After Effects properties
# ---------------------------------------------------------------------------

def _style_to_ae(style: dict | None) -> dict:
    """Convert LayerStyle dict to After Effects JSX properties."""
    if not style:
        return {}

    ae_props = {}

    # Borders
    if style.get("borderWidth"):
        ae_props["strokeWidth"] = style["borderWidth"]
    if style.get("borderColor"):
        ae_props["strokeColor"] = style["borderColor"]
    if style.get("borderRadius"):
        ae_props["roundedCorner"] = style["borderRadius"]

    # Effects
    if style.get("boxShadow"):
        shadow = style["boxShadow"]
        ae_props["dropShadow"] = {
            "x": shadow.get("x", 0),
            "y": shadow.get("y", 4),
            "blur": shadow.get("blur", 12),
            "color": shadow.get("color", "rgba(0,0,0,0.3)"),
        }
    if style.get("opacity") is not None:
        ae_props["opacity"] = style["opacity"] * 100  # AE uses 0-100
    if style.get("blur"):
        ae_props["fastBlur"] = style["blur"]
    if style.get("backdropBlur"):
        ae_props["compoundBlur"] = style["backdropBlur"]

    # Filters
    if style.get("brightness"):
        ae_props["brightness"] = style["brightness"]
    if style.get("contrast"):
        ae_props["contrast"] = style["contrast"]
    if style.get("saturate"):
        ae_props["saturation"] = style["saturate"]
    if style.get("grayscale"):
        ae_props["tint"] = {"blackColor": [128, 128, 128], "whiteColor": [128, 128, 128]}
    if style.get("hueRotate"):
        ae_props["hueShift"] = style["hueRotate"]
    if style.get("invert"):
        ae_props["invert"] = True

    # Transforms
    if style.get("rotate"):
        ae_props["rotation"] = style["rotate"]
    if style.get("scale"):
        s = style["scale"]
        ae_props["scale"] = [s, s] if isinstance(s, (int, float)) else [s[0] * 100, s[1] * 100]
    if style.get("transformOrigin"):
        ae_props["anchorPoint"] = style["transformOrigin"]

    # Typography
    if style.get("lineHeight"):
        ae_props["leading"] = style["lineHeight"]
    if style.get("textShadow"):
        ts = style["textShadow"]
        ae_props["textDropShadow"] = {
            "x": ts.get("x", 0),
            "y": ts.get("y", 0),
            "blur": ts.get("blur", 4),
            "color": ts.get("color", "rgba(0,0,0,0.5)"),
        }
    if style.get("textDecoration") == "underline":
        ae_props["underline"] = True

    # Layout
    if style.get("overflow") == "hidden":
        ae_props["trackMatte"] = "alpha"

    # Transitions
    if style.get("transition_duration"):
        ae_props["transitionDuration"] = style["transition_duration"]
    if style.get("transition_easing"):
        easing_map = {
            "ease-out": "Easy Ease Out",
            "ease-in-out": "Easy Ease",
            "spring": "Exponential Scale",
        }
        ae_props["transitionEasing"] = easing_map.get(style["transition_easing"], "Linear")
    if style.get("transition_spring"):
        ae_props["transitionSpring"] = style["transition_spring"]

    return ae_props


# ---------------------------------------------------------------------------
# Component-specific AE mappings
# ---------------------------------------------------------------------------

def _component_to_ae(component_name: str, layer: dict) -> str | None:
    """Generate AE JSX code for specific components."""
    
    if component_name == "StyleBarChart":
        data = layer.get("data", [])
        variant = layer.get("variant", "vertical")
        max_val = max((d.get("value", 0) for d in data), default=1)
        
        jsx_lines = []
        if variant == "vertical":
            for i, bar in enumerate(data):
                color = bar.get("color", "#00FFAB")
                height = int((bar["value"] / max_val) * 200)
                jsx_lines.append(f'// Bar {i}: {bar["label"]} = {bar["value"]}')
                jsx_lines.append(f'var bar{i} = comp.layers.addShape();')
                jsx_lines.append(f'bar{i}.name = "Bar_{bar["label"]}";')
                jsx_lines.append(f'var rect{i} = bar{i}.property("ADBE Vector Shape - Group").setValue(createRectPath(0, 0, 40, {height}));')
                jsx_lines.append(f'bar{i}.property("ADBE Vector Fill Color").setValue({hex_to_ae_array(color)});')
        return "\n".join(jsx_lines)
    
    if component_name == "StylePieChart":
        data = layer.get("data", [])
        total = sum(d.get("value", 0) for d in data)
        
        jsx_lines = []
        cumulative = 0
        for i, slice_data in enumerate(data):
            color = slice_data.get("color", "#00FFAB")
            percent = slice_data["value"] / total
            start_angle = cumulative * 360
            cumulative += percent
            end_angle = cumulative * 360
            jsx_lines.append(f'// Slice {i}: {slice_data["label"]} = {slice_data["value"]}%')
            jsx_lines.append(f'var slice{i} = comp.layers.addShape();')
            jsx_lines.append(f'slice{i}.name = "Slice_{slice_data["label"]}";')
            jsx_lines.append(f'// Ellipse from {start_angle}° to {end_angle}°')
            jsx_lines.append(f'slice{i}.property("ADBE Vector Fill Color").setValue({hex_to_ae_array(color)});')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleLineChart":
        data = layer.get("data", [])
        line_color = layer.get("lineColor", "#00FFAB")
        
        jsx_lines = [f'// Line Chart with {len(data)} points']
        jsx_lines.append(f'var lineLayer = comp.layers.addShape();')
        jsx_lines.append(f'lineLayer.name = "LineChart";')
        jsx_lines.append(f'lineLayer.property("ADBE Vector Stroke Color").setValue({hex_to_ae_array(line_color)});')
        jsx_lines.append(f'lineLayer.property("ADBE Vector Stroke Width").setValue(3);')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleVideoPlayer":
        src = layer.get("src", "")
        jsx_lines = [f'// Video Player: {src}']
        jsx_lines.append(f'var footageItem = app.project.importFileWithSequence(new ImportOptions(new File("{src}")));')
        jsx_lines.append(f'var videoLayer = comp.layers.add(footageItem);')
        jsx_lines.append(f'videoLayer.name = "VideoPlayer";')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleWatermark":
        opacity = layer.get("opacity", 0.3) * 100
        jsx_lines = [f'// Watermark']
        jsx_lines.append(f'var wmLayer = comp.layers.addShape();')
        jsx_lines.append(f'wmLayer.name = "Watermark";')
        jsx_lines.append(f'wmLayer.property("ADBE Vector Fill Color").setValue([1, 1, 1]);')
        jsx_lines.append(f'wmLayer.property("ADBE Transform Group").property("ADBE Opacity").setValue({opacity});')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleCallout":
        text = layer.get("text", "")
        direction = layer.get("direction", "right")
        jsx_lines = [f'// Callout: {text}']
        jsx_lines.append(f'var calloutLayer = comp.layers.addShape();')
        jsx_lines.append(f'calloutLayer.name = "Callout";')
        jsx_lines.append(f'var textLayer = comp.layers.addText("{text}");')
        jsx_lines.append(f'textLayer.name = "CalloutText";')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleAnimateNumber":
        value = layer.get("value", 100)
        prefix = layer.get("prefix", "")
        suffix = layer.get("suffix", "")
        format_type = layer.get("format", "number")
        jsx_lines = [f'// Animated Number: {value}']
        jsx_lines.append(f'var numLayer = comp.layers.addText("{prefix}{value}{suffix}");')
        jsx_lines.append(f'numLayer.name = "AnimateNumber";')
        jsx_lines.append(f'// Animate sourceText from 0 to {value} over frames')
        jsx_lines.append(f'var numProp = numLayer.property("Source Text");')
        jsx_lines.append(f'numProp.setValueAtTime(0, "{prefix}0{suffix}");')
        jsx_lines.append(f'numProp.setValueAtTime(2, "{prefix}{value}{suffix}");')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleScrambleText":
        text = layer.get("text", "ACCESS GRANTED")
        jsx_lines = [f'// Scramble Text: {text}']
        jsx_lines.append(f'var scrambleLayer = comp.layers.addText("{text}");')
        jsx_lines.append(f'scrambleLayer.name = "ScrambleText";')
        jsx_lines.append(f'// Animate sourceText with scramble effect')
        jsx_lines.append(f'var scrambleProp = scrambleLayer.property("Source Text");')
        jsx_lines.append(f'scrambleProp.setValueAtTime(0, {"#" * len(text)});')
        jsx_lines.append(f'scrambleProp.setValueAtTime(1.5, "{text}");')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleTicker":
        text = layer.get("text", "Breaking News")
        jsx_lines = [f'// Ticker: {text}']
        jsx_lines.append(f'var tickerLayer = comp.layers.addText("{text}");')
        jsx_lines.append(f'tickerLayer.name = "Ticker";')
        jsx_lines.append(f'// Animate position from right to left')
        jsx_lines.append(f'var posProp = tickerLayer.property("Transform").property("Position");')
        jsx_lines.append(f'posProp.setValueAtTime(0, [1920, 1800]);')
        jsx_lines.append(f'posProp.setValueAtTime(5, [-1000, 1800]);')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleSimulatedHover":
        text = layer.get("text", "Button")
        hover_frame = layer.get("hoverFrame", 60)
        jsx_lines = [f'// Simulated Hover: {text}']
        jsx_lines.append(f'var hoverLayer = comp.layers.addShape();')
        jsx_lines.append(f'hoverLayer.name = "SimulatedHover";')
        jsx_lines.append(f'var textLayer = comp.layers.addText("{text}");')
        jsx_lines.append(f'textLayer.name = "HoverText";')
        jsx_lines.append(f'// Scale animation at frame {hover_frame / 30:.1f}s')
        jsx_lines.append(f'var scaleProp = hoverLayer.property("Transform").property("Scale");')
        jsx_lines.append(f'scaleProp.setValueAtTime({hover_frame / 30 - 0.25}, [100, 100]);')
        jsx_lines.append(f'scaleProp.setValueAtTime({hover_frame / 30}, [105, 105]);')
        jsx_lines.append(f'scaleProp.setValueAtTime({hover_frame / 30 + 0.25}, [100, 100]);')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleFakeScroll":
        items = layer.get("items", [])
        jsx_lines = [f'// Fake Scroll with {len(items)} items']
        jsx_lines.append(f'var scrollComp = comp.layers.addShape();')
        jsx_lines.append(f'scrollComp.name = "FakeScroll";')
        for i, item in enumerate(items):
            jsx_lines.append(f'var item{i} = comp.layers.addText("{item.get("content", "")}");')
            jsx_lines.append(f'item{i}.name = "ScrollItem_{i}";')
            jsx_lines.append(f'// Position keyframes for scroll animation')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleCursor":
        points = layer.get("points", [])
        jsx_lines = [f'// Cursor with {len(points)} points']
        jsx_lines.append(f'var cursorLayer = comp.layers.addShape();')
        jsx_lines.append(f'cursorLayer.name = "Cursor";')
        jsx_lines.append(f'var posProp = cursorLayer.property("Transform").property("Position");')
        for i, point in enumerate(points):
            jsx_lines.append(f'posProp.setValueAtTime({i * 1}, [{point.get("x", 0)}, {point.get("y", 0)}]);')
            if point.get("click"):
                jsx_lines.append(f'// Click animation at point {i}')
                jsx_lines.append(f'var scaleProp = cursorLayer.property("Transform").property("Scale");')
                jsx_lines.append(f'scaleProp.setValueAtTime({i * 1}, [100, 100]);')
                jsx_lines.append(f'scaleProp.setValueAtTime({i * 1 + 0.15}, [70, 70]);')
                jsx_lines.append(f'scaleProp.setValueAtTime({i * 1 + 0.3}, [100, 100]);')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleBarRace":
        data = layer.get("data", [])
        jsx_lines = [f'// Bar Race with {len(data)} items']
        for i, bar in enumerate(data):
            color = bar.get("color", "#00FFAB")
            width = int((bar["value"] / max((d.get("value", 1) for d in data), default=1)) * 400)
            jsx_lines.append(f'var bar{i} = comp.layers.addShape();')
            jsx_lines.append(f'bar{i}.name = "BarRace_{bar["label"]}";')
            jsx_lines.append(f'var rect{i} = bar{i}.property("ADBE Vector Shape - Group").setValue(createRectPath(0, 0, {width}, 32));')
            jsx_lines.append(f'bar{i}.property("ADBE Vector Fill Color").setValue({hex_to_ae_array(color)});')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleFunnelChart":
        data = layer.get("data", [])
        max_val = data[0].get("value", 1) if data else 1
        jsx_lines = [f'// Funnel Chart with {len(data)} stages']
        for i, stage in enumerate(data):
            color = stage.get("color", "#00FFAB")
            width_pct = stage["value"] / max_val
            jsx_lines.append(f'var funnel{i} = comp.layers.addShape();')
            jsx_lines.append(f'funnel{i}.name = "Funnel_{stage["label"]}";')
            jsx_lines.append(f'// Width: {width_pct * 100:.0f}% of max')
            jsx_lines.append(f'funnel{i}.property("ADBE Vector Fill Color").setValue({hex_to_ae_array(color)});')
        return "\n".join(jsx_lines)
    
    if component_name == "StyleRadarChart":
        data = layer.get("data", [])
        line_color = layer.get("lineColor", "#00FFAB")
        jsx_lines = [f'// Radar Chart with {len(data)} axes']
        jsx_lines.append(f'var radarLayer = comp.layers.addShape();')
        jsx_lines.append(f'radarLayer.name = "RadarChart";')
        jsx_lines.append(f'radarLayer.property("ADBE Vector Stroke Color").setValue({hex_to_ae_array(line_color)});')
        jsx_lines.append(f'radarLayer.property("ADBE Vector Fill Color").setValue([0, 1, 0.67, 0.15]);')
        jsx_lines.append(f'// {len(data)} axes with values: {", ".join(f"{d["label"]}:{d["value"]}" for d in data)}')
        return "\n".join(jsx_lines)
    
    return None


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

    # Extract style and convert to AE props
    layer_style = layer.get("style", {})
    ae_style_props = _style_to_ae(layer_style)

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
        lines.append(f"// Group: {lid} ({len(children)} children)")
        # If this group has solved coordinates, add a comment for AE organization
        if "x" in layer and "y" in layer:
            lines.append(f"// Group bounds: x={layer['x']}, y={layer['y']}, w={layer.get('width', 'auto')}, h={layer.get('height', 'auto')}")
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

    # Solve layout to get absolute coordinates
    solved_spec = solve_layout(spec, width, height)
    
    # Layers
    layers = solved_spec.get("layers", [])
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
