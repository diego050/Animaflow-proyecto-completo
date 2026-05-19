"""AE flash shape renderer."""
from typing import Dict, List

from ..deterministic.utils import hex_to_rgb_array


def generate_ae_flash(elem: Dict, width: int = 1080, height: int = 1920) -> List[str]:
    """Genera código para un destello/flash en AE usando shape layer (no sólido pantalla completa)."""
    flash_color = elem.get('color', '#fbbf24')
    
    # Posición del flash
    position_keyframes = elem.get('position_keyframes', [])
    if position_keyframes:
        pos = position_keyframes[0].get('value', [width//2, height//2])
    else:
        pos = [width//2, height//2]
    
    lines = [
        f"// {elem.get('id', 'flash')} - Destello",
        f'var layer_{elem.get("id", "flash")} = comp.layers.addShape();',
        f'layer_{elem.get("id", "flash")}.name = "{elem.get("id", "flash")}";',
        f'var shapeGroup = layer_{elem.get("id", "flash")}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var vg = shapeGroup.property("ADBE Vectors Group");',
        f'var ellipse = vg.addProperty("ADBE Vector Shape - Ellipse");',
        f'if (ellipse != null) {{',
        f'    ellipse.property("ADBE Vector Ellipse Size").setValue([200, 200]);',
        f'}}',
        f'var fill = vg.addProperty("ADBE Vector Graphic - Fill");',
        f'fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(flash_color)});',
        f'var posProp = layer_{elem.get("id", "flash")}.property("ADBE Transform Group").property("ADBE Position");',
        f'posProp.setValue([{pos[0]}, {pos[1]}]);',
    ]
    
    # Opacidad para flash (aparece y desaparece rápidamente)
    opacity_kfs = elem.get('opacity_keyframes', [
        {'time': 2, 'value': 0},
        {'time': 2.1, 'value': 100},
        {'time': 2.3, 'value': 0}
    ])
    
    lines.append(f'var opacityProp = layer_{elem.get("id", "flash")}.property("ADBE Transform Group").property("ADBE Opacity");')
    for kf in opacity_kfs:
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
                lines.append(f'var glow = effects_{elem.get("id", "flash")}.addProperty("ADBE Glo2");')
                lines.append(f'glow.property("ADBE Glo2-0003").setValue({effect.get("intensity", 100)});')
                lines.append(f'glow.property("ADBE Glo2-0004").setValue(1);')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem.get("id", "flash")}.addProperty("ADBE Box Blur2");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    else:
        lines.append(f'var glow = layer_{elem.get("id", "flash")}.property("ADBE Effect Parade").addProperty("ADBE Glo2");')
        lines.append(f'glow.property("ADBE Glo2-0003").setValue(100);')
        lines.append(f'glow.property("ADBE Glo2-0004").setValue(1);')
    
    lines.append("")
    return lines
