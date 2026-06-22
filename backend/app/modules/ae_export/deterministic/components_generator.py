from .utils import hex_to_rgb_array


# ---------------------------------------------------------------------------
# Helpers de ExtendScript (reutilizables por los bloques de componentes).
# Devuelven listas de líneas .jsx para extender `parts`.
# ---------------------------------------------------------------------------
def _esc(s) -> str:
    """Escapa una cadena para incrustarla en ExtendScript con comillas dobles."""
    return str(s).replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ')


def _ae_text(var, name, text, size, color, x, y):
    return [
        f'// {name}',
        f'var {var} = comp.layers.addText();',
        f'{var}.name = "{_esc(name)}";',
        f'var {var}P = {var}.property("Source Text");',
        f'var {var}D = {var}P.value;',
        f'{var}D.text = "{_esc(text)}";',
        f'{var}D.fontSize = {size};',
        f'{var}D.fillColor = {hex_to_rgb_array(color)};',
        f'{var}D.justification = ParagraphJustification.CENTER_JUSTIFY;',
        f'{var}P.setValue({var}D);',
        f'{var}.property("ADBE Transform Group").property("ADBE Position").setValue([{x}, {y}]);',
        '',
    ]


def _ae_rrect(var, name, w, h, color, roundness, x, y):
    return [
        f'// {name}',
        f'var {var} = comp.layers.addShape();',
        f'{var}.name = "{_esc(name)}";',
        f'var {var}R = {var}.property("ADBE Root Vectors Group");',
        f'var {var}G = {var}R.addProperty("ADBE Vector Group");',
        f'var {var}V = {var}G.property("ADBE Vectors Group");',
        f'var {var}Rect = {var}V.addProperty("ADBE Vector Shape - Rect");',
        f'{var}Rect.property("ADBE Vector Rect Size").setValue([{w}, {h}]);',
        f'{var}Rect.property("ADBE Vector Rect Roundness").setValue({roundness});',
        f'var {var}Fill = {var}V.addProperty("ADBE Vector Graphic - Fill");',
        f'{var}Fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(color)});',
        f'{var}.property("ADBE Transform Group").property("ADBE Position").setValue([{x}, {y}]);',
        '',
    ]


def _ae_ellipse(var, name, size, color, x, y):
    return [
        f'// {name}',
        f'var {var} = comp.layers.addShape();',
        f'{var}.name = "{_esc(name)}";',
        f'var {var}R = {var}.property("ADBE Root Vectors Group");',
        f'var {var}G = {var}R.addProperty("ADBE Vector Group");',
        f'var {var}V = {var}G.property("ADBE Vectors Group");',
        f'var {var}El = {var}V.addProperty("ADBE Vector Shape - Ellipse");',
        f'{var}El.property("ADBE Vector Ellipse Size").setValue([{size}, {size}]);',
        f'var {var}Fill = {var}V.addProperty("ADBE Vector Graphic - Fill");',
        f'{var}Fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(color)});',
        f'{var}.property("ADBE Transform Group").property("ADBE Position").setValue([{x}, {y}]);',
        '',
    ]


def _ae_bars(prefix, name, values, colors, x, y, width=720, height=420, c1='#3b82f6'):
    """Barras verticales (para bar charts) escaladas a max(values)."""
    lines = [f'// {name}']
    n = max(1, len(values))
    mx = max([abs(float(v)) for v in values] + [1])
    gap = 16
    bw = (width - gap * (n - 1)) / n
    start_x = x - width / 2 + bw / 2
    base_y = y + height / 2
    for i, v in enumerate(values):
        bh = max(2.0, (abs(float(v)) / mx) * height)
        col = colors[i] if i < len(colors) and colors[i] else c1
        bx = start_x + i * (bw + gap)
        by = base_y - bh / 2
        var = f'{prefix}{i}'
        lines += [
            f'var {var} = comp.layers.addShape();',
            f'{var}.name = "{_esc(name)}_{i}";',
            f'var {var}R = {var}.property("ADBE Root Vectors Group");',
            f'var {var}G = {var}R.addProperty("ADBE Vector Group");',
            f'var {var}V = {var}G.property("ADBE Vectors Group");',
            f'var {var}Rect = {var}V.addProperty("ADBE Vector Shape - Rect");',
            f'{var}Rect.property("ADBE Vector Rect Size").setValue([{bw:.1f}, {bh:.1f}]);',
            f'{var}Rect.property("ADBE Vector Rect Roundness").setValue(8);',
            f'var {var}Fill = {var}V.addProperty("ADBE Vector Graphic - Fill");',
            f'{var}Fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(col)});',
            f'{var}.property("ADBE Transform Group").property("ADBE Position").setValue([{bx:.1f}, {by:.1f}]);',
        ]
    lines.append('')
    return lines


def _ae_card(var, name, w, h, bg, x, y, roundness=20, title=None, title_color='#ffffff',
             title_size=48, subtitle=None, subtitle_color='#94a3b8', subtitle_size=32):
    """Tarjeta: rrect de fondo + título centrado (+ subtítulo opcional)."""
    out = _ae_rrect(var, name, w, h, bg, roundness, x, y)
    out = out[:-1]  # quita la línea en blanco final para agrupar
    if title:
        out += _ae_text(f'{var}T', f'{name}_title', title, title_size, title_color, x, y - (20 if subtitle else 0))
    if subtitle:
        out += _ae_text(f'{var}S', f'{name}_subtitle', subtitle, subtitle_size, subtitle_color, x, y + 44)
    out.append('')
    return out


def _hexc(value, fallback):
    """Devuelve un color HEX usable; cae al fallback si viene vacío o rgba()."""
    if isinstance(value, str) and value.strip().startswith('#'):
        return value.strip()
    return fallback


def _split(s, sep=','):
    """Parte 'a,b,c' en lista de strings (tolera None / listas ya hechas)."""
    if s is None:
        return []
    if isinstance(s, list):
        return [str(i) for i in s]
    return [p.strip() for p in str(s).split(sep) if p.strip() != '']


def _nums(s, sep=','):
    """Parte 'a,b,c' en lista de floats (ignora no-numéricos)."""
    out = []
    for p in _split(s, sep):
        try:
            out.append(float(p))
        except (TypeError, ValueError):
            pass
    return out


