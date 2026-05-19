"""AE circle shape renderer."""
from typing import Dict, List

from ..deterministic.utils import hex_to_rgb_array


def generate_ae_circle(elem: Dict, width: int = 1080, height: int = 1920) -> List[str]:
    """Genera código para un círculo en AE."""
    size = elem.get('size', [50, 50])
    
    lines = [
        f"// {elem.get('id', 'circle')} - Círculo",
        f'var layer_{elem.get("id", "circle")} = comp.layers.addShape();',
        f'layer_{elem.get("id", "circle")}.name = "{elem.get("id", "circle")}";',
        f'var shapeGroup = layer_{elem.get("id", "circle")}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var vg = shapeGroup.property("ADBE Vectors Group");',
        f'var ellipse = vg.addProperty("ADBE Vector Shape - Ellipse");',
        f'if (ellipse != null) {{',
        f'    ellipse.property("ADBE Vector Ellipse Size").setValue([{size[0]}, {size[1]}]);',
        f'}}',
    ]
    
    if 'position' in elem:
        pos = elem['position']
        lines.append(f'ellipse.property("ADBE Vector Ellipse Position").setValue([{pos[0]}, {pos[1]}]);')
    
    # Color con transiciones - primero crear fill, luego setear color
    color_keyframes = elem.get('color_keyframes', [])
    if color_keyframes:
        lines.append(f'var fill = vg.addProperty("ADBE Vector Graphic - Fill");')
        for kf in color_keyframes:
            time = kf.get('time', 0)
            color = kf.get('color', '#38bdf8')
            lines.append(f'fill.property("ADBE Vector Fill Color").setValueAtTime({time}, {hex_to_rgb_array(color)});')
    else:
        lines.append(f'var fill = vg.addProperty("ADBE Vector Graphic - Fill");')
        lines.append(f'fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array("#38bdf8")});')
    
    # Animación de posición
    position_keyframes = elem.get('position_keyframes', [])
    if position_keyframes:
        lines.append(f'var posProp = layer_{elem.get("id", "circle")}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in position_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [width//2, height//2])
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
                lines.append(f'var glow = effects_{elem.get("id", "circle")}.addProperty("ADBE Glo2");')
                lines.append(f'glow.property("ADBE Glo2-0003").setValue({effect.get("intensity", 50)});')
                lines.append(f'glow.property("ADBE Glo2-0004").setValue(1);')
            elif effect_type == 'drop_shadow':
                lines.append(f'var shadow = effects_{elem.get("id", "circle")}.addProperty("ADBE Drop Shadow");')
                lines.append(f'shadow.property("ADBE Drop Shadow-0004").setValue({effect.get("distance", 10)});')
                lines.append(f'shadow.property("ADBE Drop Shadow-0005").setValue({effect.get("softness", 20)});')
                lines.append(f'shadow.property("ADBE Drop Shadow-0002").setValue({effect.get("opacity", 75)});')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem.get("id", "circle")}.addProperty("ADBE Box Blur2");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines
