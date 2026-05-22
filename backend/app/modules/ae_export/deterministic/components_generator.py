from .utils import hex_to_rgb_array

def generate_component_script(
    components: dict,
    text: str,
    duration: float,
    width: int = 1080,
    height: int = 1920,
    fps: int = 30,
) -> str:
    """
    Generates an After Effects ExtendScript based on Remotion components.
    """
    parts = []
    
    # === HEADER ===
    parts.append(f'var comp = app.project.items.addComp("Scene", {width}, {height}, 1, {duration}, {fps});')
    parts.append('')
    
    # === KineticBackground ===
    if 'KineticBackground' in components:
        bg_props = components.get('KineticBackground', {})
        c1 = bg_props.get('color1', '#0f172a')
        c2 = bg_props.get('color2', '#312e81')
        
        parts.append('// KineticBackground')
        parts.append(f'var bgLayer = comp.layers.addSolid({hex_to_rgb_array(c1)}, "KineticBackground", {width}, {height}, 1, {duration});')
        parts.append('var gradientEffect = bgLayer.property("ADBE Effect Parade").addProperty("ADBE 4-Color Gradient");')
        parts.append(f'gradientEffect.property("ADBE 4-Color Gradient-0003").setValue({hex_to_rgb_array(c1)});')
        parts.append(f'gradientEffect.property("ADBE 4-Color Gradient-0004").setValue({hex_to_rgb_array(c1)});')
        parts.append(f'gradientEffect.property("ADBE 4-Color Gradient-0005").setValue({hex_to_rgb_array(c2)});')
        parts.append(f'gradientEffect.property("ADBE 4-Color Gradient-0006").setValue({hex_to_rgb_array(c2)});')
        parts.append('')
    else:
        # Fallback background
        parts.append('// Fallback Background')
        parts.append(f'comp.layers.addSolid([0,0,0], "Background", {width}, {height}, 1, {duration});')
        parts.append('')
    
    # === TextReveal ===
    if 'TextReveal' in components:
        tr_props = components.get('TextReveal', {})
        txt_color = tr_props.get('color', '#ffffff')
        anim_type = tr_props.get('animation', 'slide_up')
        
        parts.append('// TextReveal')
        safe_text = text.replace('"', '\\"').replace("'", "\\'")
        # Read props
        x = tr_props.get('x', width // 2)
        y = tr_props.get('y', int(height * 0.8))
        fs = tr_props.get('fontSize', 68)
        w_box = tr_props.get('width', int(width * 0.9))
        
        parts.append(f'var textLayer = comp.layers.addBoxText([{w_box}, 800], "{safe_text}");')
        parts.append('textLayer.name = "TextReveal";')
        parts.append('var td = textLayer.property("Source Text").value;')
        parts.append('td.resetCharStyle();')
        parts.append('td.font = "Arial-BoldMT";')
        parts.append(f'td.fontSize = {fs};')
        parts.append('td.applyFill = true;')
        parts.append(f'td.fillColor = {hex_to_rgb_array(txt_color)};')
        parts.append('td.justification = ParagraphJustification.CENTER_JUSTIFY;')
        parts.append('textLayer.property("Source Text").setValue(td);')
        parts.append(f'textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{x}, {y}]);')
        
        # Add text animator for slide_up / fade
        parts.append('var textAnimator = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");')
        parts.append('textAnimator.name = "Reveal Animator";')
        parts.append('var animatorProps = textAnimator.property("ADBE Text Animator Properties");')
        parts.append('animatorProps.addProperty("ADBE Text Opacity").setValue(0);')
        
        if anim_type == 'slide_up':
            parts.append('animatorProps.addProperty("ADBE Text Position 3D").setValue([0, 50, 0]);')
        elif anim_type == 'blur':
            parts.append('animatorProps.addProperty("ADBE Text Blur").setValue([20, 20]);')
            
        parts.append('var selector = textAnimator.property("ADBE Text Selectors").addProperty("ADBE Text Selector");')
        parts.append('var startProp = selector.property("ADBE Text Percent Start");')
        parts.append('startProp.setValueAtTime(0, 0);')
        parts.append('startProp.setValueAtTime(1.5, 100);')
        
        # Add fade out at the end
        parts.append('var textOpac = textLayer.property("ADBE Transform Group").property("ADBE Opacity");')
        parts.append('textOpac.setValueAtTime(0, 100);')
        parts.append(f'textOpac.setValueAtTime({duration - 0.3}, 100);')
        parts.append(f'textOpac.setValueAtTime({duration}, 0);')
        parts.append('')
    
    return '\n'.join(parts)