def _norm_values(data):
    """Extrae números de una lista [num] o [{value|y}]."""
    out = []
    cols = []
    for d in (data or []):
        if isinstance(d, dict):
            out.append(float(d.get('value', d.get('y', 0)) or 0))
            cols.append(d.get('color'))
        else:
            try:
                out.append(float(d))
            except (TypeError, ValueError):
                out.append(0.0)
            cols.append(None)
    return out, cols


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
    # La mayoría de los bloques de abajo se escribieron usando `parsed_components`
    # como nombre; el parámetro real es `components`. Alias para que TODOS los
    # bloques (no solo los primeros) funcionen (antes lanzaban NameError y el
    # worker caía al fallback en silencio).
    parsed_components = components

    # Algunos bloques antiguos usan `safe_text` asumiendo que un bloque previo
    # (TextReveal) ya lo definió; al descargar un componente individual eso
    # lanzaba UnboundLocalError. Lo definimos una sola vez aquí.
    safe_text = (text or '').replace('"', '\\"').replace("'", "\\'")

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
    if 'GridPerspective' in components:
        bg_props = components['GridPerspective']
        c1 = bg_props.get('color1', '#38bdf8')
        c2 = bg_props.get('color2', '#0f172a')
        parts.append('// GridPerspective')
        parts.append(f'var bgLayer = comp.layers.addSolid({hex_to_rgb_array(c2)}, "GridBackground", {width}, {height}, 1, {duration});')
        parts.append('var gridEffect = bgLayer.property("ADBE Effect Parade").addProperty("ADBE Grid");')
        parts.append(f'gridEffect.property("ADBE Grid-0004").setValue({hex_to_rgb_array(c1)});')
        parts.append('gridEffect.property("ADBE Grid-0002").setValue(100);') # Size
        parts.append('gridEffect.property("ADBE Grid-0003").setValue(2);') # Border
        # Pseudo 3D
        parts.append('bgLayer.threeDLayer = true;')
        parts.append('bgLayer.property("ADBE Transform Group").property("ADBE Rotate X").setValue(75);')
        parts.append('bgLayer.property("ADBE Transform Group").property("ADBE Scale").setValue([300, 300, 100]);')
        parts.append(f'bgLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height}, 0]);')
        # Simple movement animation
        parts.append('var zPos = bgLayer.property("ADBE Transform Group").property("ADBE Position");')
        parts.append('zPos.expression = "value + [0, 0, time * 500]";')
        parts.append('')
        
    if 'ParticleField' in components:
        bg_props = components['ParticleField']
        c1 = bg_props.get('color1', '#ffffff')
        c2 = bg_props.get('color2', '#0f172a')
        parts.append('// ParticleField')
        parts.append(f'var bgLayer = comp.layers.addSolid({hex_to_rgb_array(c2)}, "ParticleBackground", {width}, {height}, 1, {duration});')
        parts.append('var particleEffect = bgLayer.property("ADBE Effect Parade").addProperty("CC Star Burst");')
        parts.append('particleEffect.property("Scatter").setValue(200);')
        parts.append('particleEffect.property("Speed").setValue(0.5);')
        parts.append('particleEffect.property("Grid Spacing").setValue(2);')
        parts.append('particleEffect.property("Size").setValue(60);')
        parts.append('')
        
    if 'RaysOfLight' in components:
        bg_props = components['RaysOfLight']
        c1 = bg_props.get('color1', '#ffffff')
        c2 = bg_props.get('color2', '#0f172a')
        parts.append('// RaysOfLight')
        parts.append(f'var bgLayer = comp.layers.addSolid({hex_to_rgb_array(c2)}, "RaysBackground", {width}, {height}, 1, {duration});')
        # We simulate rays using CC Light Burst on a generated noise/grid or simply by a radial gradient with color mapping
        # For a guaranteed native look, we use a shape layer with a polygon star that rotates
        parts.append('var starLayer = comp.layers.addShape();')
        parts.append('starLayer.name = "Rays";')
        parts.append('var starGroup = starLayer.property("ADBE Root Vectors Group");')
        parts.append('var starShape = starGroup.addProperty("ADBE Vector Shape - Star");')
        parts.append('starShape.property("ADBE Vector Star Type").setValue(2);') # 2 is Star
        parts.append('starShape.property("ADBE Vector Star Points").setValue(12);')
        parts.append(f'starShape.property("ADBE Vector Star Outer Radius").setValue({max(width, height) * 1.5});')
        parts.append('starShape.property("ADBE Vector Star Inner Radius").setValue(0);')
        parts.append('var starFill = starGroup.addProperty("ADBE Vector Graphic - Fill");')
        parts.append(f'starFill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(c1)});')
        parts.append('starLayer.property("ADBE Transform Group").property("ADBE Opacity").setValue(10);')
        parts.append(f'starLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        parts.append('starLayer.property("ADBE Transform Group").property("ADBE Rotation").expression = "time * 15";')
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
        
    if 'GlitchTitle' in parsed_components:
        gt_props = parsed_components['GlitchTitle']
        txt_color = gt_props.get('color', '#ffffff')
        x = gt_props.get('x', int(width / 2))
        y = gt_props.get('y', int(height / 2))
        fs = gt_props.get('fontSize', 80)
        w_box = gt_props.get('width', int(width * 0.9))
        
        parts.append(f'var textLayer = comp.layers.addBoxText([{w_box}, 800], "{safe_text}");')
        parts.append('textLayer.name = "GlitchTitle";')
        parts.append('var td = textLayer.property("Source Text").value;')
        parts.append('td.resetCharStyle();')
        parts.append('td.font = "CourierNewPS-BoldMT";')
        parts.append(f'td.fontSize = {fs};')
        parts.append('td.applyFill = true;')
        parts.append(f'td.fillColor = {hex_to_rgb_array(txt_color)};')
        parts.append('td.justification = ParagraphJustification.CENTER_JUSTIFY;')
        parts.append('textLayer.property("Source Text").setValue(td);')
        parts.append(f'textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{x}, {y}]);')
        
        # Add basic Character Offset animation for Glitch
        parts.append('var textAnimator = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");')
        parts.append('textAnimator.name = "Glitch Animator";')
        parts.append('var animatorProps = textAnimator.property("ADBE Text Animator Properties");')
        parts.append('animatorProps.addProperty("ADBE Text Character Offset").expression = "wiggle(10, 5)";')
        parts.append('var selector = textAnimator.property("ADBE Text Selectors").addProperty("ADBE Text Wiggly");')
        parts.append('')

    if 'HighlightText' in parsed_components:
        ht_props = parsed_components['HighlightText']
        txt_color = ht_props.get('color', '#ffffff')
        hl_color = ht_props.get('highlightColor', '#eab308')
        x = ht_props.get('x', int(width / 2))
        y = ht_props.get('y', int(height / 2))
        fs = ht_props.get('fontSize', 80)
        w_box = ht_props.get('width', int(width * 0.9))

        # Background shape for highlight
        parts.append('var shapeLayer = comp.layers.addShape();')
        parts.append('shapeLayer.name = "Highlight Background";')
        parts.append('var shapeGroup = shapeLayer.property("ADBE Root Vectors Group");')
        parts.append('var rect = shapeGroup.addProperty("ADBE Vector Shape - Rect");')
        parts.append(f'rect.property("ADBE Vector Rect Size").setValue([{w_box}, {fs * 1.2}]);')
        parts.append('var fill = shapeGroup.addProperty("ADBE Vector Graphic - Fill");')
        parts.append(f'fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(hl_color)});')
        parts.append(f'shapeLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{x}, {y + (fs*0.1)}]);')
        parts.append('shapeLayer.property("ADBE Transform Group").property("ADBE Rotation").setValue(-2);')
        
        # Animate shape scale X
        parts.append('var scaleProp = shapeLayer.property("ADBE Transform Group").property("ADBE Scale");')
        parts.append('scaleProp.setValueAtTime(0, [0, 100]);')
        parts.append('scaleProp.setValueAtTime(0.5, [100, 100]);')

        # Text layer
        parts.append(f'var textLayer = comp.layers.addBoxText([{w_box}, 800], "{safe_text}");')
        parts.append('textLayer.name = "HighlightText";')
        parts.append('var td = textLayer.property("Source Text").value;')
        parts.append('td.resetCharStyle();')
        parts.append('td.font = "Arial-BoldMT";')
        parts.append(f'td.fontSize = {fs};')
        parts.append('td.applyFill = true;')
        parts.append(f'td.fillColor = {hex_to_rgb_array(txt_color)};')
        parts.append('td.justification = ParagraphJustification.CENTER_JUSTIFY;')
        parts.append('textLayer.property("Source Text").setValue(td);')
        parts.append(f'textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{x}, {y}]);')
        parts.append('')

    if 'Typewriter' in parsed_components:
        tw_props = parsed_components['Typewriter']
        txt_color = tw_props.get('color', '#ffffff')
        x = tw_props.get('x', int(width / 2))
        y = tw_props.get('y', int(height / 2))
        fs = tw_props.get('fontSize', 60)
        w_box = tw_props.get('width', int(width * 0.9))
        
        parts.append(f'var textLayer = comp.layers.addBoxText([{w_box}, 800], "{safe_text}");')
        parts.append('textLayer.name = "Typewriter";')
        parts.append('var td = textLayer.property("Source Text").value;')
        parts.append('td.resetCharStyle();')
        parts.append('td.font = "CourierNewPS-BoldMT";')
        parts.append(f'td.fontSize = {fs};')
        parts.append('td.applyFill = true;')
        parts.append(f'td.fillColor = {hex_to_rgb_array(txt_color)};')
        parts.append('td.justification = ParagraphJustification.LEFT_JUSTIFY;')
        parts.append('textLayer.property("Source Text").setValue(td);')
        parts.append(f'textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{x}, {y}]);')
        
        parts.append('var textAnimator = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");')
        parts.append('textAnimator.name = "Typewriter Animator";')
        parts.append('var animatorProps = textAnimator.property("ADBE Text Animator Properties");')
        parts.append('animatorProps.addProperty("ADBE Text Opacity").setValue(0);')
        parts.append('var selector = textAnimator.property("ADBE Text Selectors").addProperty("ADBE Text Selector");')
        parts.append('var startProp = selector.property("ADBE Text Percent Start");')
        parts.append('startProp.setValueAtTime(0, 0);')
        # Calculates time needed assuming 10 chars per second
        parts.append(f'startProp.setValueAtTime({len(safe_text) / 10}, 100);')
        parts.append('')
    if 'BrowserWindow' in parsed_components:
        bw_props = parsed_components['BrowserWindow']
        text = safe_text if safe_text else bw_props.get('text', '')
        w_box = bw_props.get('width', 800)
        h_box = bw_props.get('height', 500)
        
        parts.append('// BrowserWindow')
        parts.append('var bwGroup = comp.layers.addShape();')
        parts.append('bwGroup.name = "BrowserWindow";')
        parts.append('var shapeRoot = bwGroup.property("ADBE Root Vectors Group");')
        
        # Main Window
        parts.append('var winRect = shapeRoot.addProperty("ADBE Vector Shape - Rect");')
        parts.append(f'winRect.property("ADBE Vector Rect Size").setValue([{w_box}, {h_box}]);')
        parts.append('winRect.property("ADBE Vector Rect Roundness").setValue(20);')
        parts.append('var winFill = shapeRoot.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('winFill.property("ADBE Vector Fill Color").setValue([1,1,1]);')
        
        # Top Bar (approximate using another rect at the top)
        parts.append('var barGroup = shapeRoot.addProperty("ADBE Vector Group");')
        parts.append('var barRoot = barGroup.property("ADBE Vectors Group");')
        parts.append('var barRect = barRoot.addProperty("ADBE Vector Shape - Rect");')
        parts.append(f'barRect.property("ADBE Vector Rect Size").setValue([{w_box}, 40]);')
        parts.append(f'barRect.property("ADBE Vector Rect Position").setValue([0, -{h_box/2 - 20}]);')
        parts.append('var barFill = barRoot.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('barFill.property("ADBE Vector Fill Color").setValue([0.95,0.96,0.98]);')
        
        # Three dots (red, yellow, green)
        colors = [[0.93, 0.26, 0.26], [0.96, 0.62, 0.04], [0.06, 0.72, 0.5]]
        for i, color in enumerate(colors):
            parts.append(f'var dotGroup{i} = shapeRoot.addProperty("ADBE Vector Group");')
            parts.append(f'var dotRoot{i} = dotGroup{i}.property("ADBE Vectors Group");')
            parts.append(f'var dotEllipse{i} = dotRoot{i}.addProperty("ADBE Vector Shape - Ellipse");')
            parts.append(f'dotEllipse{i}.property("ADBE Vector Ellipse Size").setValue([12, 12]);')
            parts.append(f'dotEllipse{i}.property("ADBE Vector Ellipse Position").setValue([{-w_box/2 + 30 + (i*20)}, -{h_box/2 - 20}]);')
            parts.append(f'var dotFill{i} = dotRoot{i}.addProperty("ADBE Vector Graphic - Fill");')
            parts.append(f'dotFill{i}.property("ADBE Vector Fill Color").setValue({color});')
            
        parts.append(f'bwGroup.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        
        # Text layer
        if text:
            parts.append(f'var textLayer = comp.layers.addBoxText([{w_box-80}, {h_box-80}], "{text}");')
            parts.append('textLayer.name = "BrowserText";')
            parts.append('var td = textLayer.property("Source Text").value;')
            parts.append('td.resetCharStyle();')
            parts.append('td.font = "Arial-BoldMT";')
            parts.append('td.fontSize = 60;')
            parts.append('td.applyFill = true;')
            parts.append('td.fillColor = [0.1,0.1,0.1];')
            parts.append('td.justification = ParagraphJustification.CENTER_JUSTIFY;')
            parts.append('textLayer.property("Source Text").setValue(td);')
            parts.append(f'textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        parts.append('')

    if 'SearchEngineTyping' in parsed_components:
        se_props = parsed_components['SearchEngineTyping']
        text = safe_text if safe_text else se_props.get('text', '')
        w_box = se_props.get('width', 900)
        
        parts.append('// SearchEngineTyping')
        parts.append('var seGroup = comp.layers.addShape();')
        parts.append('seGroup.name = "SearchBar";')
        parts.append('var shapeRoot = seGroup.property("ADBE Root Vectors Group");')
        parts.append('var rect = shapeRoot.addProperty("ADBE Vector Shape - Rect");')
        parts.append(f'rect.property("ADBE Vector Rect Size").setValue([{w_box}, 100]);')
        parts.append('rect.property("ADBE Vector Rect Roundness").setValue(50);')
        parts.append('var fill = shapeRoot.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('fill.property("ADBE Vector Fill Color").setValue([1,1,1]);')
        parts.append(f'seGroup.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        
        if text:
            parts.append(f'var textLayer = comp.layers.addBoxText([{w_box-100}, 80], "{text}");')
            parts.append('textLayer.name = "SearchText";')
            parts.append('var td = textLayer.property("Source Text").value;')
            parts.append('td.resetCharStyle();')
            parts.append('td.fontSize = 45;')
            parts.append('td.applyFill = true;')
            parts.append('td.fillColor = [0.1,0.1,0.1];')
            parts.append('td.justification = ParagraphJustification.LEFT_JUSTIFY;')
            parts.append('textLayer.property("Source Text").setValue(td);')
            parts.append(f'textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2 + 20}, {height/2}]);')
            
            # Simple typing animation
            parts.append('var textAnimator = textLayer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");')
            parts.append('var animatorProps = textAnimator.property("ADBE Text Animator Properties");')
            parts.append('animatorProps.addProperty("ADBE Text Opacity").setValue(0);')
            parts.append('var selector = textAnimator.property("ADBE Text Selectors").addProperty("ADBE Text Selector");')
            parts.append('var startProp = selector.property("ADBE Text Percent Start");')
            parts.append('startProp.setValueAtTime(0, 0);')
            parts.append(f'startProp.setValueAtTime({len(text)/15}, 100);')
        parts.append('')

    if 'PhoneMockup' in parsed_components:
        pm_props = parsed_components['PhoneMockup']
        text = safe_text if safe_text else pm_props.get('text', '')
        
        parts.append('// PhoneMockup')
        parts.append('var pmLayer = comp.layers.addShape();')
        parts.append('pmLayer.name = "PhoneMockup";')
        parts.append('var shapeRoot = pmLayer.property("ADBE Root Vectors Group");')
        parts.append('var rect = shapeRoot.addProperty("ADBE Vector Shape - Rect");')
        parts.append('rect.property("ADBE Vector Rect Size").setValue([450, 800]);')
        parts.append('rect.property("ADBE Vector Rect Roundness").setValue(50);')
        parts.append('var fill = shapeRoot.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('fill.property("ADBE Vector Fill Color").setValue([1,1,1]);')
        parts.append('var stroke = shapeRoot.addProperty("ADBE Vector Graphic - Stroke");')
        parts.append('stroke.property("ADBE Vector Stroke Color").setValue([0.1,0.1,0.1]);')
        parts.append('stroke.property("ADBE Vector Stroke Width").setValue(14);')
        
        parts.append('var pos = pmLayer.property("ADBE Transform Group").property("ADBE Position");')
        parts.append(f'pos.setValueAtTime(0, [{width/2}, {height + 500}]);')
        parts.append(f'pos.setValueAtTime(1, [{width/2}, {height/2}]);')
        
        if text:
            parts.append(f'var textLayer = comp.layers.addBoxText([350, 600], "{text}");')
            parts.append('textLayer.name = "PhoneText";')
            parts.append('var td = textLayer.property("Source Text").value;')
            parts.append('td.fontSize = 48;')
            parts.append('td.applyFill = true;')
            parts.append('td.fillColor = [0.1,0.1,0.1];')
            parts.append('td.justification = ParagraphJustification.CENTER_JUSTIFY;')
            parts.append('textLayer.property("Source Text").setValue(td);')
            parts.append('var textPos = textLayer.property("ADBE Transform Group").property("ADBE Position");')
            parts.append(f'textPos.setValueAtTime(0, [{width/2}, {height + 500}]);')
            parts.append(f'textPos.setValueAtTime(1, [{width/2}, {height/2}]);')
        parts.append('')

    if 'BarChartReveal' in parsed_components:
        bc_props = parsed_components['BarChartReveal']
        c1 = bc_props.get('color1', '#3b82f6')

        # Data puede ser [num,...] o [{value,label,color},...]. Normalizar.
        raw_data = bc_props.get('data') or [30, 50, 75, 45, 90]
        values = []
        per_bar_colors = []
        for d in raw_data:
            if isinstance(d, dict):
                values.append(float(d.get('value', 0) or 0))
                per_bar_colors.append(d.get('color'))
            else:
                values.append(float(d or 0))
                per_bar_colors.append(None)
        # `colors` a nivel componente (lista) como fallback por barra.
        comp_colors = bc_props.get('colors') or []
        max_value = float(bc_props.get('maxValue', 100) or 100)

        parts.append('// BarChartReveal')
        parts.append('var bcGroup = comp.layers.addShape();')
        parts.append('bcGroup.name = "BarChartReveal";')
        parts.append('var shapeRoot = bcGroup.property("ADBE Root Vectors Group");')

        n = max(1, len(values))
        barWidth = 140
        gap = 20
        totalWidth = (barWidth * n) + (gap * (n - 1))
        startX = -totalWidth / 2 + barWidth / 2

        for i, val in enumerate(values):
            bar_color = per_bar_colors[i] or (comp_colors[i] if i < len(comp_colors) else None) or c1
            parts.append(f'var barGroup{i} = shapeRoot.addProperty("ADBE Vector Group");')
            parts.append(f'var barRoot{i} = barGroup{i}.property("ADBE Vectors Group");')
            parts.append(f'var barRect{i} = barRoot{i}.addProperty("ADBE Vector Shape - Rect");')
            parts.append(f'barRect{i}.property("ADBE Vector Rect Size").setValue([{barWidth}, 500]);')
            parts.append(f'barRect{i}.property("ADBE Vector Rect Roundness").setValue(16);')
            # Anchor en la base de la barra para que escale hacia arriba.
            parts.append(f'var barTransform{i} = barGroup{i}.property("ADBE Vector Transform Group");')
            parts.append(f'barTransform{i}.property("ADBE Vector Anchor").setValue([0, 250]);')
            parts.append(f'barTransform{i}.property("ADBE Vector Position").setValue([{startX + i * (barWidth + gap)}, 250]);')

            parts.append(f'var fill{i} = barRoot{i}.addProperty("ADBE Vector Graphic - Fill");')
            parts.append(f'fill{i}.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(bar_color)});')

            # Animación Scale Y (escalonada), normalizada a maxValue.
            parts.append(f'var scaleProp{i} = barTransform{i}.property("ADBE Vector Scale");')
            startTime = i * 0.15
            targetScale = (val / max_value) * 100.0
            parts.append(f'scaleProp{i}.setValueAtTime({startTime}, [100, 0]);')
            parts.append(f'scaleProp{i}.setValueAtTime({startTime + 0.5}, [100, {targetScale}]);')
            parts.append(f'scaleProp{i}.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')

        parts.append(f'bcGroup.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        parts.append('')

    if 'TrendLine' in parsed_components:
        tl_props = parsed_components['TrendLine']
        color = tl_props.get('color', '#10b981')
        
        parts.append('// TrendLine')
        parts.append('var tlLayer = comp.layers.addShape();')
        parts.append('tlLayer.name = "TrendLine";')
        parts.append('var shapeRoot = tlLayer.property("ADBE Root Vectors Group");')
        parts.append('var group = shapeRoot.addProperty("ADBE Vector Group");')
        parts.append('var vectors = group.property("ADBE Vectors Group");')
        parts.append('var path = vectors.addProperty("ADBE Vector Shape - Group");')
        
        # Hardcode a growth path shape
        parts.append('var pathData = new Shape();')
        parts.append('pathData.vertices = [[-400, 200], [-300, 150], [-200, 180], [-100, 80], [0, 100], [100, -25], [200, 25], [300, -125], [400, -100]];')
        parts.append('pathData.closed = false;')
        parts.append('path.property("ADBE Vector Shape").setValue(pathData);')
        
        parts.append('var stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");')
        parts.append(f'stroke.property("ADBE Vector Stroke Color").setValue({hex_to_rgb_array(color)});')
        parts.append('stroke.property("ADBE Vector Stroke Width").setValue(12);')
        parts.append('stroke.property("ADBE Vector Stroke Line Cap").setValue(2);') # Round cap
        parts.append('stroke.property("ADBE Vector Stroke Line Join").setValue(2);') # Round join
        
        # Trim Paths animation
        parts.append('var trim = vectors.addProperty("ADBE Vector Filter - Trim");')
        parts.append('var trimEnd = trim.property("ADBE Vector Trim End");')
        parts.append('trimEnd.setValueAtTime(0, 0);')
        parts.append('trimEnd.setValueAtTime(2, 100);')
        parts.append('trimEnd.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
        
        parts.append(f'tlLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        parts.append('')

    if 'PercentageRing' in parsed_components:
        pr_props = parsed_components['PercentageRing']
        color = pr_props.get('color', '#8b5cf6')
        target = pr_props.get('targetPercentage', 85)
        
        parts.append('// PercentageRing')
        parts.append('var prLayer = comp.layers.addShape();')
        parts.append('prLayer.name = "PercentageRing";')
        parts.append('var shapeRoot = prLayer.property("ADBE Root Vectors Group");')
        
        # Background ring
        parts.append('var bgGroup = shapeRoot.addProperty("ADBE Vector Group");')
        parts.append('var bgVectors = bgGroup.property("ADBE Vectors Group");')
        parts.append('var bgEllipse = bgVectors.addProperty("ADBE Vector Shape - Ellipse");')
        parts.append('bgEllipse.property("ADBE Vector Ellipse Size").setValue([400, 400]);')
        parts.append('var bgStroke = bgVectors.addProperty("ADBE Vector Graphic - Stroke");')
        parts.append('bgStroke.property("ADBE Vector Stroke Color").setValue([1,1,1]);')
        parts.append('bgStroke.property("ADBE Vector Stroke Width").setValue(32);')
        parts.append('bgGroup.property("ADBE Vector Transform Group").property("ADBE Vector Opacity").setValue(10);')
        
        # Foreground animated ring
        parts.append('var fgGroup = shapeRoot.addProperty("ADBE Vector Group");')
        parts.append('var fgVectors = fgGroup.property("ADBE Vectors Group");')
        parts.append('var fgEllipse = fgVectors.addProperty("ADBE Vector Shape - Ellipse");')
        parts.append('fgEllipse.property("ADBE Vector Ellipse Size").setValue([400, 400]);')
        parts.append('var fgStroke = fgVectors.addProperty("ADBE Vector Graphic - Stroke");')
        parts.append(f'fgStroke.property("ADBE Vector Stroke Color").setValue({hex_to_rgb_array(color)});')
        parts.append('fgStroke.property("ADBE Vector Stroke Width").setValue(32);')
        parts.append('fgStroke.property("ADBE Vector Stroke Line Cap").setValue(2);')
        
        # Trim paths
        parts.append('var trim = fgVectors.addProperty("ADBE Vector Filter - Trim");')
        parts.append('var trimEnd = trim.property("ADBE Vector Trim End");')
        parts.append('trimEnd.setValueAtTime(0, 0);')
        parts.append(f'trimEnd.setValueAtTime(1.5, {target});')
        parts.append('trimEnd.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
        
        # Rotate -90 so it starts from top
        parts.append('fgGroup.property("ADBE Vector Transform Group").property("ADBE Vector Rotation").setValue(-90);')
        
        parts.append(f'prLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        
        # Animated text number in the center
        parts.append('var textLayer = comp.layers.addText("0%");')
        parts.append('textLayer.name = "PercentageText";')
        parts.append('var td = textLayer.property("Source Text").value;')
        parts.append('td.resetCharStyle();')
        parts.append('td.font = "Arial-BoldMT";')
        parts.append('td.fontSize = 100;')
        parts.append('td.applyFill = true;')
        parts.append('td.fillColor = [1,1,1];')
        parts.append('td.justification = ParagraphJustification.CENTER_JUSTIFY;')
        parts.append('textLayer.property("Source Text").setValue(td);')
        
        # Use an expression slider to animate the number smoothly
        parts.append('var sliderEffect = textLayer.property("ADBE Effect Parade").addProperty("ADBE Slider Control");')
        parts.append('var sliderProp = sliderEffect.property("ADBE Slider Control-0001");')
        parts.append('sliderProp.setValueAtTime(0, 0);')
        parts.append(f'sliderProp.setValueAtTime(1.5, {target});')
        parts.append('sliderProp.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
        
        parts.append('textLayer.property("Source Text").expression = "Math.round(effect(\\"Slider Control\\")(\\"Slider\\")) + \\"%\\"";')
        parts.append(f'textLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2 + 35}]);')
        parts.append('')

    if 'NetworkNodes' in parsed_components:
        nn_props = parsed_components['NetworkNodes']
        n_color = nn_props.get('nodeColor', '#38bdf8')
        l_color = nn_props.get('lineColor', '#38bdf8')
        
        parts.append('// NetworkNodes')
        parts.append('var nnLayer = comp.layers.addShape();')
        parts.append('nnLayer.name = "NetworkNodes";')
        parts.append('var shapeRoot = nnLayer.property("ADBE Root Vectors Group");')
        
        # Hardcode positions to match React
        nodes = [[0, -200, 25], [-250, 0, 15], [250, 50, 20], [-150, 200, 18], [150, 150, 22], [50, -50, 30]]
        connections = [[0,5], [1,5], [2,5], [3,5], [4,5], [0,1], [0,2], [1,3], [2,4], [3,4]]
        
        # Draw lines first (so they are under nodes)
        for i, (a, b) in enumerate(connections):
            parts.append(f'var lineGroup{i} = shapeRoot.addProperty("ADBE Vector Group");')
            parts.append(f'var lineVec{i} = lineGroup{i}.property("ADBE Vectors Group");')
            parts.append(f'var pathGroup{i} = lineVec{i}.addProperty("ADBE Vector Shape - Group");')
            parts.append('var pathData = new Shape();')
            parts.append(f'pathData.vertices = [[{nodes[a][0]}, {nodes[a][1]}], [{nodes[b][0]}, {nodes[b][1]}]];')
            parts.append('pathData.closed = false;')
            parts.append(f'pathGroup{i}.property("ADBE Vector Shape").setValue(pathData);')
            
            parts.append(f'var stroke{i} = lineVec{i}.addProperty("ADBE Vector Graphic - Stroke");')
            parts.append(f'stroke{i}.property("ADBE Vector Stroke Color").setValue({hex_to_rgb_array(l_color)});')
            parts.append(f'stroke{i}.property("ADBE Vector Stroke Width").setValue(4);')
            # Pulse opacity
            parts.append(f'var opacityProp = lineGroup{i}.property("ADBE Vector Transform Group").property("ADBE Vector Opacity");')
            parts.append(f'opacityProp.expression = "50 + Math.sin(time*2 + {i}) * 40";')
            
        # Draw nodes
        for i, n in enumerate(nodes):
            parts.append(f'var nodeGroup{i} = shapeRoot.addProperty("ADBE Vector Group");')
            parts.append(f'var nodeVec{i} = nodeGroup{i}.property("ADBE Vectors Group");')
            parts.append(f'var ellipse{i} = nodeVec{i}.addProperty("ADBE Vector Shape - Ellipse");')
            parts.append(f'ellipse{i}.property("ADBE Vector Ellipse Size").setValue([{n[2]*2}, {n[2]*2}]);')
            parts.append(f'ellipse{i}.property("ADBE Vector Ellipse Position").setValue([{n[0]}, {n[1]}]);')
            parts.append(f'var fill{i} = nodeVec{i}.addProperty("ADBE Vector Graphic - Fill");')
            parts.append(f'fill{i}.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(n_color)});')
            
            # Pulse scale
            parts.append(f'var scaleProp = nodeGroup{i}.property("ADBE Vector Transform Group").property("ADBE Vector Scale");')
            parts.append(f'scaleProp.expression = "var s = 100 + Math.sin(time*3 + {i}) * 10; [s, s]";')

        parts.append(f'nnLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        parts.append('')

    if 'AbstractWave' in parsed_components:
        aw_props = parsed_components['AbstractWave']
        color = aw_props.get('color', '#818cf8')
        
        parts.append('// AbstractWave (using Wave Warp)')
        for i in range(3):
            parts.append(f'var awLayer{i} = comp.layers.addShape();')
            parts.append(f'awLayer{i}.name = "AbstractWave_{i}";')
            parts.append(f'var shapeRoot{i} = awLayer{i}.property("ADBE Root Vectors Group");')
            parts.append(f'var group{i} = shapeRoot{i}.addProperty("ADBE Vector Group");')
            parts.append(f'var vectors{i} = group{i}.property("ADBE Vectors Group");')
            parts.append(f'var path{i} = vectors{i}.addProperty("ADBE Vector Shape - Group");')
            
            # Simple straight line across screen
            parts.append('var pathData = new Shape();')
            parts.append(f'pathData.vertices = [[-{width/2}, 0], [{width/2}, 0]];')
            parts.append('pathData.closed = false;')
            parts.append(f'path{i}.property("ADBE Vector Shape").setValue(pathData);')
            
            parts.append(f'var stroke{i} = vectors{i}.addProperty("ADBE Vector Graphic - Stroke");')
            parts.append(f'stroke{i}.property("ADBE Vector Stroke Color").setValue({hex_to_rgb_array(color)});')
            parts.append(f'stroke{i}.property("ADBE Vector Stroke Width").setValue({12 - i*3});')
            
            parts.append(f'awLayer{i}.property("ADBE Transform Group").property("ADBE Opacity").setValue({100 - i*25});')
            parts.append(f'awLayer{i}.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
            
            # Apply native AE Wave Warp
            parts.append(f'var waveWarp = awLayer{i}.property("ADBE Effect Parade").addProperty("ADBE Wave Warp");')
            parts.append(f'waveWarp.property("ADBE Wave Warp-0002").setValue({200 + i*50});') # Wave Height
            parts.append(f'waveWarp.property("ADBE Wave Warp-0003").setValue({800 + i*200});') # Wave Width
            parts.append(f'waveWarp.property("ADBE Wave Warp-0005").setValue({1 + i*0.5});') # Wave Speed
        parts.append('')

    if 'FloatingBlobs' in parsed_components:
        fb_props = parsed_components['FloatingBlobs']
        c1 = fb_props.get('color1', '#f43f5e')
        c2 = fb_props.get('color2', '#f59e0b')
        
        parts.append('// FloatingBlobs (Gooey effect via Box Blur + Simple Choker)')
        parts.append('var blobComp = comp.layers.addShape();')
        parts.append('blobComp.name = "FloatingBlobs";')
        
        # We need an adjustment layer or apply effects to the layer itself
        parts.append('var shapeRoot = blobComp.property("ADBE Root Vectors Group");')
        
        # Blob 1
        parts.append('var b1Group = shapeRoot.addProperty("ADBE Vector Group");')
        parts.append('var b1Vec = b1Group.property("ADBE Vectors Group");')
        parts.append('var b1Ellipse = b1Vec.addProperty("ADBE Vector Shape - Ellipse");')
        parts.append('b1Ellipse.property("ADBE Vector Ellipse Size").setValue([500, 400]);') # Squished
        parts.append('var b1Fill = b1Vec.addProperty("ADBE Vector Graphic - Fill");')
        parts.append(f'b1Fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(c1)});')
        parts.append('var b1Rot = b1Group.property("ADBE Vector Transform Group").property("ADBE Vector Rotation");')
        parts.append('b1Rot.expression = "time * 40";')
        parts.append('var b1Pos = b1Group.property("ADBE Vector Transform Group").property("ADBE Vector Position");')
        parts.append('b1Pos.expression = "[Math.sin(time)*100, Math.cos(time)*50]";')

        # Blob 2
        parts.append('var b2Group = shapeRoot.addProperty("ADBE Vector Group");')
        parts.append('var b2Vec = b2Group.property("ADBE Vectors Group");')
        parts.append('var b2Ellipse = b2Vec.addProperty("ADBE Vector Shape - Ellipse");')
        parts.append('b2Ellipse.property("ADBE Vector Ellipse Size").setValue([350, 450]);')
        parts.append('var b2Fill = b2Vec.addProperty("ADBE Vector Graphic - Fill");')
        parts.append(f'b2Fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(c2)});')
        parts.append('var b2Rot = b2Group.property("ADBE Vector Transform Group").property("ADBE Vector Rotation");')
        parts.append('b2Rot.expression = "time * -30";')
        parts.append('var b2Pos = b2Group.property("ADBE Vector Transform Group").property("ADBE Vector Position");')
        parts.append('b2Pos.expression = "[Math.sin(time*1.2)*-100, Math.cos(time*0.8)*-80]";')

        parts.append(f'blobComp.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        
        # The Gooey Magic
        parts.append('var blur = blobComp.property("ADBE Effect Parade").addProperty("ADBE Fast Blur");')
        parts.append('blur.property("ADBE Fast Blur-0001").setValue(150);') # Blurriness
        
        parts.append('var choker = blobComp.property("ADBE Effect Parade").addProperty("ADBE Simple Choker");')
        parts.append('choker.property("ADBE Simple Choker-0001").setValue(40);') # Choke Matte (negative makes it fatter, positive thinner, we need to harden edges)
        # Actually in AE Simple choker positive chokes (shrinks). 
        # A more precise way in AE is Levels, but Simple Choker usually does the trick for vector blobs if we blur enough.
        
        parts.append('')

    if 'GlobalVFX' in parsed_components:
        parts.append('// GlobalVFX (Adjustment Layer for Grain and Lens Curve)')
        parts.append('var vfxLayer = comp.layers.addShape();')
        parts.append('vfxLayer.name = "GlobalVFX";')
        parts.append('vfxLayer.adjustmentLayer = true;')
        parts.append('var shapeRoot = vfxLayer.property("ADBE Root Vectors Group");')
        parts.append('var rect = shapeRoot.addProperty("ADBE Vector Shape - Rect");')
        parts.append(f'rect.property("ADBE Vector Rect Size").setValue([{width}, {height}]);')
        parts.append('var fill = shapeRoot.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('fill.property("ADBE Vector Fill Color").setValue([1,1,1]);')
        parts.append(f'vfxLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        
        # Noise
        parts.append('var noise = vfxLayer.property("ADBE Effect Parade").addProperty("ADBE Noise");')
        parts.append('noise.property("ADBE Noise-0001").setValue(15);') # Amount
        
        # Optics Compensation (Lens curve)
        parts.append('var optics = vfxLayer.property("ADBE Effect Parade").addProperty("ADBE Optics Compensation");')
        parts.append('optics.property("ADBE Optics Compensation-0001").setValue(60);') # FOV
        parts.append('optics.property("ADBE Optics Compensation-0002").setValue(1);') # Reverse distortion
        parts.append('')

    if 'SocialProgressBar' in parsed_components:
        parts.append('// SocialProgressBar')
        parts.append('var pbLayer = comp.layers.addShape();')
        parts.append('pbLayer.name = "SocialProgressBar";')
        parts.append('var shapeRoot = pbLayer.property("ADBE Root Vectors Group");')
        parts.append('var rectGroup = shapeRoot.addProperty("ADBE Vector Group");')
        parts.append('var rectVec = rectGroup.property("ADBE Vectors Group");')
        parts.append('var rect = rectVec.addProperty("ADBE Vector Shape - Rect");')
        parts.append(f'rect.property("ADBE Vector Rect Size").setValue([{width}, 6]);')
        # Anchor at left
        parts.append(f'rect.property("ADBE Vector Rect Position").setValue([{width/2}, 0]);')
        
        parts.append('var fill = rectVec.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('fill.property("ADBE Vector Fill Color").setValue([1,1,1]);')
        
        parts.append(f'pbLayer.property("ADBE Transform Group").property("ADBE Position").setValue([0, {height - 20}]);')
        
        parts.append('var scale = rectGroup.property("ADBE Vector Transform Group").property("ADBE Vector Scale");')
        parts.append('scale.setValueAtTime(0, [0, 100]);')
        parts.append('scale.setValueAtTime(comp.duration, [100, 100]);')
        parts.append('')

    if 'SubscribeButton' in parsed_components:
        sub_props = parsed_components['SubscribeButton']
        click_frame = sub_props.get('clickFrame', 90)
        click_time = click_frame / 30.0
        btn_color = sub_props.get('color', '#FF0000')
        btn_clicked_color = sub_props.get('clickedColor', '#333333')
        
        parts.append('// SubscribeButton')
        parts.append('var subLayer = comp.layers.addShape();')
        parts.append('subLayer.name = "SubscribeButton_BG";')
        parts.append('var shapeRoot = subLayer.property("ADBE Root Vectors Group");')
        parts.append('var rectGroup = shapeRoot.addProperty("ADBE Vector Group");')
        parts.append('var rectVec = rectGroup.property("ADBE Vectors Group");')
        parts.append('var rect = rectVec.addProperty("ADBE Vector Shape - Rect");')
        parts.append('rect.property("ADBE Vector Rect Size").setValue([300, 80]);')
        parts.append('rect.property("ADBE Vector Rect Roundness").setValue(40);')
        
        parts.append('var fill = rectVec.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('var colorProp = fill.property("ADBE Vector Fill Color");')
        parts.append(f'colorProp.setValueAtTime({click_time - 0.05}, {hex_to_rgb_array(btn_color)});')
        parts.append(f'colorProp.setValueAtTime({click_time}, {hex_to_rgb_array(btn_clicked_color)});')
        
        parts.append(f'subLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height - 200}]);')
        
        parts.append('var scale = subLayer.property("ADBE Transform Group").property("ADBE Scale");')
        parts.append(f'scale.setValueAtTime({click_time - 0.1}, [100, 100]);')
        parts.append(f'scale.setValueAtTime({click_time}, [90, 90]);')
        parts.append(f'scale.setValueAtTime({click_time + 0.1}, [100, 100]);')
        parts.append('')

    if 'ProductCardReveal' in parsed_components:
        prod_props = parsed_components['ProductCardReveal']
        title = prod_props.get('title', 'Limited Edition Sneakers')
        price = prod_props.get('price', '$199.99')
        
        parts.append('// ProductCardReveal')
        parts.append('var cardLayer = comp.layers.addShape();')
        parts.append('cardLayer.name = "ProductCardReveal";')
        parts.append('var shapeRoot = cardLayer.property("ADBE Root Vectors Group");')
        parts.append('var rectGroup = shapeRoot.addProperty("ADBE Vector Group");')
        parts.append('var rectVec = rectGroup.property("ADBE Vectors Group");')
        parts.append('var rect = rectVec.addProperty("ADBE Vector Shape - Rect");')
        parts.append('rect.property("ADBE Vector Rect Size").setValue([500, 650]);')
        parts.append('rect.property("ADBE Vector Rect Roundness").setValue(30);')
        parts.append('var fill = rectVec.addProperty("ADBE Vector Graphic - Fill");')
        card_bg = prod_props.get('bgColor', '#ffffff')
        parts.append(f'fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(card_bg)});')
        
        # Bouncy entrance
        parts.append('var pos = cardLayer.property("ADBE Transform Group").property("ADBE Position");')
        parts.append(f'pos.setValueAtTime(0, [{width/2}, {height + 400}]);')
        parts.append(f'pos.setValueAtTime(0.6, [{width/2}, {height/2}]);')
        parts.append(f'pos.setValueAtTime(0.8, [{width/2}, {height/2 + 20}]);')
        parts.append(f'pos.setValueAtTime(1.0, [{width/2}, {height/2}]);')
        parts.append('pos.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
        parts.append('pos.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
        parts.append('pos.setInterpolationTypeAtKey(3, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
        
        # Title
        parts.append('var titleLayer = comp.layers.addText();')
        parts.append('var textProp = titleLayer.property("Source Text");')
        parts.append('var textDoc = textProp.value;')
        parts.append(f'textDoc.text = "{title}";')
        parts.append('textDoc.fontSize = 36;')
        card_text_color = prod_props.get('textColor', '#0f172a')
        parts.append(f'textDoc.fillColor = {hex_to_rgb_array(card_text_color)};')
        parts.append('textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;')
        parts.append('textProp.setValue(textDoc);')
        parts.append(f'titleLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2 + 100}]);')
        parts.append('titleLayer.parent = cardLayer;')

        # Price Button
        parts.append('var pLayer = comp.layers.addShape();')
        parts.append('var pRoot = pLayer.property("ADBE Root Vectors Group");')
        parts.append('var pGroup = pRoot.addProperty("ADBE Vector Group");')
        parts.append('var pVec = pGroup.property("ADBE Vectors Group");')
        parts.append('var pRect = pVec.addProperty("ADBE Vector Shape - Rect");')
        parts.append('pRect.property("ADBE Vector Rect Size").setValue([200, 60]);')
        parts.append('pRect.property("ADBE Vector Rect Roundness").setValue(30);')
        parts.append('var pFill = pVec.addProperty("ADBE Vector Graphic - Fill");')
        price_color = prod_props.get('priceColor', '#10b981')
        parts.append(f'pFill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(price_color)});')
        parts.append(f'pLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2 + 180}]);')
        parts.append('pLayer.parent = cardLayer;')
        
        parts.append('var priceTextLayer = comp.layers.addText();')
        parts.append('var pTextProp = priceTextLayer.property("Source Text");')
        parts.append('var pTextDoc = pTextProp.value;')
        parts.append(f'pTextDoc.text = "{price}";')
        parts.append('pTextDoc.fontSize = 42;')
        parts.append('pTextDoc.fillColor = [1, 1, 1];')
        parts.append('pTextDoc.justification = ParagraphJustification.CENTER_JUSTIFY;')
        parts.append('pTextProp.setValue(pTextDoc);')
        parts.append(f'priceTextLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2 + 195}]);')
        parts.append('priceTextLayer.parent = cardLayer;')
        parts.append('')

    if 'TestimonialReview' in parsed_components:
        rev_props = parsed_components['TestimonialReview']
        rating = rev_props.get('rating', 5)
        
        parts.append('// TestimonialReview (Stars)')
        parts.append('var starsLayer = comp.layers.addShape();')
        parts.append('starsLayer.name = "5_Stars";')
        parts.append('var shapeRoot = starsLayer.property("ADBE Root Vectors Group");')
        
        for i in range(5):
            is_gold = 1 if i < rating else 0
            # Star path using Polystar
            parts.append(f'var starGroup{i} = shapeRoot.addProperty("ADBE Vector Group");')
            parts.append(f'var starVec{i} = starGroup{i}.property("ADBE Vectors Group");')
            parts.append(f'var starShape{i} = starVec{i}.addProperty("ADBE Vector Shape - Star");')
            parts.append(f'starShape{i}.property("ADBE Vector Star Points").setValue(5);')
            parts.append(f'starShape{i}.property("ADBE Vector Star Inner Radius").setValue(10);')
            parts.append(f'starShape{i}.property("ADBE Vector Star Outer Radius").setValue(25);')
            
            parts.append(f'var starFill{i} = starVec{i}.addProperty("ADBE Vector Graphic - Fill");')
            
            # Animating color from grey to gold based on time
            delay = 0.5 + (i * 0.1)
            parts.append(f'var colorProp{i} = starFill{i}.property("ADBE Vector Fill Color");')
            parts.append(f'colorProp{i}.setValueAtTime(0, [0.8, 0.8, 0.8]);')
            if is_gold:
                parts.append(f'colorProp{i}.setValueAtTime({delay}, [0.8, 0.8, 0.8]);')
                star_color = rev_props.get('starColor', '#fbbf24')
                parts.append(f'colorProp{i}.setValueAtTime({delay + 0.1}, {hex_to_rgb_array(star_color)});')
            
            parts.append(f'starGroup{i}.property("ADBE Vector Transform Group").property("ADBE Vector Position").setValue([{(i-2)*60}, 0]);')

        parts.append(f'starsLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        parts.append('')

    if 'ShoppingCartBadge' in parsed_components:
        cart_props = parsed_components['ShoppingCartBadge']
        trigger = cart_props.get('triggerFrame', 60)
        t_time = trigger / 30.0
        
        parts.append('// ShoppingCartBadge')
        parts.append('var badgeLayer = comp.layers.addShape();')
        parts.append('badgeLayer.name = "CartBadge";')
        parts.append('var shapeRoot = badgeLayer.property("ADBE Root Vectors Group");')
        parts.append('var ellipseGroup = shapeRoot.addProperty("ADBE Vector Group");')
        parts.append('var ellipseVec = ellipseGroup.property("ADBE Vectors Group");')
        parts.append('var ellipse = ellipseVec.addProperty("ADBE Vector Shape - Ellipse");')
        parts.append('ellipse.property("ADBE Vector Ellipse Size").setValue([50, 50]);')
        parts.append('var fill = ellipseVec.addProperty("ADBE Vector Graphic - Fill");')
        badge_color = cart_props.get('badgeColor', '#ef4444')
        parts.append(f'fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(badge_color)});')
        
        parts.append(f'badgeLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2 + 40}, {height/2 - 40}]);')
        
        parts.append('var scale = badgeLayer.property("ADBE Transform Group").property("ADBE Scale");')
        parts.append(f'scale.setValueAtTime(0, [0, 0]);')
        parts.append(f'scale.setValueAtTime({t_time - 0.01}, [0, 0]);')
        parts.append(f'scale.setValueAtTime({t_time}, [150, 150]);')
        parts.append(f'scale.setValueAtTime({t_time + 0.1}, [90, 90]);')
        parts.append(f'scale.setValueAtTime({t_time + 0.2}, [100, 100]);')
        parts.append('')

    if 'TinderSwipeCard' in parsed_components:
        ts_props = parsed_components['TinderSwipeCard']
        swipe_frame = ts_props.get('swipeFrame', 90)
        s_time = swipe_frame / 30.0
        
        parts.append('// TinderSwipeCard')
        parts.append('var tCard = comp.layers.addShape();')
        parts.append('tCard.name = "TinderCard";')
        parts.append('var shapeRoot = tCard.property("ADBE Root Vectors Group");')
        parts.append('var rectGroup = shapeRoot.addProperty("ADBE Vector Group");')
        parts.append('var rectVec = rectGroup.property("ADBE Vectors Group");')
        parts.append('var rect = rectVec.addProperty("ADBE Vector Shape - Rect");')
        parts.append('rect.property("ADBE Vector Rect Size").setValue([600, 850]);')
        parts.append('rect.property("ADBE Vector Rect Roundness").setValue(30);')
        parts.append('var fill = rectVec.addProperty("ADBE Vector Graphic - Fill");')
        tinder_bg = ts_props.get('bgColor', '#ffffff')
        parts.append(f'fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(tinder_bg)});')
        
        parts.append('var pos = tCard.property("ADBE Transform Group").property("ADBE Position");')
        parts.append('var rot = tCard.property("ADBE Transform Group").property("ADBE Rotation");')
        
        # Center initially
        parts.append(f'pos.setValueAtTime(0, [{width/2}, {height/2}]);')
        parts.append(f'rot.setValueAtTime(0, 0);')
        
        # Swipe animation (move right and rotate)
        parts.append(f'pos.setValueAtTime({s_time}, [{width/2}, {height/2}]);')
        parts.append(f'pos.setValueAtTime({s_time + 0.5}, [{width/2 + 1000}, {height/2 + 200}]);')
        parts.append(f'rot.setValueAtTime({s_time}, 0);')
        parts.append(f'rot.setValueAtTime({s_time + 0.5}, 25);')
        
        # Match Stamp
        parts.append('var stamp = comp.layers.addText();')
        parts.append('stamp.name = "MATCH_Stamp";')
        parts.append('var textProp = stamp.property("Source Text");')
        parts.append('var textDoc = textProp.value;')
        stamp_color = ts_props.get('stampColor', '#22c55e')
        stamp_text = ts_props.get('stampText', 'MATCH!')
        parts.append(f'textDoc.text = "{stamp_text}";')
        parts.append('textDoc.fontSize = 64;')
        parts.append(f'textDoc.fillColor = {hex_to_rgb_array(stamp_color)};')
        parts.append('textProp.setValue(textDoc);')
        parts.append('stamp.parent = tCard;')
        parts.append(f'stamp.property("ADBE Transform Group").property("ADBE Position").setValue([-150, -200]);')
        parts.append(f'stamp.property("ADBE Transform Group").property("ADBE Rotation").setValue(-15);')
        
        parts.append('var sScale = stamp.property("ADBE Transform Group").property("ADBE Scale");')
        parts.append(f'sScale.setValueAtTime(0, [0, 0]);')
        parts.append(f'sScale.setValueAtTime({s_time + 0.1}, [0, 0]);')
        parts.append(f'sScale.setValueAtTime({s_time + 0.2}, [120, 120]);')
        parts.append(f'sScale.setValueAtTime({s_time + 0.3}, [100, 100]);')
        parts.append('')

    if 'CalendarDatePop' in parsed_components:
        cal_props = parsed_components['CalendarDatePop']
        target_date = cal_props.get('targetDate', 15)
        
        parts.append('// CalendarDatePop')
        parts.append('var calNull = comp.layers.addNull();')
        parts.append('calNull.name = "Calendar_Group";')
        parts.append(f'calNull.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        
        # Generate Grid using JS loop in ExtendScript
        parts.append('var dayCount = 1;')
        parts.append('for (var y = 0; y < 5; y++) {')
        parts.append('  for (var x = 0; x < 7; x++) {')
        parts.append('    if (dayCount > 31) break;')
        parts.append('    if (y === 0 && x < 2) continue; // offset for start of month')
        parts.append('    var dLayer = comp.layers.addText();')
        parts.append('    dLayer.name = "Day_" + dayCount;')
        parts.append('    var dProp = dLayer.property("Source Text");')
        parts.append('    var dDoc = dProp.value;')
        parts.append('    dDoc.text = dayCount.toString();')
        parts.append('    dDoc.fontSize = 24;')
        circle_color = cal_props.get('circleColor', '#ef4444')
        cal_text_color = cal_props.get('textColor', '#334155')
        circle_rgb = hex_to_rgb_array(circle_color)
        text_rgb = hex_to_rgb_array(cal_text_color)
        parts.append(f'    dDoc.fillColor = (dayCount === {target_date}) ? {circle_rgb} : {text_rgb};')
        parts.append('    dDoc.justification = ParagraphJustification.CENTER_JUSTIFY;')
        parts.append('    dProp.setValue(dDoc);')
        parts.append('    dLayer.parent = calNull;')
        parts.append('    dLayer.property("ADBE Transform Group").property("ADBE Position").setValue([(x * 60) - 180, (y * 60) - 60]);')
        
        # Circle target
        parts.append(f'    if (dayCount === {target_date}) {{')
        parts.append('      var circLayer = comp.layers.addShape();')
        parts.append('      circLayer.name = "Red_Circle";')
        parts.append('      var sRoot = circLayer.property("ADBE Root Vectors Group");')
        parts.append('      var cGroup = sRoot.addProperty("ADBE Vector Group");')
        parts.append('      var cVec = cGroup.property("ADBE Vectors Group");')
        parts.append('      var cShape = cVec.addProperty("ADBE Vector Shape - Ellipse");')
        parts.append('      cShape.property("ADBE Vector Ellipse Size").setValue([60, 60]);')
        parts.append('      var cStroke = cVec.addProperty("ADBE Vector Graphic - Stroke");')
        parts.append(f'      cStroke.property("ADBE Vector Stroke Color").setValue({circle_rgb});')
        parts.append('      cStroke.property("ADBE Vector Stroke Width").setValue(4);')
        parts.append('      var trim = cVec.addProperty("ADBE Vector Filter - Trim");')
        parts.append('      trim.property("ADBE Vector Trim End").setValueAtTime(0, 0);')
        parts.append('      trim.property("ADBE Vector Trim End").setValueAtTime(1.5, 0);')
        parts.append('      trim.property("ADBE Vector Trim End").setValueAtTime(2.0, 100);')
        parts.append('      circLayer.parent = dLayer;')
        parts.append('      circLayer.property("ADBE Transform Group").property("ADBE Position").setValue([0, -5]);')
        parts.append('      circLayer.property("ADBE Transform Group").property("ADBE Rotation").setValue(-90);')
        parts.append('    }')
        
        parts.append('    dayCount++;')
        parts.append('  }')
        parts.append('}')
        parts.append('')

    if 'SplitScreenGrid' in parsed_components:
        split_props = parsed_components['SplitScreenGrid']
        split_frame = split_props.get('splitFrame', 60)
        sp_time = split_frame / 30.0
        
        parts.append('// SplitScreenGrid')
        colors = ['[0.93, 0.26, 0.26]', '[0.23, 0.51, 0.96]', '[0.06, 0.72, 0.50]', '[0.96, 0.62, 0.04]']
        target_w = width * 0.495
        target_h = height * 0.495
        
        positions = [
            (target_w/2, target_h/2), 
            (width - target_w/2, target_h/2),
            (target_w/2, height - target_h/2),
            (width - target_w/2, height - target_h/2)
        ]
        
        for i in range(4):
            parts.append(f'var splitPanel{i} = comp.layers.addShape();')
            parts.append(f'splitPanel{i}.name = "SplitPanel_{i}";')
            parts.append(f'var sRoot{i} = splitPanel{i}.property("ADBE Root Vectors Group");')
            parts.append(f'var rGroup{i} = sRoot{i}.addProperty("ADBE Vector Group");')
            parts.append(f'var rVec{i} = rGroup{i}.property("ADBE Vectors Group");')
            parts.append(f'var rShape{i} = rVec{i}.addProperty("ADBE Vector Shape - Rect");')
            parts.append(f'rShape{i}.property("ADBE Vector Rect Size").setValue([{width}, {height}]);')
            parts.append(f'var rFill{i} = rVec{i}.addProperty("ADBE Vector Graphic - Fill");')
            parts.append(f'rFill{i}.property("ADBE Vector Fill Color").setValue({colors[i]});')
            
            parts.append(f'var pos{i} = splitPanel{i}.property("ADBE Transform Group").property("ADBE Position");')
            parts.append(f'pos{i}.setValueAtTime(0, [{width/2}, {height/2}]);')
            parts.append(f'pos{i}.setValueAtTime({sp_time}, [{width/2}, {height/2}]);')
            parts.append(f'pos{i}.setValueAtTime({sp_time + 0.5}, [{positions[i][0]}, {positions[i][1]}]);')
            parts.append(f'pos{i}.setInterpolationTypeAtKey(3, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
            
            parts.append(f'var scale{i} = splitPanel{i}.property("ADBE Transform Group").property("ADBE Scale");')
            parts.append(f'scale{i}.setValueAtTime(0, [100, 100]);')
            parts.append(f'scale{i}.setValueAtTime({sp_time}, [100, 100]);')
            parts.append(f'scale{i}.setValueAtTime({sp_time + 0.5}, [49.5, 49.5]);')
            parts.append(f'scale{i}.setInterpolationTypeAtKey(3, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
            
        parts.append('')

    if 'MusicPlayerUI' in parsed_components:
        parts.append('// MusicPlayerUI')
        parts.append('var mPlayer = comp.layers.addShape();')
        parts.append('mPlayer.name = "MusicPlayer";')
        parts.append('var sRoot = mPlayer.property("ADBE Root Vectors Group");')
        parts.append('var rGroup = sRoot.addProperty("ADBE Vector Group");')
        parts.append('var rVec = rGroup.property("ADBE Vectors Group");')
        parts.append('var rShape = rVec.addProperty("ADBE Vector Shape - Rect");')
        parts.append('rShape.property("ADBE Vector Rect Size").setValue([600, 250]);')
        parts.append('rShape.property("ADBE Vector Rect Roundness").setValue(30);')
        parts.append('var rFill = rVec.addProperty("ADBE Vector Graphic - Fill");')
        music_bg = parsed_components['MusicPlayerUI'].get('bgColor', '#141414')
        parts.append(f'rFill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(music_bg)});')
        parts.append(f'mPlayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height - 300}]);')
        
        # Progress Bar Track
        parts.append('var trackLayer = comp.layers.addShape();')
        parts.append('trackLayer.name = "ProgressTrack";')
        parts.append('var tRoot = trackLayer.property("ADBE Root Vectors Group");')
        parts.append('var tGroup = tRoot.addProperty("ADBE Vector Group");')
        parts.append('var tVec = tGroup.property("ADBE Vectors Group");')
        parts.append('var tShape = tVec.addProperty("ADBE Vector Shape - Rect");')
        parts.append('tShape.property("ADBE Vector Rect Size").setValue([540, 6]);')
        parts.append('var tFill = tVec.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('tFill.property("ADBE Vector Fill Color").setValue([0.2, 0.2, 0.2]);')
        parts.append('trackLayer.parent = mPlayer;')
        parts.append('trackLayer.property("ADBE Transform Group").property("ADBE Position").setValue([0, 20]);')
        
        # Progress Bar Fill (Green)
        parts.append('var fillLayer = comp.layers.addShape();')
        parts.append('fillLayer.name = "ProgressFill";')
        parts.append('var fRoot = fillLayer.property("ADBE Root Vectors Group");')
        parts.append('var fGroup = fRoot.addProperty("ADBE Vector Group");')
        parts.append('var fVec = fGroup.property("ADBE Vectors Group");')
        parts.append('var fShape = fVec.addProperty("ADBE Vector Shape - Rect");')
        parts.append('fShape.property("ADBE Vector Rect Size").setValue([540, 6]);')
        parts.append('fShape.property("ADBE Vector Rect Position").setValue([270, 0]);') # Anchor left
        parts.append('var fFill = fVec.addProperty("ADBE Vector Graphic - Fill");')
        progress_color = parsed_components['MusicPlayerUI'].get('progressColor', '#1db954')
        parts.append(f'fFill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(progress_color)});')
        parts.append('fillLayer.parent = trackLayer;')
        parts.append('fillLayer.property("ADBE Transform Group").property("ADBE Position").setValue([-270, 0]);')
        
        # Animate Scale X
        parts.append('var fScale = fillLayer.property("ADBE Transform Group").property("ADBE Scale");')
        parts.append('fScale.setValueAtTime(0, [0, 100]);')
        parts.append('fScale.setValueAtTime(comp.duration, [100, 100]);')
        parts.append('')

    # ════════════════════════════════════════
    # DEV TOOLS & TECH
    # ════════════════════════════════════════
    
    if 'TerminalHacker' in parsed_components:
        p = parsed_components['TerminalHacker']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_rrect('term', 'TerminalHacker_bg', 900, 600, _hexc(p.get('bgColor'), '#0f172a'), 16, x, y)[:-1]
        parts += _ae_rrect('termH', 'TerminalHacker_header', 900, 60, _hexc(p.get('headerColor'), '#1e293b'), 16, x, y - 270)
        body = '   '.join(_split(p.get('lines'), ';')) or '> running...'
        parts += _ae_text('termT', 'TerminalHacker_lines', body, 28, _hexc(p.get('textColor'), '#22c55e'), x, y)

    if 'APIRequestFlow' in parsed_components:
        p = parsed_components['APIRequestFlow']
        x, y = p.get('x', 540), p.get('y', 960)
        title = f"{p.get('method', 'GET')} {p.get('endpoint', '/api')}"
        parts += _ae_card('api', 'APIRequestFlow', 820, 280, _hexc(p.get('bgColor'), '#1e293b'), x, y,
                          title=title, title_color=_hexc(p.get('color'), '#3b82f6'), title_size=44,
                          subtitle=str(p.get('responseCode', 200)), subtitle_color='#22c55e')

    if 'GitCommitGraph' in parsed_components:
        p = parsed_components['GitCommitGraph']
        x, y = p.get('x', 540), p.get('y', 960)
        n = min(int(p.get('commits') or 4), 8)
        ns = int(p.get('nodeSize') or 24)
        col = _hexc(p.get('nodeColor'), '#3b82f6')
        start = x - (n - 1) * 90 / 2
        for i in range(n):
            parts += _ae_ellipse(f'git{i}', f'GitCommitGraph_{i}', ns * 2, col, start + i * 90, y)

    if 'CodeBlockHighlight' in parsed_components:
        p = parsed_components['CodeBlockHighlight']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_rrect('cbh', 'CodeBlockHighlight_bg', 840, 500, _hexc(p.get('bgColor'), '#0f172a'), 16, x, y)[:-1]
        parts += _ae_rrect('cbhH', 'CodeBlockHighlight_header', 840, 56, _hexc(p.get('headerColor'), '#1e293b'), 16, x, y - 222)
        parts += _ae_text('cbhT', 'CodeBlockHighlight_lang', str(p.get('language', 'code')), 34, _hexc(p.get('accentColor'), '#38bdf8'), x, y)

    if 'NotificationToast' in parsed_components:
        p = parsed_components['NotificationToast']
        x, y = p.get('x', 540), p.get('y', 280)
        w = int(p.get('width') or 0) or 760
        parts += _ae_rrect('toast', 'NotificationToast_bg', w, 180, '#ffffff', 24, x, y)[:-1]
        parts += _ae_rrect('toastI', 'NotificationToast_icon', 90, 90, _hexc(p.get('color'), '#22c55e'), 16, x - w / 2 + 80, y)
        parts += _ae_text('toastT', 'NotificationToast_title', str(p.get('title', 'Notification')), 36, _hexc(p.get('textColor'), '#0f172a'), x + 40, y - 30)
        parts += _ae_text('toastM', 'NotificationToast_msg', str(p.get('message', '')), 28, _hexc(p.get('messageColor'), '#64748b'), x + 40, y + 28)

    if 'LoadingSpinner' in parsed_components:
        p = parsed_components['LoadingSpinner']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_ellipse('spin', 'LoadingSpinner', int(p.get('size') or 100), _hexc(p.get('color'), '#3b82f6'), x, y)
        parts += [
            'var spinRot = spin.property("ADBE Transform Group").property("ADBE Rotate Z");',
            'spinRot.expression = "time * 360";',
            '',
        ]

    # ════════════════════════════════════════
    # PODCAST & AUDIO
    # ════════════════════════════════════════

    if 'AudioSpectrumBars' in parsed_components:
        p = parsed_components['AudioSpectrumBars']
        x, y = p.get('x', 540), p.get('y', 960)
        n = min(int(p.get('barCount') or 15), 24)
        vals = [30 + (i * 37) % 100 for i in range(n)]  # patrón determinista
        parts += _ae_bars('asb', 'AudioSpectrumBars', vals, [None] * n, x, y,
                          width=int(p.get('barWidth', 12)) * n * 2 or 720, height=int(p.get('maxHeight') or 150) * 2,
                          c1=_hexc(p.get('color'), '#10b981'))

    if 'PodcastGuestCard' in parsed_components:
        p = parsed_components['PodcastGuestCard']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_ellipse('pgc', 'PodcastGuestCard_avatar', 220, _hexc(p.get('glowColor'), '#3b82f6'), x, y - 80)
        parts += _ae_text('pgcN', 'PodcastGuestCard_name', str(p.get('name', 'Guest')), 48, '#ffffff', x, y + 90)
        parts += _ae_text('pgcR', 'PodcastGuestCard_role', str(p.get('role', '')), 32, '#94a3b8', x, y + 150)

    if 'MessageBubble' in parsed_components:
        p = parsed_components['MessageBubble']
        x, y = p.get('x', 540), p.get('y', 960)
        w = int(p.get('width') or 600)
        parts += _ae_rrect('mbR', 'MessageBubble_recv', int(w * 0.7), 90, _hexc(p.get('receiverColor'), '#334155'), 24, x - 120, y - 70)[:-1]
        parts += _ae_text('mbRT', 'MessageBubble_recv_txt', 'Hey!', int(p.get('fontSize') or 24), _hexc(p.get('receiverTextColor'), '#ffffff'), x - 120, y - 70)
        parts += _ae_rrect('mbS', 'MessageBubble_send', int(w * 0.7), 90, _hexc(p.get('senderColor'), '#22c55e'), 24, x + 120, y + 70)[:-1]
        parts += _ae_text('mbST', 'MessageBubble_send_txt', 'Awesome!', int(p.get('fontSize') or 24), _hexc(p.get('senderTextColor'), '#ffffff'), x + 120, y + 70)

    if 'WaveformVisualizer' in parsed_components:
        p = parsed_components['WaveformVisualizer']
        x, y = p.get('x', 540), p.get('y', 960)
        vals = [40 + abs(((i * 53) % 160) - 80) for i in range(20)]  # onda determinista
        parts += _ae_bars('wv', 'WaveformVisualizer', vals, [None] * 20, x, y,
                          width=int(p.get('width') or 800), height=int(p.get('amplitude') or 100) * 2,
                          c1=_hexc(p.get('color'), '#8b5cf6'))

    if 'QuoteBlock' in parsed_components:
        p = parsed_components['QuoteBlock']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_text('qb', 'QuoteBlock_text', str(p.get('text', 'Quote')), int(p.get('fontSize') or 48), _hexc(p.get('textColor'), '#ffffff'), x, y)
        parts += _ae_text('qbA', 'QuoteBlock_author', '— ' + str(p.get('author', '')), 34, _hexc(p.get('authorColor'), '#94a3b8'), x, y + 90)

    # ════════════════════════════════════════
    # NEWS, BROADCAST & SPORTS
    # ════════════════════════════════════════

    if 'LowerThird' in parsed_components:
        p = parsed_components['LowerThird']
        x, y = p.get('x', 540), p.get('y', 1500)
        w = int(p.get('width') or 640)
        parts += _ae_rrect('ltBar', 'LowerThird_bar', int(p.get('barWidth') or 12), 140, _hexc(p.get('color'), '#2563eb'), 0, x - w / 2, y)
        parts += _ae_rrect('lt', 'LowerThird_bg', w, 140, _hexc(p.get('bgColor'), '#ffffff'), 8, x, y)[:-1]
        parts += _ae_text('ltN', 'LowerThird_name', str(p.get('name', 'NAME')), int(p.get('fontSize') or 48), _hexc(p.get('textColor'), '#0f172a'), x, y - 26)
        parts += _ae_text('ltT', 'LowerThird_title', str(p.get('title', '')), 30, _hexc(p.get('titleColor'), '#64748b'), x, y + 30)

    if 'BreakingNewsTicker' in parsed_components:
        p = parsed_components['BreakingNewsTicker']
        x, y = p.get('x', 540), p.get('y', 1700)
        bh = int(p.get('barHeight') or 70)
        parts += _ae_rrect('bnt', 'BreakingNewsTicker_bar', width, bh, _hexc(p.get('bgColor'), '#ef4444'), 0, x, y)[:-1]
        parts += _ae_rrect('bntB', 'BreakingNewsTicker_badge', 220, bh, _hexc(p.get('badgeBg'), '#000000'), 0, 110, y)[:-1]
        parts += _ae_text('bntBT', 'BreakingNewsTicker_badge_txt', str(p.get('badgeText', 'BREAKING')), 30, _hexc(p.get('badgeColor'), '#ffffff'), 110, y)
        parts += _ae_text('bntT', 'BreakingNewsTicker_txt', str(p.get('text', 'News')), int(p.get('fontSize') or 32), _hexc(p.get('textColor'), '#ffffff'), x + 120, y)

    if 'VersusScreen' in parsed_components:
        p = parsed_components['VersusScreen']
        parts += _ae_rrect('vsA', 'VersusScreen_A', width // 2, height, _hexc(p.get('colorA'), '#61dafb'), 0, width / 4, height / 2)[:-1]
        parts += _ae_rrect('vsB', 'VersusScreen_B', width // 2, height, _hexc(p.get('colorB'), '#42b883'), 0, width * 3 / 4, height / 2)[:-1]
        parts += _ae_text('vsNA', 'VersusScreen_nameA', str(p.get('nameA', 'A')), 80, '#ffffff', width / 4, height / 2)
        parts += _ae_text('vsNB', 'VersusScreen_nameB', str(p.get('nameB', 'B')), 80, '#ffffff', width * 3 / 4, height / 2)
        if p.get('showVs', True):
            parts += _ae_text('vsVS', 'VersusScreen_vs', str(p.get('vsText', 'VS')), 100, _hexc(p.get('vsColor'), '#ffffff'), width / 2, height / 2)

    if 'ScoreboardCounter' in parsed_components:
        p = parsed_components['ScoreboardCounter']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_text('scA', 'ScoreboardCounter_A', str(p.get('valueA', 0)), 160, _hexc(p.get('colorA'), '#ef4444'), x - 220, y)
        parts += _ae_text('scB', 'ScoreboardCounter_B', str(p.get('valueB', 0)), 160, _hexc(p.get('colorB'), '#3b82f6'), x + 220, y)
        parts += _ae_text('scLA', 'ScoreboardCounter_labelA', str(p.get('labelA', 'HOME')), 36, '#ffffff', x - 220, y + 130)
        parts += _ae_text('scLB', 'ScoreboardCounter_labelB', str(p.get('labelB', 'AWAY')), 36, '#ffffff', x + 220, y + 130)

    if 'BreakingNewsAlert' in parsed_components:
        p = parsed_components['BreakingNewsAlert']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_card('bna', 'BreakingNewsAlert', 920, 360, _hexc(p.get('bgColor'), '#ef4444'), x, y,
                          title=str(p.get('headline', 'ALERT')), title_color=_hexc(p.get('textColor'), '#ffffff'),
                          title_size=int(p.get('fontSize') or 80))

    if 'CountdownTimer' in parsed_components:
        p = parsed_components['CountdownTimer']
        x, y = p.get('x', 540), p.get('y', 960)
        sz = int(p.get('size') or 400)
        parts += _ae_ellipse('ctR', 'CountdownTimer_ring', sz, _hexc(p.get('trackColor'), '#334155'), x, y)
        parts += _ae_text('ct', 'CountdownTimer_num', str(p.get('seconds', 10)), int(p.get('fontSize') or 200), _hexc(p.get('textColor'), '#ffffff'), x, y)

    # ════════════════════════════════════════
    # ADVANCED DATA VIZ
    # ════════════════════════════════════════

    if 'PieChartReveal' in parsed_components:
        p = parsed_components['PieChartReveal']
        x, y = p.get('x', 540), p.get('y', 960)
        cols = _split(p.get('colors'))
        col = _hexc(cols[0] if cols else None, '#3b82f6')
        parts += _ae_ellipse('pcr', 'PieChartReveal', 360, col, x, y)

    if 'StockCandlestick' in parsed_components:
        p = parsed_components['StockCandlestick']
        x, y = p.get('x', 540), p.get('y', 960)
        candles = _split(p.get('data'), ';')
        vals = [_nums(c)[0] if _nums(c) else 50 for c in candles] or [120, 90, 110, 130]
        cols = [_hexc(p.get('upColor'), '#22c55e') if i % 2 == 0 else _hexc(p.get('downColor'), '#ef4444') for i in range(len(vals))]
        parts += _ae_bars('scs', 'StockCandlestick', vals, cols, x, y, c1=_hexc(p.get('upColor'), '#22c55e'))

    if 'RadarSpiderChart' in parsed_components:
        p = parsed_components['RadarSpiderChart']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_ellipse('rsc', 'RadarSpiderChart', 360, _hexc(p.get('color'), '#00FFAB'), x, y)

    if 'FunnelChart' in parsed_components:
        p = parsed_components['FunnelChart']
        x, y = p.get('x', 540), p.get('y', 960)
        vals = _nums(p.get('values')) or [100, 70, 45, 25]
        cols = _split(p.get('colors'))
        mx = max(vals + [1])
        for i, v in enumerate(vals):
            w = int(max(140, (v / mx) * 720))
            col = _hexc(cols[i] if i < len(cols) else None, '#3b82f6')
            parts += _ae_rrect(f'fc{i}', f'FunnelChart_{i}', w, 80, col, 8, x, y - len(vals) * 48 + i * 96)

    if 'HorizontalBarRace' in parsed_components:
        p = parsed_components['HorizontalBarRace']
        x, y = p.get('x', 540), p.get('y', 960)
        items = p.get('items') or [{'label': 'A', 'value': 100}, {'label': 'B', 'value': 70}]
        mx = max([float(it.get('value', 0)) for it in items] + [1])
        for i, it in enumerate(items[:6]):
            w = int(max(120, (float(it.get('value', 0)) / mx) * 720))
            col = _hexc(it.get('color'), '#3b82f6')
            ry = y - len(items) * 50 + i * 100
            parts += _ae_rrect(f'hbr{i}', f'HorizontalBarRace_{i}', w, 70, col, 8, x - 360 + w / 2, ry)[:-1]
            parts += _ae_text(f'hbrT{i}', f'HorizontalBarRace_lbl_{i}', str(it.get('label', '')), 32, _hexc(p.get('textColor'), '#ffffff'), x - 360 + w / 2, ry)

    if 'CounterNumber' in parsed_components:
        p = parsed_components['CounterNumber']
        x, y = p.get('x', 540), p.get('y', 960)
        label = f"{p.get('prefix', '')}{p.get('to', 0)}{p.get('suffix', '')}"
        parts += _ae_text('cn', 'CounterNumber', label, 160, _hexc(p.get('color'), '#22c55e'), x, y)

    # ════════════════════════════════════════
    # SOCIAL MEDIA & UGC
    # ════════════════════════════════════════

    if 'TweetCard' in parsed_components:
        p = parsed_components['TweetCard']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_rrect('tc', 'TweetCard_bg', 820, 360, '#ffffff', 24, x, y)[:-1]
        parts += _ae_text('tcU', 'TweetCard_user', str(p.get('username', 'User')), 40, '#0f172a', x, y - 110)
        parts += _ae_text('tcH', 'TweetCard_handle', str(p.get('handle', '@user')), 30, '#64748b', x, y - 60)
        parts += _ae_text('tcC', 'TweetCard_content', str(p.get('content', '')), 34, '#0f172a', x, y + 40)

    if 'InstagramPost' in parsed_components:
        p = parsed_components['InstagramPost']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_rrect('ip', 'InstagramPost_bg', 820, 820, '#ffffff', 16, x, y)[:-1]
        parts += _ae_text('ipU', 'InstagramPost_user', str(p.get('username', 'user')), 36, '#0f172a', x, y - 360)
        parts += _ae_text('ipC', 'InstagramPost_caption', str(p.get('caption', '')), 32, '#0f172a', x, y + 340)

    if 'TikTokOverlay' in parsed_components:
        p = parsed_components['TikTokOverlay']
        x = p.get('x', width - 120)
        y = p.get('y', 960)
        parts += _ae_text('ttoL', 'TikTokOverlay_likes', '♥ ' + str(p.get('likes', '0')), 36, '#ffffff', x, y - 120)
        parts += _ae_text('ttoC', 'TikTokOverlay_comments', '💬 ' + str(p.get('comments', '0')), 36, '#ffffff', x, y)
        parts += _ae_text('ttoS', 'TikTokOverlay_shares', '↪ ' + str(p.get('shares', '0')), 36, '#ffffff', x, y + 120)

    if 'YouTubeEndScreen' in parsed_components:
        p = parsed_components['YouTubeEndScreen']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_text('yes', 'YouTubeEndScreen_title', str(p.get('title', 'Thanks!')), 64, '#ffffff', x, y - 120)
        parts += _ae_rrect('yesB', 'YouTubeEndScreen_subscribe', 360, 100, _hexc(p.get('subscribeColor'), '#ff0000'), 12, x, y + 40)[:-1]
        parts += _ae_text('yesBT', 'YouTubeEndScreen_sub_txt', 'SUBSCRIBE', 40, '#ffffff', x, y + 40)

    if 'FollowerCounter' in parsed_components:
        p = parsed_components['FollowerCounter']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_text('fc', 'FollowerCounter', str(p.get('endCount', 0)), 150, _hexc(p.get('color'), '#e1306c'), x, y)
        parts += _ae_text('fcP', 'FollowerCounter_platform', str(p.get('platform', '')), 36, '#94a3b8', x, y + 120)

    if 'SocialSharePopup' in parsed_components:
        p = parsed_components['SocialSharePopup']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_card('ssp', 'SocialSharePopup', 760, 300, _hexc(p.get('bgColor'), '#1e293b'), x, y,
                          title=str(p.get('title', 'Share')), title_color='#ffffff', title_size=48)

    # ════════════════════════════════════════
    # ADVANCED E-COMMERCE & B2C
    # ════════════════════════════════════════

    if 'PromoCodeBanner' in parsed_components:
        p = parsed_components['PromoCodeBanner']
        x, y = p.get('x', 540), p.get('y', 960)
        w = int(p.get('width') or 0) or 760
        parts += _ae_rrect('pcb', 'PromoCodeBanner_bg', w, 240, _hexc(p.get('bgColor'), '#eab308'), int(p.get('cornerRadius') or 24), x, y)[:-1]
        if p.get('showDiscount', True):
            parts += _ae_text('pcbD', 'PromoCodeBanner_discount', str(p.get('discount', '')), 56, _hexc(p.get('discountTextColor'), p.get('textColor') or '#0f172a'), x, y - 50)
        parts += _ae_text('pcbC', 'PromoCodeBanner_code', str(p.get('code', 'CODE')), 64, _hexc(p.get('textColor'), '#0f172a'), x, y + 40)

    if 'SizeSelector' in parsed_components:
        p = parsed_components['SizeSelector']
        x, y = p.get('x', 540), p.get('y', 960)
        sizes = _split(p.get('sizes')) or ['S', 'M', 'L']
        sel = str(p.get('selectedSize', ''))
        start = x - (len(sizes) - 1) * 130 / 2
        for i, s in enumerate(sizes[:7]):
            bx = start + i * 130
            col = _hexc(p.get('accentColor'), '#3b82f6') if s == sel else '#1e293b'
            parts += _ae_rrect(f'ss{i}', f'SizeSelector_{i}', 100, 100, col, 16, bx, y)[:-1]
            parts += _ae_text(f'ssT{i}', f'SizeSelector_lbl_{i}', s, 40, '#ffffff', bx, y)

    if 'AppStoreButtons' in parsed_components:
        p = parsed_components['AppStoreButtons']
        x, y = p.get('x', 540), p.get('y', 960)
        if p.get('showApple', True):
            parts += _ae_rrect('asbA', 'AppStoreButtons_apple', 420, 130, '#000000', 16, x, y - 80)[:-1]
            parts += _ae_text('asbAT', 'AppStoreButtons_apple_txt', 'App Store', 40, '#ffffff', x, y - 80)
        if p.get('showGoogle', True):
            parts += _ae_rrect('asbG', 'AppStoreButtons_google', 420, 130, '#000000', 16, x, y + 80)[:-1]
            parts += _ae_text('asbGT', 'AppStoreButtons_google_txt', 'Google Play', 40, '#ffffff', x, y + 80)

    if 'FeatureUnlock' in parsed_components:
        p = parsed_components['FeatureUnlock']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_card('fu', 'FeatureUnlock', 760, 320, _hexc(p.get('bgColor'), '#0f172a'), x, y,
                          title=str(p.get('featureName', 'Feature')), title_color=_hexc(p.get('textColor'), '#ffffff'),
                          subtitle=str(p.get('label', 'UNLOCKED')), subtitle_color=_hexc(p.get('color'), '#eab308'))

    if 'FlashSaleTimer' in parsed_components:
        p = parsed_components['FlashSaleTimer']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_text('fstT', 'FlashSaleTimer_title', str(p.get('title', 'Flash Sale')), 48, _hexc(p.get('color'), '#ef4444'), x, y - 160)
        units = [(p.get('hours', 0), p.get('hoursLabel', 'H')), (p.get('minutes', 0), p.get('minutesLabel', 'M')), (p.get('seconds', 0), p.get('secondsLabel', 'S'))]
        start = x - 280
        for i, (val, lbl) in enumerate(units):
            bx = start + i * 280
            parts += _ae_rrect(f'fst{i}', f'FlashSaleTimer_block_{i}', 200, 200, _hexc(p.get('blockColor'), '#1e293b'), 16, bx, y)[:-1]
            parts += _ae_text(f'fstN{i}', f'FlashSaleTimer_num_{i}', str(val).zfill(2), 90, _hexc(p.get('textColor'), '#ffffff'), bx, y - 16)
            parts += _ae_text(f'fstL{i}', f'FlashSaleTimer_lbl_{i}', str(lbl), 28, _hexc(p.get('labelColor'), '#64748b'), bx, y + 70)

    if 'PricingTableReveal' in parsed_components:
        p = parsed_components['PricingTableReveal']
        x, y = p.get('x', 540), p.get('y', 960)
        tiers = [(p.get('tier1', 'Starter'), p.get('price1', '$0')), (p.get('tier2', 'Pro'), p.get('price2', '$29')), (p.get('tier3', 'Enterprise'), p.get('price3', '$99'))]
        start = x - 320
        for i, (tier, price) in enumerate(tiers):
            cx = start + i * 320
            col = _hexc(p.get('highlightColor'), '#3b82f6') if i == 1 else '#1e293b'
            parts += _ae_rrect(f'ptr{i}', f'PricingTableReveal_col_{i}', 280, 420, col, 20, cx, y)[:-1]
            parts += _ae_text(f'ptrT{i}', f'PricingTableReveal_tier_{i}', str(tier), 40, '#ffffff', cx, y - 120)
            parts += _ae_text(f'ptrP{i}', f'PricingTableReveal_price_{i}', str(price), 70, '#ffffff', cx, y)

    # ════════════════════════════════════════
    # SPRINT 4: PRIMITIVAS GEOMÉTRICAS
    # ════════════════════════════════════════

    if 'AnimatedShape' in parsed_components:
        p = parsed_components['AnimatedShape']
        x = p.get('endX', p.get('x', 540))
        y = p.get('endY', p.get('y', 960))
        w = int(p.get('width') or 200)
        h = int(p.get('height') or 200)
        col = _hexc(p.get('color'), '#3b82f6')
        if p.get('shape') == 'circle':
            parts += _ae_ellipse('ash', 'AnimatedShape', min(w, h), col, x, y)
        else:
            parts += _ae_rrect('ash', 'AnimatedShape', w, h, col, int(p.get('borderRadius') or 0), x, y)

    if 'AnimatedLine' in parsed_components:
        p = parsed_components['AnimatedLine']
        sx, sy = p.get('startX', 100), p.get('startY', 540)
        ex, ey = p.get('endX', 900), p.get('endY', 540)
        cx, cy = (sx + ex) / 2, (sy + ey) / 2
        length = max(20, ((ex - sx) ** 2 + (ey - sy) ** 2) ** 0.5)
        parts += _ae_rrect('al', 'AnimatedLine', int(length), int(p.get('strokeWidth') or 8), _hexc(p.get('color'), '#3b82f6'), 4, cx, cy)

    if 'FloatingBadge' in parsed_components:
        p = parsed_components['FloatingBadge']
        x, y = p.get('x', 540), p.get('y', 960)
        w = int(p.get('width') or 0) or 260
        rnd = 999 if p.get('shape') == 'pill' else int(p.get('cornerRadius') or 12)
        parts += _ae_rrect('fb', 'FloatingBadge', w, 120, _hexc(p.get('color'), '#ef4444'), rnd, x, y)[:-1]
        parts += _ae_text('fbT', 'FloatingBadge_txt', str(p.get('text', 'NEW')), int(p.get('fontSize') or 32), _hexc(p.get('textColor'), '#ffffff'), x, y)

    if 'AnimatedArrow' in parsed_components:
        p = parsed_components['AnimatedArrow']
        sx, sy = p.get('startX', 200), p.get('startY', 540)
        ex, ey = p.get('endX', 800), p.get('endY', 540)
        cx, cy = (sx + ex) / 2, (sy + ey) / 2
        length = max(20, ((ex - sx) ** 2 + (ey - sy) ** 2) ** 0.5)
        parts += _ae_rrect('aar', 'AnimatedArrow', int(length), int(p.get('strokeWidth') or 10), _hexc(p.get('color'), '#ffffff'), 4, cx, cy)

    if 'EmojiFloat' in parsed_components:
        p = parsed_components['EmojiFloat']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_text('ef', 'EmojiFloat', str(p.get('emoji', '🔥')), int(p.get('fontSize') or 60), '#ffffff', x, y)

    if 'GradientOverlay' in parsed_components:
        p = parsed_components['GradientOverlay']
        parts += _ae_rrect('go', 'GradientOverlay', width, height, _hexc(p.get('color1'), '#000000'), 0, width / 2, height / 2)[:-1]
        parts += [
            'var goOp = go.property("ADBE Transform Group").property("ADBE Opacity");',
            f'goOp.setValue({float(p.get("opacity", 0.8)) * 100:.0f});',
            '',
        ]

    if 'TextBubble' in parsed_components:
        p = parsed_components['TextBubble']
        x, y = p.get('x', 540), p.get('y', 960)
        w = int(p.get('width') or 800)
        parts += _ae_rrect('tb', 'TextBubble_bg', w, 200, _hexc(p.get('bgColor'), '#ffffff'), int(p.get('borderRadius') or 30), x, y)[:-1]
        parts += _ae_text('tbT', 'TextBubble_txt', str(p.get('text', 'Hello')), int(p.get('fontSize') or 40), _hexc(p.get('textColor'), '#0f172a'), x, y)

    # ════════════════════════════════════════
    # SPRINT 4.5: PRIMITIVAS EXTRA
    # ════════════════════════════════════════

    if 'MediaFrame' in parsed_components:
        p = parsed_components['MediaFrame']
        x, y = p.get('x', 540), p.get('y', 960)
        ph = p.get('placeholderColor') or '#1e293b'
        if p.get('fullScreen'):
            fw, fh = width, height
            x, y = width / 2, height / 2
        else:
            fw, fh = int(p.get('width') or 720), int(p.get('height') or 720)
        shape = p.get('shape') or 'rounded'
        if shape == 'circle':
            parts += _ae_ellipse('mf', 'MediaFrame', min(fw, fh), ph, x, y)
        else:
            parts += _ae_rrect('mf', 'MediaFrame', fw, fh, ph, 24 if shape == 'rounded' else 0, x, y)

    if 'RippleEffect' in parsed_components:
        p = parsed_components['RippleEffect']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_ellipse('re', 'RippleEffect', int(p.get('maxRadius') or 300) * 2, _hexc(p.get('color'), '#3b82f6'), x, y)
        parts += [
            'var reSc = re.property("ADBE Transform Group").property("ADBE Scale");',
            'reSc.setValueAtTime(0, [0, 0]);',
            'reSc.setValueAtTime(1, [100, 100]);',
            'var reOp = re.property("ADBE Transform Group").property("ADBE Opacity");',
            'reOp.setValueAtTime(0, 100);',
            'reOp.setValueAtTime(1, 0);',
            '',
        ]

    if 'MaskedReveal' in parsed_components:
        p = parsed_components['MaskedReveal']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_text('mr', 'MaskedReveal', str(p.get('content') or p.get('text') or 'Revealed'), 60, _hexc(p.get('color'), '#ffffff'), x, y)

    if 'ProgressPill' in parsed_components:
        p = parsed_components['ProgressPill']
        x, y = p.get('x', 540), p.get('y', 960)
        w = int(p.get('width') or 600)
        h = int(p.get('height') or 40)
        pct = float(p.get('endPercent') or 100) / 100.0
        parts += _ae_rrect('pp', 'ProgressPill_track', w, h, _hexc(p.get('trackColor'), '#e2e8f0'), h // 2, x, y)[:-1]
        fw = max(2, int(w * pct))
        parts += _ae_rrect('ppF', 'ProgressPill_fill', fw, h, _hexc(p.get('barColor'), '#3b82f6'), h // 2, x - w / 2 + fw / 2, y)[:-1]
        if p.get('showLabel', True):
            parts += _ae_text('ppL', 'ProgressPill_label', f"{int(p.get('endPercent') or 100)}%", int(p.get('fontSize') or 24), _hexc(p.get('barColor'), '#3b82f6'), x, y + h + 30)
        parts.append('')

    # ════════════════════════════════════════
    # FIXES AUDITORÍA SPRINT 4: TEXTO AVANZADO
    # ════════════════════════════════════════

    if 'StrikethroughText' in parsed_components:
        props = parsed_components['StrikethroughText']
        parts.append('// StrikethroughText')
        parts.append('var stL = comp.layers.addText();')
        parts.append('stL.name = "StrikethroughText";')
        parts.append('var stP = stL.property("Source Text");')
        parts.append('var stD = stP.value;')
        parts.append('stD.text = "' + props.get("text", "Strikethrough") + '";')
        parts.append(f'stD.fontSize = {props.get("fontSize", 80)};')
        parts.append(f'stD.fillColor = {hex_to_rgb_array(props.get("color", "#ffffff"))};')
        parts.append('stP.setValue(stD);')
        parts.append(f'stL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'UnderlineReveal' in parsed_components:
        props = parsed_components['UnderlineReveal']
        parts.append('// UnderlineReveal')
        parts.append('var urL = comp.layers.addText();')
        parts.append('urL.name = "UnderlineReveal";')
        parts.append('var urP = urL.property("Source Text");')
        parts.append('var urD = urP.value;')
        parts.append('urD.text = "' + props.get("text", "Underline") + '";')
        parts.append(f'urD.fontSize = {props.get("fontSize", 80)};')
        parts.append(f'urD.fillColor = {hex_to_rgb_array(props.get("color", "#ffffff"))};')
        parts.append('urP.setValue(urD);')
        parts.append(f'urL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'SplitText' in parsed_components:
        props = parsed_components['SplitText']
        parts.append('// SplitText')
        parts.append('var sptL = comp.layers.addText();')
        parts.append('sptL.name = "SplitText";')
        parts.append('var sptP = sptL.property("Source Text");')
        parts.append('var sptD = sptP.value;')
        parts.append('sptD.text = "' + props.get("revealedText", "UNLOCKED") + '";')
        parts.append(f'sptD.fontSize = {props.get("fontSize", 100)};')
        parts.append(f'sptD.fillColor = {hex_to_rgb_array(props.get("revealedColor", "#10b981"))};')
        parts.append('sptP.setValue(sptD);')
        parts.append(f'sptL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'TextSwap' in parsed_components:
        props = parsed_components['TextSwap']
        parts.append('// TextSwap')
        parts.append('var tswL = comp.layers.addText();')
        parts.append('tswL.name = "TextSwap";')
        parts.append('var tswP = tswL.property("Source Text");')
        parts.append('var tswD = tswP.value;')
        parts.append('tswD.text = "' + props.get("finalText", "AFTER") + '";')
        parts.append(f'tswD.fontSize = {props.get("fontSize", 80)};')
        parts.append(f'tswD.fillColor = {hex_to_rgb_array(props.get("finalColor", "#10b981"))};')
        parts.append('tswP.setValue(tswD);')
        parts.append(f'tswL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    # ════════════════════════════════════════
    # FAMILIA Style* (aproximaciones en capas nativas)
    # ════════════════════════════════════════

    def _badge_w(text, fs, pad=60):
        return int(max(160, len(str(text)) * fs * 0.62 + pad))

    # --- Texto puro ---
    if 'StyleTextBlock' in parsed_components:
        p = parsed_components['StyleTextBlock']
        size = {'heading': 90, 'quote': 56, 'body': 40, 'caption': 28}.get(p.get('variant', 'body'), 48)
        parts += _ae_text('stb', 'StyleTextBlock', p.get('text', 'Text'), size,
                          p.get('textColor') or p.get('color', '#ffffff'), p.get('x', 540), p.get('y', 540))
    for cname, var, default in [
        ('StyleScrambleText', 'sst', 'SCRAMBLE'),
        ('StylePulseText', 'spt', 'PULSE'),
        ('StyleSpringText', 'sprt', 'Spring'),
    ]:
        if cname in parsed_components:
            p = parsed_components[cname]
            parts += _ae_text(var, cname, p.get('text', default), p.get('fontSize', 80),
                              p.get('textColor', '#ffffff'), p.get('x', 540), p.get('y', 540))
    if 'StyleTicker' in parsed_components:
        p = parsed_components['StyleTicker']
        parts += _ae_text('stk', 'StyleTicker', p.get('text', 'TICKER • TICKER'), p.get('fontSize', 28),
                          p.get('color', '#e2e8f0'), p.get('x', 540), p.get('y', 1800))
    if 'StyleWatermark' in parsed_components:
        p = parsed_components['StyleWatermark']
        parts += _ae_text('swm', 'StyleWatermark', p.get('icon', '© watermark'), int(p.get('size', 60)),
                          p.get('color', '#ffffff'), p.get('x', 960), p.get('y', 120))
    if 'StyleCallout' in parsed_components:
        p = parsed_components['StyleCallout']
        parts += _ae_text('sca', 'StyleCallout', p.get('text', '¡Mira aquí!'), int(p.get('fontSize') or 48),
                          p.get('color', '#00ffab'), p.get('x', 540), p.get('y', 400))
    if 'StyleCountdown' in parsed_components:
        p = parsed_components['StyleCountdown']
        parts += _ae_text('scd', 'StyleCountdown', str(p.get('seconds', p.get('value', 10))), 160,
                          p.get('color', '#ffffff'), p.get('x', 540), p.get('y', 540))
    if 'StyleAnimateNumber' in parsed_components:
        p = parsed_components['StyleAnimateNumber']
        label = f"{p.get('prefix', '')}{p.get('value', 100)}{p.get('suffix', '')}"
        parts += _ae_text('san', 'StyleAnimateNumber', label, int(p.get('fontSize') or 96),
                          p.get('color', '#ffffff'), p.get('x', 540), p.get('y', 400))
        if p.get('caption'):
            parts += _ae_text('sanC', 'StyleAnimateNumber_caption', p['caption'], 36,
                              p.get('captionColor', '#94a3b8'), p.get('x', 540), int(p.get('y', 400)) + 90)

    # --- Caja + texto ---
    for cname, var, default_text, default_bg in [
        ('StyleBadge', 'sbg', 'BADGE', '#334155'),
        ('StyleChip', 'schp', 'Chip', '#334155'),
        ('StyleButton', 'sbtn', 'Click Here', '#2c3e50'),
        ('StyleSimulatedHover', 'ssh', 'Click Here', '#2c3e50'),
    ]:
        if cname in parsed_components:
            p = parsed_components[cname]
            fs = int(p.get('fontSize') or 40)
            txt = p.get('text', default_text)
            bg = p.get('bgColor') or default_bg
            x, y = p.get('x', 540), p.get('y', 540)
            parts += _ae_rrect(f'{var}Box', f'{cname}_bg', _badge_w(txt, fs), int(fs * 2.2), bg, 999, x, y)
            parts += _ae_text(f'{var}Txt', cname, txt, fs, p.get('textColor', '#ffffff'), x, y)

    if 'StyleCard' in parsed_components:
        p = parsed_components['StyleCard']
        x, y = p.get('x', 540), p.get('y', 540)
        w = int(p.get('width') or 640)
        parts += _ae_rrect('scdBox', 'StyleCard_bg', w, 360, p.get('bgColor') or '#1e293b', 24, x, y)
        parts += _ae_text('scdT', 'StyleCard_title', p.get('title', 'Title'), 56, p.get('titleColor', '#ffffff'), x, y - 70)
        if p.get('subtitle'):
            parts += _ae_text('scdS', 'StyleCard_subtitle', p['subtitle'], 34, p.get('subtitleColor', '#94a3b8'), x, y + 20)

    if 'StyleStatCard' in parsed_components:
        p = parsed_components['StyleStatCard']
        x, y = p.get('x', 540), p.get('y', 540)
        parts += _ae_rrect('ssc', 'StyleStatCard_bg', 420, 300, p.get('bgColor') or '#1e293b', 20, x, y)
        parts += _ae_text('sscV', 'StyleStatCard_value', str(p.get('value', '73%')), 90, p.get('color', '#00ffab'), x, y - 40)
        parts += _ae_text('sscL', 'StyleStatCard_label', p.get('label', 'Stat'), 32, p.get('textColor', '#94a3b8'), x, y + 60)

    if 'StyleVideoPlayer' in parsed_components:
        p = parsed_components['StyleVideoPlayer']
        x, y = p.get('x', 540), p.get('y', 960)
        w = int(p.get('width') or 720)
        h = int(p.get('height') or (w * 0.5625))
        parts += _ae_rrect('svp', 'StyleVideoPlayer_frame', w, h, '#1e293b', 16, x, y)
        parts += _ae_text('svpI', 'StyleVideoPlayer_icon', '▶', 90, '#ffffff', x, y)

    if 'StyleDivider' in parsed_components:
        p = parsed_components['StyleDivider']
        x, y = p.get('x', 540), p.get('y', 960)
        th = int(p.get('thickness', 2))
        if p.get('orientation') == 'vertical':
            parts += _ae_rrect('sdv', 'StyleDivider', th, int(p.get('height', 300)), p.get('color', '#334155'), 2, x, y)
        else:
            parts += _ae_rrect('sdv', 'StyleDivider', int(p.get('width', 600)), th, p.get('color', '#334155'), 2, x, y)

    if 'StyleAvatar' in parsed_components:
        p = parsed_components['StyleAvatar']
        x, y = p.get('x', 540), p.get('y', 400)
        sz = {'sm': 110, 'md': 150, 'lg': 200}.get(p.get('size', 'md'), 150)
        parts += _ae_ellipse('sav', 'StyleAvatar_circle', sz, p.get('bgColor') or '#1e293b', x, y)
        if p.get('name'):
            parts += _ae_text('savN', 'StyleAvatar_name', p['name'], 36, p.get('nameColor', '#ffffff'), x, y + sz / 2 + 40)

    if 'StyleCursor' in parsed_components:
        p = parsed_components['StyleCursor']
        pts = p.get('points') or [{'x': 540, 'y': 540}]
        first = pts[0] if isinstance(pts, list) and pts else {'x': 540, 'y': 540}
        parts += _ae_ellipse('scur', 'StyleCursor', int(p.get('size', 40)), p.get('color', '#ffffff'),
                             first.get('x', 540), first.get('y', 540))

    if 'StyleFakeScroll' in parsed_components:
        p = parsed_components['StyleFakeScroll']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_rrect('sfs', 'StyleFakeScroll_bg', int(p.get('width') or 740), 360, p.get('bgColor') or '#1e293b', 16, x, y)
        items = p.get('items') or []
        first = items[0] if items else None
        label = (first.get('content') if isinstance(first, dict) else str(first)) if first else 'Feed'
        parts += _ae_text('sfsT', 'StyleFakeScroll_item', label, 34, p.get('titleColor', '#ffffff'), x, y - 100)

    # --- Charts (aproximaciones) ---
    for cname, var, defx, defy in [
        ('StyleBarChart', 'sbc', 540, 540),
        ('StyleMultiBar', 'smb', 540, 540),
        ('StyleBarRace', 'sbr', 540, 540),
        ('StyleLineChart', 'slc', 540, 540),
        ('StyleComparisonChart', 'scc', 540, 540),
    ]:
        if cname in parsed_components:
            p = parsed_components[cname]
            vals, cols = _norm_values(p.get('data'))
            if not vals:
                vals, cols = [40, 70, 55, 90], [None, None, None, None]
            parts += _ae_bars(var, cname, vals, cols, p.get('x', defx), p.get('y', defy),
                              c1=p.get('lineColor') or p.get('color') or '#3b82f6')

    if 'StyleFunnelChart' in parsed_components:
        p = parsed_components['StyleFunnelChart']
        vals, cols = _norm_values(p.get('data'))
        if not vals:
            vals, cols = [100, 70, 45, 25], [None] * 4
        x, y = p.get('x', 540), p.get('y', 540)
        mx = max(vals + [1])
        for i, v in enumerate(vals):
            w = int(max(120, (v / mx) * 600))
            parts += _ae_rrect(f'sfn{i}', f'StyleFunnelChart_{i}', w, 70,
                               (cols[i] if i < len(cols) and cols[i] else '#3b82f6'), 8, x, y - len(vals) * 40 + i * 84)

    for cname, var in [('StylePieChart', 'spie'), ('StyleDonutChart', 'sdn'), ('StyleRadarChart', 'srad')]:
        if cname in parsed_components:
            p = parsed_components[cname]
            _, cols = _norm_values(p.get('data'))
            col = next((c for c in cols if c), None) or p.get('color') or '#3b82f6'
            parts += _ae_ellipse(var, cname, int(p.get('size', 280)), col, p.get('x', 540), p.get('y', 540))

    # --- Componentes no-Style (texto / branding / cinematic) ---
    if 'GradientText' in parsed_components:
        p = parsed_components['GradientText']
        x, y = p.get('x', 540), p.get('y', 960)
        # AE no soporta gradiente en texto trivialmente: usamos color1 como aproximación.
        parts += _ae_text('gtx', 'GradientText', text or p.get('text') or 'Gradient',
                          int(p.get('fontSize') or 90), p.get('color1') or '#a855f7', x, y)

    if 'WordHighlight' in parsed_components:
        p = parsed_components['WordHighlight']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_text('wht', 'WordHighlight', text or p.get('text') or 'Highlight',
                          int(p.get('fontSize') or 80), p.get('color') or '#94a3b8', x, y)

    if 'IconifyIcon' in parsed_components:
        p = parsed_components['IconifyIcon']
        x, y = p.get('x', 540), p.get('y', 960)
        sz = int(p.get('size') or 200)
        # Aproximación: círculo del color del icono (Iconify no existe en AE).
        parts += _ae_ellipse('ico', 'IconifyIcon', sz, p.get('color') or '#3b82f6', x, y)

    if 'KeywordPop' in parsed_components:
        p = parsed_components['KeywordPop']
        x, y = p.get('x', 540), p.get('y', 960)
        word = p.get('triggerWord') or text or 'Pop'
        var = 'kwp'
        parts += _ae_text(var, 'KeywordPop', word, int(p.get('size') or 120), p.get('color') or '#f59e0b', x, y)
        # Pop de escala (0 -> sobreimpulso -> 1) sobre el texto.
        parts += [
            f'var {var}Sc = {var}.property("ADBE Transform Group").property("ADBE Scale");',
            f'{var}Sc.setValueAtTime(0, [0, 0]);',
            f'{var}Sc.setValueAtTime(0.25, [120, 120]);',
            f'{var}Sc.setValueAtTime(0.4, [100, 100]);',
            '',
        ]

    if 'KenBurns' in parsed_components:
        p = parsed_components['KenBurns']
        x, y = p.get('x', 540), p.get('y', 960)
        var = 'kb'
        parts += _ae_rrect(var, 'KenBurns_frame', width, height, p.get('color1') or '#1e293b', 0, x, y)
        # Zoom lento (Ken Burns) sobre toda la duración.
        parts += [
            f'var {var}Sc = {var}.property("ADBE Transform Group").property("ADBE Scale");',
            f'{var}Sc.setValueAtTime(0, [100, 100]);',
            f'{var}Sc.setValueAtTime({max(0.1, float(duration)):.2f}, [118, 118]);',
            '',
        ]

    if 'CinematicBars' in parsed_components:
        p = parsed_components['CinematicBars']
        sz = int(p.get('size') or 140)
        col = p.get('color') or '#000000'
        parts += _ae_rrect('cbT', 'CinematicBars_top', width, sz, col, 0, width / 2, sz / 2)
        parts += _ae_rrect('cbB', 'CinematicBars_bottom', width, sz, col, 0, width / 2, height - sz / 2)

    if 'Spotlight' in parsed_components:
        p = parsed_components['Spotlight']
        x, y = p.get('x', width / 2), p.get('y', height / 2)
        parts += _ae_ellipse('spot', 'Spotlight', int(p.get('radius') or 400) * 2, p.get('color') or '#ffffff', x, y)

    if 'CameraShake' in parsed_components:
        # Sin contenido propio: un null con wiggle como guía de movimiento.
        amp = int(p.get('intensity', 12)) if (p := parsed_components.get('CameraShake')) else 12
        freq = int(parsed_components['CameraShake'].get('frequency') or 5)
        parts += [
            '// CameraShake (null guía con wiggle)',
            'var camsh = comp.layers.addNull();',
            'camsh.name = "CameraShake";',
            'var camshP = camsh.property("ADBE Transform Group").property("ADBE Position");',
            f'camshP.expression = "wiggle({freq}, {amp})";',
            '',
        ]

    if 'AnimatedChecklist' in parsed_components:
        p = parsed_components['AnimatedChecklist']
        x, y = p.get('x', 540), p.get('y', 960)
        items = p.get('items') or ['Item 1', 'Item 2', 'Item 3']
        fs = int(p.get('fontSize') or 44)
        accent = p.get('accentColor') or '#22c55e'
        txtc = p.get('textColor') or '#ffffff'
        row_h = fs + 36
        start = y - (len(items) - 1) * row_h / 2
        for i, it in enumerate(items[:8]):
            label = it.get('text') if isinstance(it, dict) else str(it)
            ry = start + i * row_h
            parts += _ae_ellipse(f'aclC{i}', f'AnimatedChecklist_chk_{i}', fs, accent, x - 280, ry)
            parts += _ae_text(f'aclT{i}', f'AnimatedChecklist_txt_{i}', label, fs, txtc, x + 40, ry)

    if 'RotatingCarousel' in parsed_components:
        p = parsed_components['RotatingCarousel']
        x, y = p.get('x', 540), p.get('y', 960)
        items = p.get('items') or ['Slide']
        first = items[0] if items else 'Slide'
        label = first.get('label') if isinstance(first, dict) else str(first)
        parts += _ae_rrect('rcar', 'RotatingCarousel_card', int(p.get('width') or 600), 400,
                           p.get('cardColor') or '#1e293b', 24, x, y)
        parts += _ae_text('rcarT', 'RotatingCarousel_label', label, 48, p.get('labelColor') or '#ffffff', x, y)

    if 'LogoReveal' in parsed_components:
        p = parsed_components['LogoReveal']
        x, y = p.get('x', 540), p.get('y', 960)
        var = 'lrv'
        brand = p.get('brand') or text or 'Brand'
        parts += _ae_text(var, 'LogoReveal_brand', brand, 110, p.get('brandColor') or '#ffffff', x, y)
        if p.get('tagline'):
            parts += _ae_text('lrvT', 'LogoReveal_tagline', p['tagline'], 40, p.get('taglineColor') or '#94a3b8', x, y + 100)
        parts += [
            f'var {var}Op = {var}.property("ADBE Transform Group").property("ADBE Opacity");',
            f'{var}Op.setValueAtTime(0, 0);',
            f'{var}Op.setValueAtTime(0.6, 100);',
            '',
        ]

    if 'BrandOutro' in parsed_components:
        p = parsed_components['BrandOutro']
        x, y = p.get('x', 540), p.get('y', 960)
        parts += _ae_rrect('bro', 'BrandOutro_card', 760, 460, p.get('cardColor') or '#0f172a', 28, x, y)
        parts += _ae_text('broB', 'BrandOutro_brand', p.get('brand') or text or 'Brand', 90,
                          p.get('brandColor') or '#ffffff', x, y - 60)
        if p.get('handle'):
            parts += _ae_text('broH', 'BrandOutro_handle', p['handle'], 44, p.get('accentColor') or '#38bdf8', x, y + 40)
        if p.get('cta'):
            parts += _ae_text('broC', 'BrandOutro_cta', p['cta'], 38, p.get('accentColor') or '#38bdf8', x, y + 130)

    if 'GeometricShapes' in parsed_components:
        p = parsed_components['GeometricShapes']
        x, y = p.get('x', 540), p.get('y', 960)
        col = p.get('color') or '#3b82f6'
        sz = int(p.get('width') or 300)
        var = 'geo'
        parts += _ae_ellipse(var, 'GeometricShapes', sz, col, x, y)
        if p.get('spin'):
            parts += [
                f'var {var}Rot = {var}.property("ADBE Transform Group").property("ADBE Rotate Z");',
                f'{var}Rot.setValueAtTime(0, 0);',
                f'{var}Rot.setValueAtTime({max(0.1, float(duration)):.2f}, 360);',
                '',
            ]

    return '\n'.join(parts)
