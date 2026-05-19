"""AE calendar shape renderer."""
from typing import Dict, List

from ..deterministic.utils import hex_to_rgb_array


def generate_ae_calendar(elem: Dict, width: int = 1080, height: int = 1920) -> List[str]:
    """Genera código para un calendario en AE."""
    lines = [
        f"// {elem.get('id', 'calendar')} - Calendario",
        f'var layer_{elem.get("id", "calendar")} = comp.layers.addShape();',
        f'layer_{elem.get("id", "calendar")}.name = "{elem.get("id", "calendar")}";',
        f'var shapeGroup = layer_{elem.get("id", "calendar")}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var vg = shapeGroup.property("ADBE Vectors Group");',
        f'var rect = vg.addProperty("ADBE Vector Shape - Rect");',
        f'if (rect != null) {{',
        f'    rect.property("ADBE Vector Rect Size").setValue([120, 100]);',
        f'    rect.property("ADBE Vector Rect Roundness").setValue([8, 8]);',
        f'}}',
        f'var fill = vg.addProperty("ADBE Vector Graphic - Fill");',
        f'fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array("#38bdf8")});',
    ]
    
    # Animación bounce in (solo si no hay keyframes personalizados)
    position_keyframes = elem.get('position_keyframes', [])
    if position_keyframes:
        lines.append(f'var posProp = layer_{elem.get("id", "calendar")}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in position_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [width//2, height//2])
            lines.append(f'posProp.setValueAtTime({time}, [{value[0]}, {value[1]}]);')
    else:
        lines.append(f'var posProp = layer_{elem.get("id", "calendar")}.property("ADBE Transform Group").property("ADBE Position");')
        lines.append(f'posProp.setValueAtTime(0, [{width//2}, {int(height*0.74)}]);')
        lines.append(f'posProp.setValueAtTime(0.5, [{width//2}, {int(height*0.48)}]);')
        lines.append(f'posProp.setValueAtTime(0.8, [{width//2}, {int(height*0.52)}]);')
        lines.append(f'posProp.setValueAtTime(1.0, [{width//2}, {int(height*0.50)}]);')
    
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
                lines.append(f'var glow = effects_{elem.get("id", "calendar")}.addProperty("ADBE Glo2");')
                lines.append(f'glow.property("ADBE Glo2-0003").setValue({effect.get("intensity", 50)});')
                lines.append(f'glow.property("ADBE Glo2-0004").setValue(1);')
            elif effect_type == 'drop_shadow':
                lines.append(f'var shadow = effects_{elem.get("id", "calendar")}.addProperty("ADBE Drop Shadow");')
                lines.append(f'shadow.property("ADBE Drop Shadow-0004").setValue({effect.get("distance", 10)});')
                lines.append(f'shadow.property("ADBE Drop Shadow-0005").setValue({effect.get("softness", 20)});')
                lines.append(f'shadow.property("ADBE Drop Shadow-0002").setValue({effect.get("opacity", 75)});')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem.get("id", "calendar")}.addProperty("ADBE Box Blur2");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines
