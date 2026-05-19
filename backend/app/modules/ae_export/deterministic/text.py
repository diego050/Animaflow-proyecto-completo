"""
Text layer generator for deterministic AE script generation.
"""
from .utils import hex_to_rgb_array


def _generate_text_layer(text: str, text_color: str, position: list, width: int, height: int) -> str:
    """Generate code for the text layer with proper font and paragraph wrapping."""
    rgb = hex_to_rgb_array(text_color)
    # Escape quotes in text
    safe_text = text.replace('"', '\\"').replace("'", "\\'")
    box_w = int(width * 0.9)
    box_h = 300
    
    lines = ['// --- Text Layer ---']
    lines.append(f'var textLayer = comp.layers.addBoxText([{box_w}, {box_h}], "{safe_text}");')
    lines.append('var td = textLayer.property("Source Text").value;')
    lines.append('td.resetCharStyle();')
    lines.append('td.font = "Arial-BoldMT";')
    lines.append('td.fontSize = 68;')
    lines.append('td.fauxBold = true;')
    lines.append('td.applyFill = true;')
    lines.append(f'td.fillColor = {rgb};')
    lines.append('td.justification = ParagraphJustification.CENTER_JUSTIFY;')
    lines.append('textLayer.property("Source Text").setValue(td);')
    lines.append(f'textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{position[0]}, {position[1]}]);')
    lines.append('')
    return '\n'.join(lines)
