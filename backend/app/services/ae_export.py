"""
Servicio de exportación de AnimaFlow a After Effects.

Convierte spec.json → script.jsx + audio/ + spec.json → .zip
"""
import os
import json
import shutil
import tempfile
import zipfile
from typing import Dict, List, Any, Tuple
from sqlalchemy.orm import Session

from app.db.models import JobModel
from app.core.resolutions import get_resolution
from app.core.config import settings


def _persist_job_spec(job_id: str, spec_dict: dict):
    """
    Persist job.result_spec using a separate psycopg2 connection.
    Bypasses SQLAlchemy ORM entirely to avoid JSON change detection issues.
    Works in both local (localhost) and Docker (postgres hostname) environments.
    """
    import psycopg2
    from sqlalchemy.engine.url import make_url
    
    try:
        url = make_url(settings.sqlalchemy_database_uri)
        conn = psycopg2.connect(
            host=url.host,
            port=url.port or 5432,
            user=url.username,
            password=url.password,
            database=url.database
        )
        cur = conn.cursor()
        cur.execute(
            "UPDATE jobs SET result_spec = %s WHERE id = %s",
            (json.dumps(spec_dict), job_id)
        )
        conn.commit()
        print(f"[AE Persist] ✅ result_spec persisted for job {job_id}")
    except Exception as e:
        print(f"[AE Persist] ❌ Failed to persist result_spec for job {job_id}: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        if 'conn' in locals():
            conn.close()


def hex_to_rgb_array(hex_color: str) -> str:
    """Convierte color HEX a array RGB normalizado [r, g, b] para AE."""
    hex_color = hex_color.lstrip('#').rstrip('}').strip()
    if len(hex_color) != 6:
        return "[0.220, 0.741, 0.973]"
    try:
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0
        return f"[{r:.3f}, {g:.3f}, {b:.3f}]"
    except ValueError:
        return "[0.220, 0.741, 0.973]"


def generate_ae_script(scene: Dict, index: int, width: int = 1080, height: int = 1920) -> str:
    """
    Genera código ExtendScript (.jsx) para una escena de After Effects.
    
    Args:
        scene: Diccionario con datos de la escena (ae_metadata)
        index: Índice de la escena
        width: Ancho de la composición
        height: Alto de la composición
    
    Returns:
        Código JSX para After Effects
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
    
    # Generar elementos
    for elem in elements:
        elem_type = elem.get('type', 'rectangle')
        elem_id = elem.get('id', f'element_{index}')
        
        if elem_type == 'rectangle':
            script_lines.extend(generate_ae_rectangle(elem, width, height))
        elif elem_type == 'circle':
            script_lines.extend(generate_ae_circle(elem, width, height))
        elif elem_type == 'flash':
            script_lines.extend(generate_ae_flash(elem, width, height))
        elif elem_type == 'calendar':
            script_lines.extend(generate_ae_calendar(elem, width, height))
        elif elem_type == 'line':
            script_lines.extend(generate_ae_line(elem, width, height))
        elif elem_type == 'particle':
            script_lines.extend(generate_ae_particle(elem, width, height))
        else:
            script_lines.extend(generate_ae_shape_generic(elem, width, height))
    
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


def generate_ae_rectangle(elem: Dict, width: int = 1080, height: int = 1920) -> List[str]:
    """Genera código para un rectángulo en AE."""
    size = elem.get('size', [100, 100])
    
    lines = [
        f"// {elem.get('id', 'rect')} - Rectángulo",
        f'var layer_{elem.get("id", "rect")} = comp.layers.addShape();',
        f'layer_{elem.get("id", "rect")}.name = "{elem.get("id", "rect")}";',
        f'var shapeGroup = layer_{elem.get("id", "rect")}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var vg = shapeGroup.property("ADBE Vectors Group");',
        f'var rect = vg.addProperty("ADBE Vector Shape - Rect");',
        f'if (rect != null) {{',
        f'    rect.property("ADBE Vector Rect Size").setValue([{size[0]}, {size[1]}]);',
        f'}}',
    ]
    
    if 'position' in elem:
        pos = elem['position']
        lines.append(f'rect.property("ADBE Vector Rect Position").setValue([{pos[0]}, {pos[1]}]);')
    
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
        lines.append(f'var posProp = layer_{elem.get("id", "rect")}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in position_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [width//2, height//2])
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
                lines.append(f'var glow = effects_{elem.get("id", "rect")}.addProperty("ADBE Glo2");')
                lines.append(f'glow.property(3).setValue({effect.get("intensity", 50)});')
                lines.append(f'glow.property(4).setValue(1);')
            elif effect_type == 'drop_shadow':
                lines.append(f'var shadow = effects_{elem.get("id", "rect")}.addProperty("ADBE Drop Shadow");')
                lines.append(f'shadow.property(5).setValue({effect.get("distance", 10)});')
                lines.append(f'shadow.property(2).setValue({effect.get("opacity", 50)});')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem.get("id", "rect")}.addProperty("ADBE Box Blur2");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines


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
                lines.append(f'glow.property(3).setValue({effect.get("intensity", 50)});')
                lines.append(f'glow.property(4).setValue(1);')
            elif effect_type == 'drop_shadow':
                lines.append(f'var shadow = effects_{elem.get("id", "circle")}.addProperty("ADBE Drop Shadow");')
                lines.append(f'shadow.property(5).setValue({effect.get("distance", 10)});')
                lines.append(f'shadow.property(2).setValue({effect.get("opacity", 50)});')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem.get("id", "circle")}.addProperty("ADBE Box Blur2");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines


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
                lines.append(f'glow.property(3).setValue({effect.get("intensity", 100)});')
                lines.append(f'glow.property(4).setValue(1);')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem.get("id", "flash")}.addProperty("ADBE Box Blur2");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    else:
        lines.append(f'var glow = layer_{elem.get("id", "flash")}.property("ADBE Effect Parade").addProperty("ADBE Glo2");')
        lines.append(f'glow.property(3).setValue(100);')
        lines.append(f'glow.property(4).setValue(1);')
    
    lines.append("")
    return lines


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
                lines.append(f'glow.property(3).setValue({effect.get("intensity", 50)});')
                lines.append(f'glow.property(4).setValue(1);')
            elif effect_type == 'drop_shadow':
                lines.append(f'var shadow = effects_{elem.get("id", "calendar")}.addProperty("ADBE Drop Shadow");')
                lines.append(f'shadow.property(5).setValue({effect.get("distance", 10)});')
                lines.append(f'shadow.property(2).setValue({effect.get("opacity", 50)});')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem.get("id", "calendar")}.addProperty("ADBE Box Blur2");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines


def generate_ae_shape_generic(elem: Dict, width: int = 1080, height: int = 1920) -> List[str]:
    """Genera código para una forma genérica en AE."""
    elem_type = elem.get('type', 'shape')
    elem_id = elem.get('id', elem_type)
    
    lines = [
        f"// {elem_id} - Forma genérica ({elem_type})",
        f'var layer_{elem_id} = comp.layers.addShape();',
        f'layer_{elem_id}.name = "{elem_id}";',
        f'var shapeGroup = layer_{elem_id}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");',
        f'var vg = shapeGroup.property("ADBE Vectors Group");',
        f'var fill = vg.addProperty("ADBE Vector Graphic - Fill");',
        f'fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array("#38bdf8")});',
    ]
    
    # Keyframes de posición
    position_keyframes = elem.get('position_keyframes', [])
    if position_keyframes:
        lines.append(f'var posProp = layer_{elem_id}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in position_keyframes:
            time = kf.get('time', 0)
            value = kf.get('value', [width//2, height//2])
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
                lines.append(f'var glow = effects_{elem_id}.addProperty("ADBE Glo2");')
                lines.append(f'glow.property(3).setValue({effect.get("intensity", 50)});')
                lines.append(f'glow.property(4).setValue(1);')
            elif effect_type == 'drop_shadow':
                lines.append(f'var shadow = effects_{elem_id}.addProperty("ADBE Drop Shadow");')
                lines.append(f'shadow.property(5).setValue({effect.get("distance", 10)});')
                lines.append(f'shadow.property(2).setValue({effect.get("opacity", 50)});')
            elif effect_type == 'blur':
                lines.append(f'var blur = effects_{elem_id}.addProperty("ADBE Box Blur2");')
                lines.append(f'blur.property("ADBE Blur Sharpen").setValue({effect.get("intensity", 50)});')
    
    lines.append("")
    return lines


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
                lines.append(f'glow.property(3).setValue({effect.get("intensity", 50)});')
                lines.append(f'glow.property(4).setValue(1);')
    
    lines.append("")
    return lines


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
                lines.append(f'glow.property(3).setValue({effect.get("intensity", 50)});')
                lines.append(f'glow.property(4).setValue(1);')
    
    lines.append("")
    return lines


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

// Verificar que hay un proyecto abierto
if (app.project == null) {{
    app.newProject();
}}

"""
    
    script_parts = []
    for i, scene in enumerate(scenes):
        ae_script_code = scene.get('ae_script_code')
        print(f"[AE Full Script] Scene {i+1}: ae_script_code={'PRESENT' if ae_script_code else 'MISSING'} (len={len(ae_script_code) if ae_script_code else 0})")
        if ae_script_code:
            scene_script = f"// Escena {i + 1} - Generado por AnimaFlow\n{ae_script_code}\n"
        else:
            print(f"[AE Full Script] Scene {i+1}: Using fallback generate_ae_script()")
            scene_script = generate_ae_script(scene, i, width, height)
        script_parts.append(scene_script)
    
    script_footer = """
// ============================================
// FIN DEL SCRIPT
// ============================================
"""
    
    return script_header + "\n".join(script_parts) + script_footer


def download_audio_files(job: JobModel, audio_dir: str) -> List[str]:
    """
    Descarga los archivos de audio cacheados localmente para el job.
    Usa el cache local en storage/audio/ en vez de descargar de Voicebox.
    
    Args:
        job: JobModel con audio URLs
        audio_dir: Directorio donde guardar los audios
    
    Returns:
        Lista de archivos descargados
    """
    if not job.result_spec:
        return []
    
    scenes = job.result_spec.get('scenes', [])
    downloaded_files = []
    
    # Local cache directory
    cache_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../storage/audio"))
    
    for i, scene in enumerate(scenes):
        audio_url = scene.get('audio_url')
        if audio_url:
            try:
                # Try to find cached file locally
                local_path = os.path.join(cache_dir, f"{job.id}_{i}.mp3")
                if os.path.exists(local_path):
                    audio_filename = f"escena_{i + 1}.mp3"
                    audio_path = os.path.join(audio_dir, audio_filename)
                    shutil.copy(local_path, audio_path)
                    downloaded_files.append(audio_filename)
                    print(f"[AE Export] Audio copied from cache: {audio_filename}")
                else:
                    # Fallback: try to download from URL (if it's a remote URL)
                    import requests
                    response = requests.get(audio_url, timeout=10)
                    if response.status_code == 200:
                        audio_filename = f"escena_{i + 1}.mp3"
                        audio_path = os.path.join(audio_dir, audio_filename)
                        with open(audio_path, 'wb') as f:
                            f.write(response.content)
                        downloaded_files.append(audio_filename)
                        print(f"[AE Export] Audio downloaded from URL: {audio_filename}")
            except Exception as e:
                print(f"[AE Export] Error getting audio {i + 1}: {e}")
    
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
        
        aspect_ratio = job.result_spec.get('aspect_ratio', job.aspect_ratio or "9:16")
        width, height = get_resolution(aspect_ratio)
        
        # 4. Crear README.md
        readme_content = f"""# AnimaFlow Project - {job_id}

## Instrucciones para After Effects

1. Abre Adobe After Effects
2. Ve a `File > Scripts > Run Script File...`
3. Selecciona el archivo `script.jsx`
4. El script creará automáticamente:
   - Composición {width}x{height} a 30fps
   - Capa de fondo con color del spec
   - Capas de texto con timing y color
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


def generate_ae_export_async(job_id: str, force: bool = False):
    """
    RQ worker function: generates AE scripts for all scenes, then creates zip.
    Progress stored in result_spec._ae_export_status and _ae_export_progress.
    Uses separate psycopg2 connection for JSON persistence to bypass SQLAlchemy issues.
    
    Args:
        job_id: Job ID to export
        force: If True, clears existing ae_script_code and regenerates all scenes
    """
    from app.db.session import SessionLocal
    from app.db.models import JobModel
    from app.services.pipeline import generate_ae_script_from_tsx
    
    db = SessionLocal()
    try:
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if not job or not job.result_spec:
            print(f"[AE Export] Job {job_id} not found or no spec")
            return
        
        scenes = job.result_spec.get('scenes', [])
        aspect_ratio = job.result_spec.get('aspect_ratio', job.aspect_ratio or "9:16")
        w, h = get_resolution(aspect_ratio)
        
        # Force mode: clear existing scripts to regenerate all scenes
        if force:
            cleared = 0
            for scene in scenes:
                if scene.pop('ae_script_code', None):
                    cleared += 1
            print(f"[AE Export] Force mode: cleared {cleared} existing ae_script_code(s) for regeneration")
            _persist_job_spec(job_id, job.result_spec)
        
        # Initialize export status
        job.result_spec['_ae_export_status'] = 'generating'
        job.result_spec['_ae_export_progress'] = {'current': 0, 'total': len(scenes)}
        _persist_job_spec(job_id, job.result_spec)
        
        generated_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/src/remotion/generated"))
        
        for i, scene in enumerate(scenes):
            # Skip if already generated (preserves existing)
            if scene.get('ae_script_code'):
                print(f"[AE Export] Scene {i+1} already has ae_script_code, skipping")
                job.result_spec['_ae_export_progress'] = {'current': i + 1, 'total': len(scenes)}
                _persist_job_spec(job_id, job.result_spec)
                continue
            
            # Read TSX from disk
            tsx_path = os.path.join(generated_dir, f"Scene_{job_id}_{i}.tsx")
            if not os.path.exists(tsx_path):
                print(f"[AE Export] TSX not found for scene {i+1}: {tsx_path}")
                job.result_spec['_ae_export_progress'] = {'current': i + 1, 'total': len(scenes)}
                _persist_job_spec(job_id, job.result_spec)
                continue
            
            with open(tsx_path, 'r', encoding='utf-8') as f:
                tsx_code = f.read()
            
            print(f"[AE Export] Generating AE script for scene {i+1}/{len(scenes)}...")
            print(f"[AE Export] TSX file: {tsx_path}, exists: {os.path.exists(tsx_path)}")
            
            # Generate AE script
            print(f"[AE Export] 🚀 Calling LLM generate_ae_script_from_tsx for scene {i+1}...")
            ae_script = generate_ae_script_from_tsx(
                tsx_code, scene['text'], scene['duration_seconds'],
                scene.get('remotion_props', {}).get('backgroundColor', '#0f172a'),
                scene.get('remotion_props', {}).get('textColor', '#38bdf8'),
                w, h,
                job_id=str(job.id), scene_id=i
            )
            print(f"[AE Export] LLM result for scene {i+1}: {'OK' if ae_script else 'NULL/FALLIDO'} (length: {len(ae_script) if ae_script else 0} chars)")
            
            if ae_script:
                # Wrap with individual undo group
                ae_script = f'app.beginUndoGroup("AnimaFlow Scene {i+1}");\n{ae_script}\napp.endUndoGroup();'
                scene['ae_script_code'] = ae_script
                _persist_job_spec(job_id, job.result_spec)
                print(f"[AE Export] AE script persisted to DB for scene {i+1} (len={len(ae_script)})")
            else:
                print(f"[AE Export] AE script generation failed for scene {i+1}")
            
            # Update progress
            job.result_spec['_ae_export_progress'] = {'current': i + 1, 'total': len(scenes)}
            _persist_job_spec(job_id, job.result_spec)
        
        # Close ORM transaction and re-query to get fresh data from DB
        db.commit()
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        print(f"[AE Export] Re-loaded job from DB, scenes count: {len(job.result_spec.get('scenes', []))}")
        for i, s in enumerate(job.result_spec.get('scenes', [])):
            has_ae = 'ae_script_code' in s and s['ae_script_code']
            print(f"[AE Export]   Scene {i+1}: ae_script_code={'YES' if has_ae else 'NO'} (len={len(s.get('ae_script_code', '')) if has_ae else 0})")
        
        print(f"[AE Export] Creating export zip for job {job_id}...")
        zip_path, zip_filename = create_export_zip(job_id, db)
        
        if zip_path:
            job.result_spec['_ae_export_status'] = 'completed'
            job.result_spec['_ae_export_zip_path'] = zip_path
            job.result_spec['_ae_export_filename'] = zip_filename
            print(f"[AE Export] Export completed: {zip_filename}")
            _persist_job_spec(job_id, job.result_spec)
        else:
            job.result_spec['_ae_export_status'] = 'failed'
            print(f"[AE Export] Failed to create zip")
            _persist_job_spec(job_id, job.result_spec)
        
    except Exception as e:
        print(f"[AE Export] Error: {e}")
        job = db.query(JobModel).filter(JobModel.id == job_id).first()
        if job and job.result_spec:
            job.result_spec['_ae_export_status'] = f'failed: {str(e)}'
            _persist_job_spec(job_id, job.result_spec)
    finally:
        db.close()
