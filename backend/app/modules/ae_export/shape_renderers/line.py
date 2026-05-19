"""AE line shape renderer."""
from typing import Dict, List

from ..deterministic.utils import hex_to_rgb_array


def generate_ae_line(elem: Dict, width: int = 1080, height: int = 1920) -> List[str]:
    """Genera código para una línea en AE usando rectángulo delgado."""
    elem_id = elem.get('id', 'line')
    stroke_color = elem.get('color', '#38bdf8')
    stroke_width = elem.get('width', 2)
    
    lines = [
        f"// {elem_id} - Línea",
        f'var layer_{elem_id} = comp.layers.addShape();',
        f'layer_{elem_id}.name = "{elem_id}";',
        f'var shapeGroup = layer_{elem_id}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var vg = shapeGroup.property("ADBE Vectors Group");',
        f'var line = vg.addProperty("ADBE Vector Shape - Rect");',
        f'if (line != null) {{',
        f'    line.property("ADBE Vector Rect Size").setValue([{width}, {stroke_width}]);',
        f'    line.property("ADBE Vector Rect Position").setValue([0, {height//2}]);',
        f'}}',
    ]
    
    # Fill como color de línea
    lines.append(f'var fill = vg.addProperty("ADBE Vector Graphic - Fill");')
    lines.append(f'fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(stroke_color)});')
    
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
