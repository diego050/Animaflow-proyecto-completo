"""AE particle shape renderer."""
from typing import Dict, List

from ..deterministic.utils import hex_to_rgb_array


def generate_ae_particle(elem: Dict, width: int = 1080, height: int = 1920) -> List[str]:
    """Genera código para una partícula en AE."""
    elem_id = elem.get('id', 'particle')
    size = elem.get('size', [10, 10])
    
    lines = [
        f"// {elem_id} - Partícula",
        f'var layer_{elem_id} = comp.layers.addShape();',
        f'layer_{elem_id}.name = "{elem_id}";',
        f'var shapeGroup = layer_{elem_id}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var vg = shapeGroup.property("ADBE Vectors Group");',
        f'var ellipse = vg.addProperty("ADBE Vector Shape - Ellipse");',
        f'if (ellipse != null) {{',
        f'    ellipse.property("ADBE Vector Ellipse Size").setValue([{size[0]}, {size[1]}]);',
        f'}}',
    ]
    
    # Color - primero crear fill, luego setear color
    particle_color = elem.get('color', '#38bdf8')
    lines.append(f'var fill = vg.addProperty("ADBE Vector Graphic - Fill");')
    lines.append(f'fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(particle_color)});')
    
    # Posición
    position_keyframes = elem.get('position_keyframes', [])
    if position_keyframes:
        lines.append(f'var posProp = layer_{elem_id}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in position_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [width//2, height//2])
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
                lines.append(f'var glow = effects_{elem_id}.addProperty("ADBE Glo2");')
                lines.append(f'glow.property("ADBE Glo2-0003").setValue({effect.get("intensity", 50)});')
                lines.append(f'glow.property("ADBE Glo2-0004").setValue(1);')
    
    lines.append("")
    return lines
