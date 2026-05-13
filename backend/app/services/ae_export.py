"""
Servicio de exportación de AnimaFlow a After Effects.

Convierte spec.json → script.jsx + audio/ + spec.json → .zip
"""
import os
import json
import shutil
import tempfile
import zipfile
from typing import Dict, List, Any
from sqlalchemy.orm import Session

from app.db.models import JobModel


def hex_to_rgb_array(hex_color: str) -> str:
    """Convierte color HEX a array RGB normalizado [r, g, b] para AE."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0
        return f"[{r:.3f}, {g:.3f}, {b:.3f}]"
    return "[1, 1, 1]"  # Blanco por defecto


def generate_ae_script(scene: Dict, index: int) -> str:
    """
    Genera código ExtendScript (.jsx) para una escena de After Effects.
    
    Args:
        scene: Diccionario con datos de la escena (ae_metadata)
        index: Índice de la escena
    
    Returns:
        Código JSX para After Effects
    """
    ae_metadata = scene.get('ae_metadata') or {}
    elements = ae_metadata.get('elements', [])
    text_animation = ae_metadata.get('text_animation', 'fade_in')
    audio_layer = ae_metadata.get('audio_layer', {})
    
    script_lines = [
        f"// Escena {index + 1} - Generado por AnimaFlow",
        f'var comp = app.project.items.addComp("AnimaFlow_Scene_{index + 1}", 1920, 1080, 1, {scene.get("duration_seconds", 6) * 30}, 30);',
        "",
        "// ====================================",
        "// ELEMENTOS SVG",
        "// ====================================",
    ]
    
    # Generar elementos
    for elem in elements:
        elem_type = elem.get('type', 'rectangle')
        elem_id = elem.get('id', f'element_{index}')
        
        if elem_type == 'rectangle':
            script_lines.extend(generate_ae_rectangle(elem))
        elif elem_type == 'circle':
            script_lines.extend(generate_ae_circle(elem))
        elif elem_type == 'flash':
            script_lines.extend(generate_ae_flash(elem))
        elif elem_type == 'calendar':
            script_lines.extend(generate_ae_calendar(elem))
        elif elem_type == 'line':
            script_lines.extend(generate_ae_line(elem))
        elif elem_type == 'particle':
            script_lines.extend(generate_ae_particle(elem))
        else:
            script_lines.extend(generate_ae_shape_generic(elem))
    
    # Agregar capa de texto
    script_lines.extend([
        "",
        "// ====================================",
        "// TEXTO",
        "// ====================================",
        f'var textLayer = comp.layers.addText("{scene.get("text", "")}");',
        "textLayer.name = \"Texto_Principal\";",
        f"textLayer.inPoint = 0;",
        f"textLayer.outPoint = {scene.get('duration_seconds', 6)};",
        "",
        "// Animación de texto",
        "var textProp = textLayer.property(\"ADBE Text Properties\");",
        "var textOpacity = textLayer.property(\"ADBE Transform Group\").property(\"ADBE Opacity\");",
    ])
    
    if text_animation == 'letter_by_letter':
        script_lines.extend([
            "textOpacity.setValueAtTime(0, 0);",
            "textOpacity.setValueAtTime(0.5, 100);",
        ])
    elif text_animation == 'scale_emerge':
        script_lines.extend([
            "var textScale = textLayer.property(\"ADBE Transform Group\").property(\"ADBE Scale\");",
            "textScale.setValueAtTime(0, [0, 0]);",
            "textScale.setValueAtTime(0.5, [100, 100]);",
            "textOpacity.setValueAtTime(0, 0);",
            "textOpacity.setValueAtTime(0.3, 100);",
        ])
    else:  # fade_in
        script_lines.extend([
            "textOpacity.setValueAtTime(0, 0);",
            "textOpacity.setValueAtTime(0.5, 100);",
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


def generate_ae_rectangle(elem: Dict) -> List[str]:
    """Genera código para un rectángulo en AE."""
    lines = [
        f"// {elem.get('id', 'rect')} - Rectángulo",
        f'var layer_{elem.get("id", "rect")} = comp.layers.addShape();',
        f'layer_{elem.get("id", "rect")}.name = "{elem.get("id", "rect")}";',
        f'var shapeGroup = layer_{elem.get("id", "rect")}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var rect = shapeGroup.property("ADBE Vector Shape - Group").addProperty("ADBE Vector Shape - Rectangle");',
    ]
    
    size = elem.get('size', [100, 100])
    lines.append(f'rect.property("ADBE Vector Rect Size").setValue([{size[0]}, {size[1]}]);')
    
    if 'position' in elem:
        pos = elem['position']
        lines.append(f'rect.property("ADBE Vector Rect Position").setValue([{pos[0]}, {pos[1]}]);')
    
    # Color con transiciones
    color_keyframes = elem.get('color_keyframes', [])
    if color_keyframes:
        lines.append(f'var fill = shapeGroup.property("ADBE Vector Graphic - Fill").addProperty("ADBE Vector Fill Color");')
        for kf in color_keyframes:
            time = kf.get('time', 0)
            color = kf.get('color', [0.22, 0.74, 0.97, 1])  # RGBA 0-1
            lines.append(f'fill.setValueAtTime({time}, [{color[0]}, {color[1]}, {color[2]}, {color[3]}]);')
    else:
        lines.append(f'var fill = shapeGroup.property("ADBE Vector Graphic - Fill").addProperty("ADBE Vector Fill Color");')
        lines.append(f'fill.setValue([0.22, 0.74, 0.97, 1]);')  # Azul por defecto
    
    # Animación de posición
    position_keyframes = elem.get('position_keyframes', [])
    if position_keyframes:
        lines.append(f'var posProp = layer_{elem.get("id", "rect")}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in position_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [960, 540])
            easing = kf.get('easing', 'linear')
            lines.append(f'posProp.setValueAtTime({time}, [{value[0]}, {value[1]}]);')
    
    # Animación de escala
    scale_keyframes = elem.get('scale_keyframes', [])
    if scale_keyframes:
        lines.append(f'var scaleProp = layer_{elem.get("id", "rect")}.property("ADBE Transform Group").property("ADBE Scale");')
        for kf in scale_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [100, 100])
            lines.append(f'scaleProp.setValueAtTime({time}, [{value[0]}, {value[1]}]);')
    
    # Animación de opacidad
    opacity_keyframes = elem.get('opacity_keyframes', [])
    if opacity_keyframes:
        lines.append(f'var opacityProp = layer_{elem.get("id", "rect")}.property("ADBE Transform Group").property("ADBE Opacity");')
        for kf in opacity_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', 100)
            lines.append(f'opacityProp.setValueAtTime({time}, {value});')
    
    # Efectos (Glow, Drop Shadow, Blur)
    effects = elem.get('effects', [])
    if effects:
        lines.append(f'var effects_{elem.get("id", "rect")} = layer_{elem.get("id", "rect")}.property("ADBE Effect Parade");')
        for effect in effects:
            effect_type = effect.get('type', '')
            if effect_type == 'glow':
                lines.append(f'var glow = effects_{elem.get("id", "rect")}.addProperty("ADBE Glow");')
                lines.append(f'glow.property("ADBE Glow Intensity").setValue({effect.get("intensity", 50)});')
                glow_color = effect.get('color', '#38bdf8')
                lines.append(f'glow.property("ADBE Glow Colors").setValue({hex_to_rgb_array(glow_color)});')
            elif effect_type == 'drop_shadow':
                lines.append(f'var shadow = effects_{elem.get("id", "rect")}.addProperty("ADBE Drop Shadow");')
                lines.append(f'shadow.property("ADBE Drop Shadow Distance").setValue({effect.get("distance", 10)});')
                lines.append(f'shadow.property("ADBE Drop Shadow Opacity").setValue({effect.get("opacity", 50)});')
                shadow_color = effect.get('color', '#000000')
                lines.append(f'shadow.property("ADBE Drop Shadow Color").setValue({hex_to_rgb_array(shadow_color)});')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem.get("id", "rect")}.addProperty("ADBE Fast Blur");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines


def generate_ae_circle(elem: Dict) -> List[str]:
    """Genera código para un círculo en AE."""
    lines = [
        f"// {elem.get('id', 'circle')} - Círculo",
        f'var layer_{elem.get("id", "circle")} = comp.layers.addShape();',
        f'layer_{elem.get("id", "circle")}.name = "{elem.get("id", "circle")}";',
        f'var shapeGroup = layer_{elem.get("id", "circle")}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var ellipse = shapeGroup.property("ADBE Vector Shape - Group").addProperty("ADBE Vector Shape - Ellipse");',
    ]
    
    size = elem.get('size', [50, 50])
    lines.append(f'ellipse.property("ADBE Vector Ellipse Size").setValue([{size[0]}, {size[1]}]);')
    
    if 'position' in elem:
        pos = elem['position']
        lines.append(f'ellipse.property("ADBE Vector Ellipse Position").setValue([{pos[0]}, {pos[1]}]);')
    
    # Color con transiciones
    color_keyframes = elem.get('color_keyframes', [])
    if color_keyframes:
        lines.append(f'var fill = shapeGroup.property("ADBE Vector Graphic - Fill").addProperty("ADBE Vector Fill Color");')
        for kf in color_keyframes:
            time = kf.get('time', 0)
            color = kf.get('color', [0.22, 0.74, 0.97, 1])
            lines.append(f'fill.setValueAtTime({time}, [{color[0]}, {color[1]}, {color[2]}, {color[3]}]);')
    else:
        lines.append(f'var fill = shapeGroup.property("ADBE Vector Graphic - Fill").addProperty("ADBE Vector Fill Color");')
        lines.append(f'fill.setValue([0.22, 0.74, 0.97, 1]);')
    
    # Animación de posición
    position_keyframes = elem.get('position_keyframes', [])
    if position_keyframes:
        lines.append(f'var posProp = layer_{elem.get("id", "circle")}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in position_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [960, 540])
            lines.append(f'posProp.setValueAtTime({time}, [{value[0]}, {value[1]}]);')
    
    # Animación de escala
    scale_keyframes = elem.get('scale_keyframes', [])
    if scale_keyframes:
        lines.append(f'var scaleProp = layer_{elem.get("id", "circle")}.property("ADBE Transform Group").property("ADBE Scale");')
        for kf in scale_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [100, 100])
            lines.append(f'scaleProp.setValueAtTime({time}, [{value[0]}, {value[1]}]);')
    
    # Animación de opacidad
    opacity_keyframes = elem.get('opacity_keyframes', [])
    if opacity_keyframes:
        lines.append(f'var opacityProp = layer_{elem.get("id", "circle")}.property("ADBE Transform Group").property("ADBE Opacity");')
        for kf in opacity_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', 100)
            lines.append(f'opacityProp.setValueAtTime({time}, {value});')
    
    # Efectos
    effects = elem.get('effects', [])
    if effects:
        lines.append(f'var effects_{elem.get("id", "circle")} = layer_{elem.get("id", "circle")}.property("ADBE Effect Parade");')
        for effect in effects:
            effect_type = effect.get('type', '')
            if effect_type == 'glow':
                lines.append(f'var glow = effects_{elem.get("id", "circle")}.addProperty("ADBE Glow");')
                lines.append(f'glow.property("ADBE Glow Intensity").setValue({effect.get("intensity", 50)});')
            elif effect_type == 'drop_shadow':
                lines.append(f'var shadow = effects_{elem.get("id", "circle")}.addProperty("ADBE Drop Shadow");')
                lines.append(f'shadow.property("ADBE Drop Shadow Distance").setValue({effect.get("distance", 10)});')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem.get("id", "circle")}.addProperty("ADBE Fast Blur");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines


def generate_ae_flash(elem: Dict) -> List[str]:
    """Genera código para un destello/flash en AE."""
    flash_color = elem.get('color', '#fbbf24')
    rgb = hex_to_rgb_array(flash_color)
    
    lines = [
        f"// {elem.get('id', 'flash')} - Destello",
        f'var layer_{elem.get("id", "flash")} = comp.layers.addSolid({rgb}, "{elem.get("id", "flash")}", 1920, 1080);',
    ]
    
    # Opacidad para flash (aparece y desaparece rápidamente)
    opacity_keyframes = elem.get('opacity_keyframes', [
        {'time': 2, 'value': 0},
        {'time': 2.1, 'value': 100},
        {'time': 2.3, 'value': 0}
    ])
    
    lines.append(f'var opacityProp = layer_{elem.get("id", "flash")}.property("ADBE Transform Group").property("ADBE Opacity");')
    for kf in opacity_keyframes:
        time = kf.get('time', 0)
        value = kf.get('value', 100)
        lines.append(f'opacityProp.setValueAtTime({time}, {value});')
    
    # Escala para efecto de explosión
    scale_keyframes = elem.get('scale_keyframes', [
        {'time': 2, 'value': [0, 0]},
        {'time': 2.1, 'value': [300, 300]}
    ])
    
    lines.append(f'var scaleProp = layer_{elem.get("id", "flash")}.property("ADBE Transform Group").property("ADBE Scale");')
    for kf in scale_keyframes:
        time = kf.get('time', 0)
        value = kf.get('value', [100, 100])
        lines.append(f'scaleProp.setValueAtTime({time}, [{value[0]}, {value[1]}]);')
    
    # Efectos (glow por defecto para flash)
    effects = elem.get('effects', [])
    if effects:
        lines.append(f'var effects_{elem.get("id", "flash")} = layer_{elem.get("id", "flash")}.property("ADBE Effect Parade");')
        for effect in effects:
            effect_type = effect.get('type', '')
            if effect_type == 'glow':
                lines.append(f'var glow = effects_{elem.get("id", "flash")}.addProperty("ADBE Glow");')
                lines.append(f'glow.property("ADBE Glow Intensity").setValue({effect.get("intensity", 100)});')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem.get("id", "flash")}.addProperty("ADBE Fast Blur");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    else:
        # Glow por defecto para flash
        lines.append(f'var glow = layer_{elem.get("id", "flash")}.property("ADBE Effect Parade").addProperty("ADBE Glow");')
        lines.append(f'glow.property("ADBE Glow Intensity").setValue(100);')
    
    lines.append("")
    return lines


def generate_ae_calendar(elem: Dict) -> List[str]:
    """Genera código para un calendario en AE."""
    lines = [
        f"// {elem.get('id', 'calendar')} - Calendario",
        f'var layer_{elem.get("id", "calendar")} = comp.layers.addShape();',
        f'layer_{elem.get("id", "calendar")}.name = "{elem.get("id", "calendar")}";',
        f'var shapeGroup = layer_{elem.get("id", "calendar")}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var rect = shapeGroup.property("ADBE Vector Shape - Group").addProperty("ADBE Vector Shape - Rectangle");',
        f'rect.property("ADBE Vector Rect Size").setValue([120, 100]);',
        f'rect.property("ADBE Vector Rect Roundness").setValue([8, 8]);',
        f'var fill = shapeGroup.property("ADBE Vector Graphic - Fill").addProperty("ADBE Vector Fill Color");',
        f'fill.setValue([0.22, 0.74, 0.97, 1]);',
    ]
    
    # Animación bounce in (solo si no hay keyframes personalizados)
    position_keyframes = elem.get('position_keyframes', [])
    if position_keyframes:
        lines.append(f'var posProp = layer_{elem.get("id", "calendar")}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in position_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [960, 540])
            lines.append(f'posProp.setValueAtTime({time}, [{value[0]}, {value[1]}]);')
    else:
        lines.append(f'var posProp = layer_{elem.get("id", "calendar")}.property("ADBE Transform Group").property("ADBE Position");')
        lines.append(f'posProp.setValueAtTime(0, [960, 740]);')
        lines.append(f'posProp.setValueAtTime(0.5, [960, 480]);')
        lines.append(f'posProp.setValueAtTime(0.8, [960, 520]);')
        lines.append(f'posProp.setValueAtTime(1.0, [960, 500]);')
    
    opacity_keyframes = elem.get('opacity_keyframes', [])
    if opacity_keyframes:
        lines.append(f'var opacityProp = layer_{elem.get("id", "calendar")}.property("ADBE Transform Group").property("ADBE Opacity");')
        for kf in opacity_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', 100)
            lines.append(f'opacityProp.setValueAtTime({time}, {value});')
    else:
        lines.append(f'var opacityProp = layer_{elem.get("id", "calendar")}.property("ADBE Transform Group").property("ADBE Opacity");')
        lines.append(f'opacityProp.setValueAtTime(0, 0);')
        lines.append(f'opacityProp.setValueAtTime(0.5, 100);')
    
    # Efectos
    effects = elem.get('effects', [])
    if effects:
        lines.append(f'var effects_{elem.get("id", "calendar")} = layer_{elem.get("id", "calendar")}.property("ADBE Effect Parade");')
        for effect in effects:
            effect_type = effect.get('type', '')
            if effect_type == 'glow':
                lines.append(f'var glow = effects_{elem.get("id", "calendar")}.addProperty("ADBE Glow");')
                lines.append(f'glow.property("ADBE Glow Intensity").setValue({effect.get("intensity", 50)});')
            elif effect_type == 'drop_shadow':
                lines.append(f'var shadow = effects_{elem.get("id", "calendar")}.addProperty("ADBE Drop Shadow");')
                lines.append(f'shadow.property("ADBE Drop Shadow Distance").setValue({effect.get("distance", 10)});')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem.get("id", "calendar")}.addProperty("ADBE Fast Blur");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines


def generate_ae_shape_generic(elem: Dict) -> List[str]:
    """Genera código para una forma genérica en AE."""
    elem_type = elem.get('type', 'shape')
    elem_id = elem.get('id', elem_type)
    
    lines = [
        f"// {elem_id} - Forma genérica ({elem_type})",
        f'var layer_{elem_id} = comp.layers.addShape();',
        f'layer_{elem_id}.name = "{elem_id}";',
        f'var shapeGroup = layer_{elem_id}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var fill = shapeGroup.property("ADBE Vector Graphic - Fill").addProperty("ADBE Vector Fill Color");',
        f'fill.setValue([0.22, 0.74, 0.97, 1]);',
    ]
    
    # Keyframes de posición
    position_keyframes = elem.get('position_keyframes', [])
    if position_keyframes:
        lines.append(f'var posProp = layer_{elem_id}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in position_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [960, 540])
            lines.append(f'posProp.setValueAtTime({time}, [{value[0]}, {value[1]}]);')
    
    # Keyframes de escala
    scale_keyframes = elem.get('scale_keyframes', [])
    if scale_keyframes:
        lines.append(f'var scaleProp = layer_{elem_id}.property("ADBE Transform Group").property("ADBE Scale");')
        for kf in scale_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [100, 100])
            lines.append(f'scaleProp.setValueAtTime({time}, [{value[0]}, {value[1]}]);')
    
    # Keyframes de opacidad
    opacity_keyframes = elem.get('opacity_keyframes', [])
    if opacity_keyframes:
        lines.append(f'var opacityProp = layer_{elem_id}.property("ADBE Transform Group").property("ADBE Opacity");')
        for kf in opacity_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', 100)
            lines.append(f'opacityProp.setValueAtTime({time}, {value});')
    
    # Efectos
    effects = elem.get('effects', [])
    if effects:
        lines.append(f'var effects_{elem_id} = layer_{elem_id}.property("ADBE Effect Parade");')
        for effect in effects:
            effect_type = effect.get('type', '')
            if effect_type == 'glow':
                lines.append(f'var glow = effects_{elem_id}.addProperty("ADBE Glow");')
                lines.append(f'glow.property("ADBE Glow Intensity").setValue({effect.get("intensity", 50)});')
            elif effect_type == 'drop_shadow':
                lines.append(f'var shadow = effects_{elem_id}.addProperty("ADBE Drop Shadow");')
                lines.append(f'shadow.property("ADBE Drop Shadow Distance").setValue({effect.get("distance", 10)});')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem_id}.addProperty("ADBE Fast Blur");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines


def generate_ae_line(elem: Dict) -> List[str]:
    """Genera código para una línea en AE."""
    elem_id = elem.get('id', 'line')
    start_point = elem.get('start', [0, 540])
    end_point = elem.get('end', [1920, 540])
    
    lines = [
        f"// {elem_id} - Línea",
        f'var layer_{elem_id} = comp.layers.addShape();',
        f'layer_{elem_id}.name = "{elem_id}";',
        f'var shapeGroup = layer_{elem_id}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var path = shapeGroup.property("ADBE Vector Shape - Group").addProperty("ADBE Vector Shape - Path");',
    ]
    
    # Path keyframes si existen
    path_keyframes = elem.get('path_keyframes', [])
    if path_keyframes:
        for kf in path_keyframes:
            time = kf.get('time', 0)
            start = kf.get('start', start_point)
            end = kf.get('end', end_point)
            lines.append(f'path.property("ADBE Vector Shape").setValueAtTime({time}, createPath([{start[0]},{start[1]}], [{end[0]},{end[1]}], [], false));')
    else:
        lines.append(f'path.property("ADBE Vector Shape").setValue(createPath([{start_point[0]},{start_point[1]}], [{end_point[0]},{end_point[1]}], [], false));')
    
    # Stroke
    stroke_color = elem.get('color', '#38bdf8')
    stroke_width = elem.get('width', 2)
    lines.append(f'var stroke = shapeGroup.property("ADBE Vector Graphic - Stroke").addProperty("ADBE Vector Stroke Color");')
    lines.append(f'stroke.setValue({hex_to_rgb_array(stroke_color)});')
    lines.append(f'var strokeWidth = shapeGroup.property("ADBE Vector Graphic - Stroke").addProperty("ADBE Vector Stroke Width");')
    lines.append(f'strokeWidth.setValue({stroke_width});')
    
    # Opacidad
    opacity_keyframes = elem.get('opacity_keyframes', [])
    if opacity_keyframes:
        lines.append(f'var opacityProp = layer_{elem_id}.property("ADBE Transform Group").property("ADBE Opacity");')
        for kf in opacity_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', 100)
            lines.append(f'opacityProp.setValueAtTime({time}, {value});')
    
    # Efectos
    effects = elem.get('effects', [])
    if effects:
        lines.append(f'var effects_{elem_id} = layer_{elem_id}.property("ADBE Effect Parade");')
        for effect in effects:
            effect_type = effect.get('type', '')
            if effect_type == 'glow':
                lines.append(f'var glow = effects_{elem_id}.addProperty("ADBE Glow");')
                lines.append(f'glow.property("ADBE Glow Intensity").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines


def generate_ae_particle(elem: Dict) -> List[str]:
    """Genera código para una partícula en AE."""
    elem_id = elem.get('id', 'particle')
    
    lines = [
        f"// {elem_id} - Partícula",
        f'var layer_{elem_id} = comp.layers.addShape();',
        f'layer_{elem_id}.name = "{elem_id}";',
        f'var shapeGroup = layer_{elem_id}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var ellipse = shapeGroup.property("ADBE Vector Shape - Group").addProperty("ADBE Vector Shape - Ellipse");',
    ]
    
    size = elem.get('size', [10, 10])
    lines.append(f'ellipse.property("ADBE Vector Ellipse Size").setValue([{size[0]}, {size[1]}]);')
    
    # Color
    particle_color = elem.get('color', '#38bdf8')
    lines.append(f'var fill = shapeGroup.property("ADBE Vector Graphic - Fill").addProperty("ADBE Vector Fill Color");')
    lines.append(f'fill.setValue({hex_to_rgb_array(particle_color)});')
    
    # Posición
    position_keyframes = elem.get('position_keyframes', [])
    if position_keyframes:
        lines.append(f'var posProp = layer_{elem_id}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in position_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [960, 540])
            lines.append(f'posProp.setValueAtTime({time}, [{value[0]}, {value[1]}]);')
    
    # Opacidad
    opacity_keyframes = elem.get('opacity_keyframes', [])
    if opacity_keyframes:
        lines.append(f'var opacityProp = layer_{elem_id}.property("ADBE Transform Group").property("ADBE Opacity");')
        for kf in opacity_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', 100)
            lines.append(f'opacityProp.setValueAtTime({time}, {value});')
    
    # Efectos
    effects = elem.get('effects', [])
    if effects:
        lines.append(f'var effects_{elem_id} = layer_{elem_id}.property("ADBE Effect Parade");')
        for effect in effects:
            effect_type = effect.get('type', '')
            if effect_type == 'glow':
                lines.append(f'var glow = effects_{elem_id}.addProperty("ADBE Glow");')
                lines.append(f'glow.property("ADBE Glow Intensity").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines


def create_ae_full_script(job: JobModel) -> str:
    """
    Crea un script completo de After Effects para todo el job.
    
    Args:
        job: JobModel con result_spec
    
    Returns:
        Código JSX completo para After Effects
    """
    if not job.result_spec:
        return "// Error: No hay spec.json para este job"
    
    scenes = job.result_spec.get('scenes', [])
    
    script_header = """// ============================================
// ANIMAFLOW - After Effects Export Script
// Generado automáticamente
// ============================================

// Verificar que hay un proyecto abierto
if (app.project == null) {
    app.newProject();
}

"""
    
    script_body = []
    for i, scene in enumerate(scenes):
        scene_script = generate_ae_script(scene, i)
        script_body.append(scene_script)
    
    script_footer = """
// ============================================
// FIN DEL SCRIPT
// ============================================
app.beginUndoGroup("AnimaFlow Import Complete");
app.endUndoGroup();
"""
    
    return script_header + "\n".join(script_body) + script_footer


def download_audio_files(job: JobModel, audio_dir: str) -> List[str]:
    """
    Descarga los archivos de audio de Voicebox para el job.
    
    Args:
        job: JobModel con audio URLs
        audio_dir: Directorio donde guardar los audios
    
    Returns:
        Lista de archivos descargados
    """
    import requests
    
    if not job.result_spec:
        return []
    
    scenes = job.result_spec.get('scenes', [])
    downloaded_files = []
    
    for i, scene in enumerate(scenes):
        audio_url = scene.get('audio_url')
        if audio_url:
            try:
                response = requests.get(audio_url, timeout=10)
                if response.status_code == 200:
                    audio_filename = f"escena_{i + 1}.mp3"
                    audio_path = os.path.join(audio_dir, audio_filename)
                    
                    with open(audio_path, 'wb') as f:
                        f.write(response.content)
                    
                    downloaded_files.append(audio_filename)
                    print(f"[AE Export] Audio descargado: {audio_filename}")
            except Exception as e:
                print(f"[AE Export] Error descargando audio {i + 1}: {e}")
    
    return downloaded_files


def create_export_zip(job_id: str, db: Session) -> tuple:
    """
    Crea un archivo .zip con todo lo necesario para After Effects.
    
    Args:
        job_id: ID del job
        db: Sesión de SQLAlchemy
    
    Returns:
        Tupla (zip_path, zip_filename) o (None, error_message)
    """
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        return None, "Job no encontrado"
    
    if not job.result_spec:
        return None, "Job no tiene spec.json generado"
    
    # Crear directorio temporal
    temp_dir = tempfile.mkdtemp(prefix=f"animaflow_ae_{job_id}_")
    
    try:
        # 1. Generar script.jsx
        script_content = create_ae_full_script(job)
        script_path = os.path.join(temp_dir, "script.jsx")
        
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        # 2. Descargar audios
        audio_dir = os.path.join(temp_dir, "audio")
        os.makedirs(audio_dir, exist_ok=True)
        download_audio_files(job, audio_dir)
        
        # 3. Guardar spec.json
        spec_path = os.path.join(temp_dir, "spec.json")
        
        with open(spec_path, 'w', encoding='utf-8') as f:
            json.dump(job.result_spec, f, indent=2)
        
        # 4. Crear README.md
        readme_content = f"""# AnimaFlow Project - {job_id}

## Instrucciones para After Effects

1. Abre Adobe After Effects
2. Ve a `File > Scripts > Run Script File...`
3. Selecciona el archivo `script.jsx`
4. El script creará automáticamente:
   - Composición 1920x1080 a 30fps
   - Capas de texto con timing
   - Formas SVG animadas
   - Capa de audio

## Estructura del proyecto

- `script.jsx`: Script principal de After Effects
- `audio/`: Archivos de audio TTS
- `spec.json`: Metadatos completos del proyecto

## Notas

- Asegúrate de que los archivos de audio estén en la carpeta `audio/`
- El script creará una nueva composición en tu proyecto actual
- Para editar: busca las capas en el timeline y modifica keyframes

Generado por AnimaFlow
"""
        
        readme_path = os.path.join(temp_dir, "README.md")
        
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        
        # 5. Crear .zip
        zip_filename = f"animaflow_{job_id}.zip"
        zip_path = os.path.join(temp_dir, zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    if file != zip_filename:  # No incluir el zip dentro de sí mismo
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, temp_dir)
                        zipf.write(file_path, arcname)
        
        return zip_path, zip_filename
    
    except Exception as e:
        print(f"[AE Export] Error creando zip: {e}")
        return None, str(e)
    
    finally:
        # Limpiar directorio temporal (pero no el zip)
        # El zip se devuelve, así que el caller es responsable de moverlo/copiarlo
        pass
