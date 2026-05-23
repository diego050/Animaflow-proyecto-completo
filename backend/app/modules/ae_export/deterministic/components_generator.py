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

    if 'CursorClick' in parsed_components:
        cc_props = parsed_components['CursorClick']
        sx = cc_props.get('startX', 800)
        sy = cc_props.get('startY', 1500)
        ex = cc_props.get('endX', 540)
        ey = cc_props.get('endY', 960)
        
        parts.append('// CursorClick')
        parts.append('var ccLayer = comp.layers.addShape();')
        parts.append('ccLayer.name = "Cursor";')
        parts.append('var shapeRoot = ccLayer.property("ADBE Root Vectors Group");')
        parts.append('var poly = shapeRoot.addProperty("ADBE Vector Shape - Star");')
        parts.append('poly.property("ADBE Vector Star Type").setValue(1);') # Polygon
        parts.append('poly.property("ADBE Vector Star Points").setValue(3);')
        parts.append('poly.property("ADBE Vector Star Outer Radius").setValue(20);')
        parts.append('var fill = shapeRoot.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('fill.property("ADBE Vector Fill Color").setValue([0.1,0.1,0.1]);')
        parts.append('var stroke = shapeRoot.addProperty("ADBE Vector Graphic - Stroke");')
        parts.append('stroke.property("ADBE Vector Stroke Color").setValue([1,1,1]);')
        parts.append('stroke.property("ADBE Vector Stroke Width").setValue(2);')
        
        # Position animation
        parts.append('var pos = ccLayer.property("ADBE Transform Group").property("ADBE Position");')
        parts.append(f'pos.setValueAtTime(0, [{sx}, {sy}]);')
        parts.append(f'pos.setValueAtTime(1, [{ex}, {ey}]);')
        parts.append('pos.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
        parts.append('pos.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
        
        # Click scale animation
        parts.append('var scale = ccLayer.property("ADBE Transform Group").property("ADBE Scale");')
        parts.append('scale.setValueAtTime(1, [100, 100]);')
        parts.append('scale.setValueAtTime(1.1, [80, 80]);')
        parts.append('scale.setValueAtTime(1.2, [100, 100]);')
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
        
        parts.append('// BarChartReveal')
        parts.append('var bcGroup = comp.layers.addShape();')
        parts.append('bcGroup.name = "BarChartReveal";')
        parts.append('var shapeRoot = bcGroup.property("ADBE Root Vectors Group");')
        
        # We will create 5 bars
        data = [30, 50, 75, 45, 90]
        barWidth = 140
        gap = 20
        totalWidth = (barWidth * 5) + (gap * 4)
        startX = -totalWidth / 2 + barWidth / 2
        
        for i, val in enumerate(data):
            parts.append(f'var barGroup{i} = shapeRoot.addProperty("ADBE Vector Group");')
            parts.append(f'var barRoot{i} = barGroup{i}.property("ADBE Vectors Group");')
            parts.append(f'var barRect{i} = barRoot{i}.addProperty("ADBE Vector Shape - Rect");')
            parts.append(f'barRect{i}.property("ADBE Vector Rect Size").setValue([{barWidth}, 500]);')
            parts.append(f'barRect{i}.property("ADBE Vector Rect Roundness").setValue(16);')
            # Position the anchor point at the bottom of the bar so it scales up
            parts.append(f'var barTransform{i} = barGroup{i}.property("ADBE Vector Transform Group");')
            parts.append(f'barTransform{i}.property("ADBE Vector Anchor").setValue([0, 250]);')
            parts.append(f'barTransform{i}.property("ADBE Vector Position").setValue([{startX + i * (barWidth + gap)}, 250]);')
            
            parts.append(f'var fill{i} = barRoot{i}.addProperty("ADBE Vector Graphic - Fill");')
            parts.append(f'fill{i}.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(c1)});')
            
            # Scale Y animation
            parts.append(f'var scaleProp{i} = barTransform{i}.property("ADBE Vector Scale");')
            # Staggered start time
            startTime = i * 0.15
            targetScale = val
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

    if 'ZoomBlurTransition' in parsed_components:
        parts.append('// ZoomBlurTransition (Adjustment Layer)')
        parts.append('var zBlurLayer = comp.layers.addShape();')
        parts.append('zBlurLayer.name = "ZoomBlurTransition";')
        parts.append('zBlurLayer.adjustmentLayer = true;')
        parts.append('var shapeRoot = zBlurLayer.property("ADBE Root Vectors Group");')
        parts.append('var rect = shapeRoot.addProperty("ADBE Vector Shape - Rect");')
        parts.append(f'rect.property("ADBE Vector Rect Size").setValue([{width}, {height}]);')
        parts.append('var fill = shapeRoot.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('fill.property("ADBE Vector Fill Color").setValue([1,1,1]);')
        parts.append(f'zBlurLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        
        # We need to assume the transition happens at the end. Assuming comp duration is 5 secs.
        # It's better to use outPoint or just hardcode last 0.5s
        parts.append('var dur = comp.duration;')
        
        parts.append('var transformEffect = zBlurLayer.property("ADBE Effect Parade").addProperty("ADBE Transform");')
        parts.append('var scaleProp = transformEffect.property("ADBE Transform-0004");') # Scale
        parts.append('scaleProp.setValueAtTime(dur - 0.5, 100);')
        parts.append('scaleProp.setValueAtTime(dur, 300);')
        parts.append('scaleProp.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
        
        parts.append('var radialBlur = zBlurLayer.property("ADBE Effect Parade").addProperty("ADBE Radial Blur");')
        parts.append('radialBlur.property("ADBE Radial Blur-0001").setValue(0);') # Amount
        parts.append('radialBlur.property("ADBE Radial Blur-0001").setValueAtTime(dur - 0.5, 0);')
        parts.append('radialBlur.property("ADBE Radial Blur-0001").setValueAtTime(dur, 100);')
        parts.append('radialBlur.property("ADBE Radial Blur-0004").setValue(2);') # Type: Zoom (2)
        parts.append('')

    if 'GlitchTransition' in parsed_components:
        parts.append('// GlitchTransition (Adjustment Layer)')
        parts.append('var gLayer = comp.layers.addShape();')
        parts.append('gLayer.name = "GlitchTransition";')
        parts.append('gLayer.adjustmentLayer = true;')
        parts.append('var shapeRoot = gLayer.property("ADBE Root Vectors Group");')
        parts.append('var rect = shapeRoot.addProperty("ADBE Vector Shape - Rect");')
        parts.append(f'rect.property("ADBE Vector Rect Size").setValue([{width}, {height}]);')
        parts.append('var fill = shapeRoot.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('fill.property("ADBE Vector Fill Color").setValue([1,1,1]);')
        parts.append(f'gLayer.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2}, {height/2}]);')
        
        parts.append('var dur = comp.duration;')
        parts.append('gLayer.inPoint = dur - 0.4;') # Only active at the end
        
        parts.append('var mosaic = gLayer.property("ADBE Effect Parade").addProperty("ADBE Mosaic");')
        parts.append('mosaic.property("ADBE Mosaic-0001").setValue(10);') # Blocks Horizontal
        parts.append('mosaic.property("ADBE Mosaic-0002").setValue(10);') # Blocks Vertical
        
        parts.append('var invert = gLayer.property("ADBE Effect Parade").addProperty("ADBE Invert");')
        # Wiggle opacity to make it flash
        parts.append('gLayer.property("ADBE Transform Group").property("ADBE Opacity").expression = "wiggle(20, 100)";')
        
        parts.append('var transformEffect = gLayer.property("ADBE Effect Parade").addProperty("ADBE Transform");')
        parts.append('transformEffect.property("ADBE Transform-0002").expression = "value + [wiggle(30, 50)[0]-value[0], 0]";') # Wiggle Position X
        parts.append('')

    if 'WipeTransition' in parsed_components:
        wipe_props = parsed_components['WipeTransition']
        color = wipe_props.get('color', '#0f172a')
        
        parts.append('// WipeTransition')
        parts.append('var wLayer = comp.layers.addShape();')
        parts.append('wLayer.name = "WipeTransition";')
        parts.append('var shapeRoot = wLayer.property("ADBE Root Vectors Group");')
        parts.append('var rect = shapeRoot.addProperty("ADBE Vector Shape - Rect");')
        
        # Make it huge to cover screen when rotated
        diag = (width * width + height * height) ** 0.5
        parts.append(f'rect.property("ADBE Vector Rect Size").setValue([{diag*2}, {diag*2}]);')
        
        parts.append('var fill = shapeRoot.addProperty("ADBE Vector Graphic - Fill");')
        parts.append(f'fill.property("ADBE Vector Fill Color").setValue({hex_to_rgb_array(color)});')
        
        parts.append('wLayer.property("ADBE Transform Group").property("ADBE Rotation").setValue(45);')
        
        parts.append('var dur = comp.duration;')
        parts.append('var pos = wLayer.property("ADBE Transform Group").property("ADBE Position");')
        parts.append(f'pos.setValueAtTime(dur - 0.5, [{-diag}, {height/2}]);')
        parts.append(f'pos.setValueAtTime(dur, [{width + diag}, {height/2}]);')
        parts.append('pos.setInterpolationTypeAtKey(1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
        parts.append('pos.setInterpolationTypeAtKey(2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);')
        parts.append('')

    if 'LightLeakTransition' in parsed_components:
        parts.append('// LightLeakTransition')
        parts.append('var leakLayer = comp.layers.addShape();')
        parts.append('leakLayer.name = "LightLeakTransition";')
        parts.append('leakLayer.blendingMode = BlendingMode.ADD;')
        parts.append('var shapeRoot = leakLayer.property("ADBE Root Vectors Group");')
        parts.append('var rect = shapeRoot.addProperty("ADBE Vector Shape - Ellipse");')
        parts.append('rect.property("ADBE Vector Ellipse Size").setValue([1200, 1200]);')
        parts.append('var fill = shapeRoot.addProperty("ADBE Vector Graphic - Fill");')
        parts.append('fill.property("ADBE Vector Fill Color").setValue([1, 0.4, 0]);') # Orange
        
        parts.append('var dur = comp.duration;')
        parts.append('var pos = leakLayer.property("ADBE Transform Group").property("ADBE Position");')
        parts.append(f'pos.setValueAtTime(dur - 0.5, [{-500}, {height/2}]);')
        parts.append(f'pos.setValueAtTime(dur, [{width + 500}, {height/2}]);')
        
        # Feather mask or blur
        parts.append('var blur = leakLayer.property("ADBE Effect Parade").addProperty("ADBE Fast Blur");')
        parts.append('blur.property("ADBE Fast Blur-0001").setValue(250);')
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

    if 'FeatureChecklist' in parsed_components:
        check_props = parsed_components['FeatureChecklist']
        items_str = check_props.get('itemsStr', '')
        items = [s.strip() for s in items_str.split(',') if s.strip()]
        
        parts.append('// FeatureChecklist')
        for i, item in enumerate(items):
            delay = 0.5 + (i * 0.5)
            
            # Text
            parts.append(f'var itemText{i} = comp.layers.addText();')
            parts.append(f'var textProp{i} = itemText{i}.property("Source Text");')
            parts.append(f'var textDoc{i} = textProp{i}.value;')
            parts.append(f'textDoc{i}.text = "{item}";')
            parts.append(f'textDoc{i}.fontSize = 32;')
            check_text_color = check_props.get('textColor', '#1e293b')
            parts.append(f'textDoc{i}.fillColor = {hex_to_rgb_array(check_text_color)};')
            parts.append(f'textProp{i}.setValue(textDoc{i});')
            parts.append(f'itemText{i}.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2 - 100}, {height/2 + (i*60)}]);')
            
            # Opacity Fade
            parts.append(f'var tOp{i} = itemText{i}.property("ADBE Transform Group").property("ADBE Opacity");')
            parts.append(f'tOp{i}.setValueAtTime({delay}, 0);')
            parts.append(f'tOp{i}.setValueAtTime({delay + 0.3}, 100);')
            
            # Checkmark Vector (V shape)
            parts.append(f'var checkLayer{i} = comp.layers.addShape();')
            parts.append(f'checkLayer{i}.name = "Check_{i}";')
            parts.append(f'var shapeRoot{i} = checkLayer{i}.property("ADBE Root Vectors Group");')
            parts.append(f'var checkGroup{i} = shapeRoot{i}.addProperty("ADBE Vector Group");')
            parts.append(f'var checkVec{i} = checkGroup{i}.property("ADBE Vectors Group");')
            
            parts.append(f'var pathGroup{i} = checkVec{i}.addProperty("ADBE Vector Shape - Group");')
            parts.append('var pathData = new Shape();')
            # V shape: start top-left, go down-right, go up-right
            parts.append('pathData.vertices = [[-10, 0], [-2, 10], [12, -10]];')
            parts.append('pathData.closed = false;')
            parts.append(f'pathGroup{i}.property("ADBE Vector Shape").setValue(pathData);')
            
            parts.append(f'var stroke{i} = checkVec{i}.addProperty("ADBE Vector Graphic - Stroke");')
            check_color = check_props.get('checkColor', '#10b981')
            parts.append(f'stroke{i}.property("ADBE Vector Stroke Color").setValue({hex_to_rgb_array(check_color)});')
            parts.append(f'stroke{i}.property("ADBE Vector Stroke Width").setValue(5);')
            
            # Trim Paths Magic
            parts.append(f'var trim{i} = checkVec{i}.addProperty("ADBE Vector Filter - Trim");')
            parts.append(f'trim{i}.property("ADBE Vector Trim End").setValueAtTime(0, 0);')
            parts.append(f'trim{i}.property("ADBE Vector Trim End").setValueAtTime({delay}, 0);')
            parts.append(f'trim{i}.property("ADBE Vector Trim End").setValueAtTime({delay + 0.3}, 100);')
            
            parts.append(f'checkLayer{i}.property("ADBE Transform Group").property("ADBE Position").setValue([{width/2 - 150}, {height/2 - 10 + (i*60)}]);')

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
        props = parsed_components['TerminalHacker']
        parts.append('// TerminalHacker')
        parts.append('var termL = comp.layers.addText();')
        parts.append('termL.name = "TerminalHacker";')
        parts.append('var termP = termL.property("Source Text");')
        parts.append('var termD = termP.value;')
        parts.append('termD.text = "Terminal Hacker Component";')
        parts.append('termD.fontSize = 40;')
        parts.append(f'termD.fillColor = {hex_to_rgb_array(props.get("textColor", "#22c55e"))};')
        parts.append('termP.setValue(termD);')
        parts.append(f'termL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'APIRequestFlow' in parsed_components:
        props = parsed_components['APIRequestFlow']
        parts.append('// APIRequestFlow')
        parts.append('var apiL = comp.layers.addText();')
        parts.append('apiL.name = "APIRequestFlow";')
        parts.append('var apiP = apiL.property("Source Text");')
        parts.append('var apiD = apiP.value;')
        parts.append('apiD.text = "API Request Flow Component";')
        parts.append('apiD.fontSize = 40;')
        parts.append(f'apiD.fillColor = {hex_to_rgb_array(props.get("color", "#3b82f6"))};')
        parts.append('apiP.setValue(apiD);')
        parts.append(f'apiL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'GitCommitGraph' in parsed_components:
        props = parsed_components['GitCommitGraph']
        parts.append('// GitCommitGraph')
        parts.append('var gitL = comp.layers.addText();')
        parts.append('gitL.name = "GitCommitGraph";')
        parts.append('var gitP = gitL.property("Source Text");')
        parts.append('var gitD = gitP.value;')
        parts.append('gitD.text = "Git Commit Graph Component";')
        parts.append('gitD.fontSize = 40;')
        parts.append(f'gitD.fillColor = {hex_to_rgb_array(props.get("nodeColor", "#3b82f6"))};')
        parts.append('gitP.setValue(gitD);')
        parts.append(f'gitL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'CodeBlockHighlight' in parsed_components:
        props = parsed_components['CodeBlockHighlight']
        parts.append('// CodeBlockHighlight')
        parts.append('var cbL = comp.layers.addText();')
        parts.append('cbL.name = "CodeBlockHighlight";')
        parts.append('var cbP = cbL.property("Source Text");')
        parts.append('var cbD = cbP.value;')
        parts.append('cbD.text = "Code Block Highlight Component";')
        parts.append('cbD.fontSize = 40;')
        parts.append(f'cbD.fillColor = {hex_to_rgb_array(props.get("accentColor", "#38bdf8"))};')
        parts.append('cbP.setValue(cbD);')
        parts.append(f'cbL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'NotificationToast' in parsed_components:
        props = parsed_components['NotificationToast']
        parts.append('// NotificationToast')
        parts.append('var toastL = comp.layers.addText();')
        parts.append('toastL.name = "NotificationToast";')
        parts.append('var toastP = toastL.property("Source Text");')
        parts.append('var toastD = toastP.value;')
        parts.append('toastD.text = "Notification Toast Component";')
        parts.append('toastD.fontSize = 40;')
        parts.append(f'toastD.fillColor = {hex_to_rgb_array(props.get("color", "#22c55e"))};')
        parts.append('toastP.setValue(toastD);')
        parts.append(f'toastL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 150)}]);')
        parts.append('')

    if 'LoadingSpinner' in parsed_components:
        props = parsed_components['LoadingSpinner']
        parts.append('// LoadingSpinner')
        parts.append('var spinL = comp.layers.addText();')
        parts.append('spinL.name = "LoadingSpinner";')
        parts.append('var spinP = spinL.property("Source Text");')
        parts.append('var spinD = spinP.value;')
        parts.append('spinD.text = "Loading Spinner Component";')
        parts.append('spinD.fontSize = 40;')
        parts.append(f'spinD.fillColor = {hex_to_rgb_array(props.get("color", "#3b82f6"))};')
        parts.append('spinP.setValue(spinD);')
        parts.append(f'spinL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    # ════════════════════════════════════════
    # PODCAST & AUDIO
    # ════════════════════════════════════════

    if 'AudioSpectrumBars' in parsed_components:
        props = parsed_components['AudioSpectrumBars']
        parts.append('// AudioSpectrumBars')
        parts.append('var asbL = comp.layers.addText();')
        parts.append('asbL.name = "AudioSpectrumBars";')
        parts.append('var asbP = asbL.property("Source Text");')
        parts.append('var asbD = asbP.value;')
        parts.append('asbD.text = "Audio Spectrum Bars Component";')
        parts.append('asbD.fontSize = 40;')
        parts.append(f'asbD.fillColor = {hex_to_rgb_array(props.get("color", "#10b981"))};')
        parts.append('asbP.setValue(asbD);')
        parts.append(f'asbL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 800)}]);')
        parts.append('')

    if 'PodcastGuestCard' in parsed_components:
        props = parsed_components['PodcastGuestCard']
        parts.append('// PodcastGuestCard')
        parts.append('var pgcL = comp.layers.addText();')
        parts.append('pgcL.name = "PodcastGuestCard";')
        parts.append('var pgcP = pgcL.property("Source Text");')
        parts.append('var pgcD = pgcP.value;')
        parts.append('pgcD.text = "Podcast Guest Card Component";')
        parts.append('pgcD.fontSize = 40;')
        parts.append(f'pgcD.fillColor = {hex_to_rgb_array(props.get("glowColor", "#3b82f6"))};')
        parts.append('pgcP.setValue(pgcD);')
        parts.append(f'pgcL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'MessageBubble' in parsed_components:
        props = parsed_components['MessageBubble']
        parts.append('// MessageBubble')
        parts.append('var mbL = comp.layers.addText();')
        parts.append('mbL.name = "MessageBubble";')
        parts.append('var mbP = mbL.property("Source Text");')
        parts.append('var mbD = mbP.value;')
        parts.append('mbD.text = "Message Bubble Component";')
        parts.append('mbD.fontSize = 40;')
        parts.append(f'mbD.fillColor = {hex_to_rgb_array(props.get("senderColor", "#22c55e"))};')
        parts.append('mbP.setValue(mbD);')
        parts.append(f'mbL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'WaveformVisualizer' in parsed_components:
        props = parsed_components['WaveformVisualizer']
        parts.append('// WaveformVisualizer')
        parts.append('var wvL = comp.layers.addText();')
        parts.append('wvL.name = "WaveformVisualizer";')
        parts.append('var wvP = wvL.property("Source Text");')
        parts.append('var wvD = wvP.value;')
        parts.append('wvD.text = "Waveform Visualizer Component";')
        parts.append('wvD.fontSize = 40;')
        parts.append(f'wvD.fillColor = {hex_to_rgb_array(props.get("color", "#8b5cf6"))};')
        parts.append('wvP.setValue(wvD);')
        parts.append(f'wvL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'QuoteBlock' in parsed_components:
        props = parsed_components['QuoteBlock']
        parts.append('// QuoteBlock')
        parts.append('var qbL = comp.layers.addText();')
        parts.append('qbL.name = "QuoteBlock";')
        parts.append('var qbP = qbL.property("Source Text");')
        parts.append('var qbD = qbP.value;')
        parts.append('qbD.text = "Quote Block Component";')
        parts.append('qbD.fontSize = 40;')
        parts.append(f'qbD.fillColor = {hex_to_rgb_array(props.get("color", "#eab308"))};')
        parts.append('qbP.setValue(qbD);')
        parts.append(f'qbL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'SoundWaveCircle' in parsed_components:
        props = parsed_components['SoundWaveCircle']
        parts.append('// SoundWaveCircle')
        parts.append('var swcL = comp.layers.addText();')
        parts.append('swcL.name = "SoundWaveCircle";')
        parts.append('var swcP = swcL.property("Source Text");')
        parts.append('var swcD = swcP.value;')
        parts.append('swcD.text = "Sound Wave Circle Component";')
        parts.append('swcD.fontSize = 40;')
        parts.append(f'swcD.fillColor = {hex_to_rgb_array(props.get("color", "#f43f5e"))};')
        parts.append('swcP.setValue(swcD);')
        parts.append(f'swcL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    # ════════════════════════════════════════
    # NEWS, BROADCAST & SPORTS
    # ════════════════════════════════════════

    if 'LowerThird' in parsed_components:
        props = parsed_components['LowerThird']
        parts.append('// LowerThird')
        parts.append('var ltL = comp.layers.addText();')
        parts.append('ltL.name = "LowerThird";')
        parts.append('var ltP = ltL.property("Source Text");')
        parts.append('var ltD = ltP.value;')
        parts.append('ltD.text = "Lower Third Component";')
        parts.append('ltD.fontSize = 40;')
        parts.append(f'ltD.fillColor = {hex_to_rgb_array(props.get("color", "#2563eb"))};')
        parts.append('ltP.setValue(ltD);')
        parts.append(f'ltL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 200)}, {props.get("y", 800)}]);')
        parts.append('')

    if 'BreakingNewsTicker' in parsed_components:
        props = parsed_components['BreakingNewsTicker']
        parts.append('// BreakingNewsTicker')
        parts.append('var bntL = comp.layers.addText();')
        parts.append('bntL.name = "BreakingNewsTicker";')
        parts.append('var bntP = bntL.property("Source Text");')
        parts.append('var bntD = bntP.value;')
        parts.append('bntD.text = "Breaking News Ticker Component";')
        parts.append('bntD.fontSize = 40;')
        parts.append(f'bntD.fillColor = {hex_to_rgb_array(props.get("bgColor", "#ef4444"))};')
        parts.append('bntP.setValue(bntD);')
        parts.append(f'bntL.property("ADBE Transform Group").property("ADBE Position").setValue([540, 960]);')
        parts.append('')

    if 'VersusScreen' in parsed_components:
        props = parsed_components['VersusScreen']
        parts.append('// VersusScreen')
        parts.append('var vsL = comp.layers.addText();')
        parts.append('vsL.name = "VersusScreen";')
        parts.append('var vsP = vsL.property("Source Text");')
        parts.append('var vsD = vsP.value;')
        parts.append('vsD.text = "Versus Screen Component";')
        parts.append('vsD.fontSize = 40;')
        parts.append(f'vsD.fillColor = {hex_to_rgb_array(props.get("colorA", "#61dafb"))};')
        parts.append('vsP.setValue(vsD);')
        parts.append(f'vsL.property("ADBE Transform Group").property("ADBE Position").setValue([540, 540]);')
        parts.append('')

    if 'ScoreboardCounter' in parsed_components:
        props = parsed_components['ScoreboardCounter']
        parts.append('// ScoreboardCounter')
        parts.append('var scL = comp.layers.addText();')
        parts.append('scL.name = "ScoreboardCounter";')
        parts.append('var scP = scL.property("Source Text");')
        parts.append('var scD = scP.value;')
        parts.append('scD.text = "Scoreboard Counter Component";')
        parts.append('scD.fontSize = 40;')
        parts.append(f'scD.fillColor = {hex_to_rgb_array(props.get("colorA", "#ef4444"))};')
        parts.append('scP.setValue(scD);')
        parts.append(f'scL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'BreakingNewsAlert' in parsed_components:
        props = parsed_components['BreakingNewsAlert']
        parts.append('// BreakingNewsAlert')
        parts.append('var bnaL = comp.layers.addText();')
        parts.append('bnaL.name = "BreakingNewsAlert";')
        parts.append('var bnaP = bnaL.property("Source Text");')
        parts.append('var bnaD = bnaP.value;')
        parts.append('bnaD.text = "Breaking News Alert Component";')
        parts.append('bnaD.fontSize = 40;')
        parts.append(f'bnaD.fillColor = {hex_to_rgb_array(props.get("bgColor", "#ef4444"))};')
        parts.append('bnaP.setValue(bnaD);')
        parts.append(f'bnaL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'CountdownTimer' in parsed_components:
        props = parsed_components['CountdownTimer']
        parts.append('// CountdownTimer')
        parts.append('var ctL = comp.layers.addText();')
        parts.append('ctL.name = "CountdownTimer";')
        parts.append('var ctP = ctL.property("Source Text");')
        parts.append('var ctD = ctP.value;')
        parts.append('ctD.text = "Countdown Timer Component";')
        parts.append('ctD.fontSize = 40;')
        parts.append(f'ctD.fillColor = {hex_to_rgb_array(props.get("color", "#eab308"))};')
        parts.append('ctP.setValue(ctD);')
        parts.append(f'ctL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    # ════════════════════════════════════════
    # ADVANCED DATA VIZ
    # ════════════════════════════════════════

    if 'PieChartReveal' in parsed_components:
        props = parsed_components['PieChartReveal']
        parts.append('// PieChartReveal')
        parts.append('var pcrL = comp.layers.addText();')
        parts.append('pcrL.name = "PieChartReveal";')
        parts.append('var pcrP = pcrL.property("Source Text");')
        parts.append('var pcrD = pcrP.value;')
        parts.append('pcrD.text = "Pie Chart Reveal Component";')
        parts.append('pcrD.fontSize = 40;')
        parts.append(f'pcrD.fillColor = {hex_to_rgb_array(props.get("bgColor", "#0f172a"))};')
        parts.append('pcrP.setValue(pcrD);')
        parts.append(f'pcrL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'StockCandlestick' in parsed_components:
        props = parsed_components['StockCandlestick']
        parts.append('// StockCandlestick')
        parts.append('var scsL = comp.layers.addText();')
        parts.append('scsL.name = "StockCandlestick";')
        parts.append('var scsP = scsL.property("Source Text");')
        parts.append('var scsD = scsP.value;')
        parts.append('scsD.text = "Stock Candlestick Component";')
        parts.append('scsD.fontSize = 40;')
        parts.append(f'scsD.fillColor = {hex_to_rgb_array(props.get("upColor", "#22c55e"))};')
        parts.append('scsP.setValue(scsD);')
        parts.append(f'scsL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'RadarSpiderChart' in parsed_components:
        props = parsed_components['RadarSpiderChart']
        parts.append('// RadarSpiderChart')
        parts.append('var rscL = comp.layers.addText();')
        parts.append('rscL.name = "RadarSpiderChart";')
        parts.append('var rscP = rscL.property("Source Text");')
        parts.append('var rscD = rscP.value;')
        parts.append('rscD.text = "Radar Spider Chart Component";')
        parts.append('rscD.fontSize = 40;')
        parts.append(f'rscD.fillColor = {hex_to_rgb_array(props.get("color", "#3b82f6"))};')
        parts.append('rscP.setValue(rscD);')
        parts.append(f'rscL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'FunnelChart' in parsed_components:
        props = parsed_components['FunnelChart']
        parts.append('// FunnelChart')
        parts.append('var fcL = comp.layers.addText();')
        parts.append('fcL.name = "FunnelChart";')
        parts.append('var fcP = fcL.property("Source Text");')
        parts.append('var fcD = fcP.value;')
        parts.append('fcD.text = "Funnel Chart Component";')
        parts.append('fcD.fontSize = 40;')
        parts.append(f'fcD.fillColor = {hex_to_rgb_array(props.get("textColor", "#ffffff"))};')
        parts.append('fcP.setValue(fcD);')
        parts.append(f'fcL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'HorizontalBarRace' in parsed_components:
        props = parsed_components['HorizontalBarRace']
        parts.append('// HorizontalBarRace')
        parts.append('var hbrL = comp.layers.addText();')
        parts.append('hbrL.name = "HorizontalBarRace";')
        parts.append('var hbrP = hbrL.property("Source Text");')
        parts.append('var hbrD = hbrP.value;')
        parts.append('hbrD.text = "Horizontal Bar Race Component";')
        parts.append('hbrD.fontSize = 40;')
        parts.append(f'hbrD.fillColor = {hex_to_rgb_array(props.get("textColor", "#ffffff"))};')
        parts.append('hbrP.setValue(hbrD);')
        parts.append(f'hbrL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'CounterNumber' in parsed_components:
        props = parsed_components['CounterNumber']
        parts.append('// CounterNumber')
        parts.append('var cnL = comp.layers.addText();')
        parts.append('cnL.name = "CounterNumber";')
        parts.append('var cnP = cnL.property("Source Text");')
        parts.append('var cnD = cnP.value;')
        parts.append('cnD.text = "Counter Number Component";')
        parts.append('cnD.fontSize = 40;')
        parts.append(f'cnD.fillColor = {hex_to_rgb_array(props.get("color", "#22c55e"))};')
        parts.append('cnP.setValue(cnD);')
        parts.append(f'cnL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    # ════════════════════════════════════════
    # SOCIAL MEDIA & UGC
    # ════════════════════════════════════════

    if 'TweetCard' in parsed_components:
        props = parsed_components['TweetCard']
        parts.append('// TweetCard')
        parts.append('var tcL = comp.layers.addText();')
        parts.append('tcL.name = "TweetCard";')
        parts.append('var tcP = tcL.property("Source Text");')
        parts.append('var tcD = tcP.value;')
        parts.append('tcD.text = "Tweet Card Component";')
        parts.append('tcD.fontSize = 40;')
        parts.append(f'tcD.fillColor = {hex_to_rgb_array(props.get("color", "#1d9bf0"))};')
        parts.append('tcP.setValue(tcD);')
        parts.append(f'tcL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'InstagramPost' in parsed_components:
        props = parsed_components['InstagramPost']
        parts.append('// InstagramPost')
        parts.append('var ipL = comp.layers.addText();')
        parts.append('ipL.name = "InstagramPost";')
        parts.append('var ipP = ipL.property("Source Text");')
        parts.append('var ipD = ipP.value;')
        parts.append('ipD.text = "Instagram Post Component";')
        parts.append('ipD.fontSize = 40;')
        parts.append(f'ipD.fillColor = {hex_to_rgb_array(props.get("color", "#e1306c"))};')
        parts.append('ipP.setValue(ipD);')
        parts.append(f'ipL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'TikTokOverlay' in parsed_components:
        props = parsed_components['TikTokOverlay']
        parts.append('// TikTokOverlay')
        parts.append('var ttoL = comp.layers.addText();')
        parts.append('ttoL.name = "TikTokOverlay";')
        parts.append('var ttoP = ttoL.property("Source Text");')
        parts.append('var ttoD = ttoP.value;')
        parts.append('ttoD.text = "TikTok Overlay Component";')
        parts.append('ttoD.fontSize = 40;')
        parts.append(f'ttoD.fillColor = {hex_to_rgb_array(props.get("color", "#fe2c55"))};')
        parts.append('ttoP.setValue(ttoD);')
        parts.append(f'ttoL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 900)}, {props.get("y", 960)}]);')
        parts.append('')

    if 'YouTubeEndScreen' in parsed_components:
        props = parsed_components['YouTubeEndScreen']
        parts.append('// YouTubeEndScreen')
        parts.append('var yesL = comp.layers.addText();')
        parts.append('yesL.name = "YouTubeEndScreen";')
        parts.append('var yesP = yesL.property("Source Text");')
        parts.append('var yesD = yesP.value;')
        parts.append('yesD.text = "YouTube End Screen Component";')
        parts.append('yesD.fontSize = 40;')
        parts.append(f'yesD.fillColor = {hex_to_rgb_array(props.get("subscribeColor", "#ff0000"))};')
        parts.append('yesP.setValue(yesD);')
        parts.append(f'yesL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'FollowerCounter' in parsed_components:
        props = parsed_components['FollowerCounter']
        parts.append('// FollowerCounter')
        parts.append('var fcL = comp.layers.addText();')
        parts.append('fcL.name = "FollowerCounter";')
        parts.append('var fcP = fcL.property("Source Text");')
        parts.append('var fcD = fcP.value;')
        parts.append('fcD.text = "Follower Counter Component";')
        parts.append('fcD.fontSize = 40;')
        parts.append(f'fcD.fillColor = {hex_to_rgb_array(props.get("color", "#e1306c"))};')
        parts.append('fcP.setValue(fcD);')
        parts.append(f'fcL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'SocialSharePopup' in parsed_components:
        props = parsed_components['SocialSharePopup']
        parts.append('// SocialSharePopup')
        parts.append('var sspL = comp.layers.addText();')
        parts.append('sspL.name = "SocialSharePopup";')
        parts.append('var sspP = sspL.property("Source Text");')
        parts.append('var sspD = sspP.value;')
        parts.append('sspD.text = "Social Share Popup Component";')
        parts.append('sspD.fontSize = 40;')
        parts.append(f'sspD.fillColor = {hex_to_rgb_array(props.get("color", "#3b82f6"))};')
        parts.append('sspP.setValue(sspD);')
        parts.append(f'sspL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    # ════════════════════════════════════════
    # ADVANCED E-COMMERCE & B2C
    # ════════════════════════════════════════

    if 'PromoCodeBanner' in parsed_components:
        props = parsed_components['PromoCodeBanner']
        parts.append('// PromoCodeBanner')
        parts.append('var pcbL = comp.layers.addText();')
        parts.append('pcbL.name = "PromoCodeBanner";')
        parts.append('var pcbP = pcbL.property("Source Text");')
        parts.append('var pcbD = pcbP.value;')
        parts.append('pcbD.text = "Promo Code Banner Component";')
        parts.append('pcbD.fontSize = 40;')
        parts.append(f'pcbD.fillColor = {hex_to_rgb_array(props.get("bgColor", "#eab308"))};')
        parts.append('pcbP.setValue(pcbD);')
        parts.append(f'pcbL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'SizeSelector' in parsed_components:
        props = parsed_components['SizeSelector']
        parts.append('// SizeSelector')
        parts.append('var ssL = comp.layers.addText();')
        parts.append('ssL.name = "SizeSelector";')
        parts.append('var ssP = ssL.property("Source Text");')
        parts.append('var ssD = ssP.value;')
        parts.append('ssD.text = "Size Selector Component";')
        parts.append('ssD.fontSize = 40;')
        parts.append(f'ssD.fillColor = {hex_to_rgb_array(props.get("color", "#0f172a"))};')
        parts.append('ssP.setValue(ssD);')
        parts.append(f'ssL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'AppStoreButtons' in parsed_components:
        props = parsed_components['AppStoreButtons']
        parts.append('// AppStoreButtons')
        parts.append('var asbL = comp.layers.addText();')
        parts.append('asbL.name = "AppStoreButtons";')
        parts.append('var asbP = asbL.property("Source Text");')
        parts.append('var asbD = asbP.value;')
        parts.append('asbD.text = "App Store Buttons Component";')
        parts.append('asbD.fontSize = 40;')
        parts.append(f'asbD.fillColor = {hex_to_rgb_array(props.get("bgColor", "#000000"))};')
        parts.append('asbP.setValue(asbD);')
        parts.append(f'asbL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'FeatureUnlock' in parsed_components:
        props = parsed_components['FeatureUnlock']
        parts.append('// FeatureUnlock')
        parts.append('var fuL = comp.layers.addText();')
        parts.append('fuL.name = "FeatureUnlock";')
        parts.append('var fuP = fuL.property("Source Text");')
        parts.append('var fuD = fuP.value;')
        parts.append('fuD.text = "Feature Unlock Component";')
        parts.append('fuD.fontSize = 40;')
        parts.append(f'fuD.fillColor = {hex_to_rgb_array(props.get("color", "#eab308"))};')
        parts.append('fuP.setValue(fuD);')
        parts.append(f'fuL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'FlashSaleTimer' in parsed_components:
        props = parsed_components['FlashSaleTimer']
        parts.append('// FlashSaleTimer')
        parts.append('var fstL = comp.layers.addText();')
        parts.append('fstL.name = "FlashSaleTimer";')
        parts.append('var fstP = fstL.property("Source Text");')
        parts.append('var fstD = fstP.value;')
        parts.append('fstD.text = "Flash Sale Timer Component";')
        parts.append('fstD.fontSize = 40;')
        parts.append(f'fstD.fillColor = {hex_to_rgb_array(props.get("color", "#ef4444"))};')
        parts.append('fstP.setValue(fstD);')
        parts.append(f'fstL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'PricingTableReveal' in parsed_components:
        props = parsed_components['PricingTableReveal']
        parts.append('// PricingTableReveal')
        parts.append('var ptrL = comp.layers.addText();')
        parts.append('ptrL.name = "PricingTableReveal";')
        parts.append('var ptrP = ptrL.property("Source Text");')
        parts.append('var ptrD = ptrP.value;')
        parts.append('ptrD.text = "Pricing Table Reveal Component";')
        parts.append('ptrD.fontSize = 40;')
        parts.append(f'ptrD.fillColor = {hex_to_rgb_array(props.get("highlightColor", "#3b82f6"))};')
        parts.append('ptrP.setValue(ptrD);')
        parts.append(f'ptrL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    # ════════════════════════════════════════
    # SPRINT 4: PRIMITIVAS GEOMÉTRICAS
    # ════════════════════════════════════════

    if 'AnimatedShape' in parsed_components:
        props = parsed_components['AnimatedShape']
        parts.append('// AnimatedShape')
        parts.append('var ashL = comp.layers.addText();')
        parts.append('ashL.name = "AnimatedShape";')
        parts.append('var ashP = ashL.property("Source Text");')
        parts.append('var ashD = ashP.value;')
        parts.append('ashD.text = "Animated Shape Component";')
        parts.append('ashD.fontSize = 40;')
        parts.append(f'ashD.fillColor = {hex_to_rgb_array(props.get("color", "#3b82f6"))};')
        parts.append('ashP.setValue(ashD);')
        parts.append(f'ashL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'AnimatedLine' in parsed_components:
        props = parsed_components['AnimatedLine']
        parts.append('// AnimatedLine')
        parts.append('var alL = comp.layers.addText();')
        parts.append('alL.name = "AnimatedLine";')
        parts.append('var alP = alL.property("Source Text");')
        parts.append('var alD = alP.value;')
        parts.append('alD.text = "Animated Line Component";')
        parts.append('alD.fontSize = 40;')
        parts.append(f'alD.fillColor = {hex_to_rgb_array(props.get("color", "#3b82f6"))};')
        parts.append('alP.setValue(alD);')
        parts.append(f'alL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'AnimatedIcon' in parsed_components:
        props = parsed_components['AnimatedIcon']
        parts.append('// AnimatedIcon')
        parts.append('var aicL = comp.layers.addText();')
        parts.append('aicL.name = "AnimatedIcon";')
        parts.append('var aicP = aicL.property("Source Text");')
        parts.append('var aicD = aicP.value;')
        parts.append('aicD.text = "Animated Icon Component";')
        parts.append('aicD.fontSize = 40;')
        parts.append(f'aicD.fillColor = {hex_to_rgb_array(props.get("color", "#eab308"))};')
        parts.append('aicP.setValue(aicD);')
        parts.append(f'aicL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'FloatingBadge' in parsed_components:
        props = parsed_components['FloatingBadge']
        parts.append('// FloatingBadge')
        parts.append('var fbL = comp.layers.addText();')
        parts.append('fbL.name = "FloatingBadge";')
        parts.append('var fbP = fbL.property("Source Text");')
        parts.append('var fbD = fbP.value;')
        parts.append('fbD.text = "Floating Badge Component";')
        parts.append('fbD.fontSize = 40;')
        parts.append(f'fbD.fillColor = {hex_to_rgb_array(props.get("color", "#ef4444"))};')
        parts.append('fbP.setValue(fbD);')
        parts.append(f'fbL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'AnimatedArrow' in parsed_components:
        props = parsed_components['AnimatedArrow']
        parts.append('// AnimatedArrow')
        parts.append('var aarL = comp.layers.addText();')
        parts.append('aarL.name = "AnimatedArrow";')
        parts.append('var aarP = aarL.property("Source Text");')
        parts.append('var aarD = aarP.value;')
        parts.append('aarD.text = "Animated Arrow Component";')
        parts.append('aarD.fontSize = 40;')
        parts.append(f'aarD.fillColor = {hex_to_rgb_array(props.get("color", "#ffffff"))};')
        parts.append('aarP.setValue(aarD);')
        parts.append(f'aarL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'EmojiFloat' in parsed_components:
        props = parsed_components['EmojiFloat']
        parts.append('// EmojiFloat')
        parts.append('var efL = comp.layers.addText();')
        parts.append('efL.name = "EmojiFloat";')
        parts.append('var efP = efL.property("Source Text");')
        parts.append('var efD = efP.value;')
        parts.append('efD.text = "Emoji Float Component";')
        parts.append('efD.fontSize = 40;')
        parts.append(f'efD.fillColor = [1,1,1];')
        parts.append('efP.setValue(efD);')
        parts.append(f'efL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'GradientOverlay' in parsed_components:
        props = parsed_components['GradientOverlay']
        parts.append('// GradientOverlay')
        parts.append('var goL = comp.layers.addText();')
        parts.append('goL.name = "GradientOverlay";')
        parts.append('var goP = goL.property("Source Text");')
        parts.append('var goD = goP.value;')
        parts.append('goD.text = "Gradient Overlay Component";')
        parts.append('goD.fontSize = 40;')
        parts.append(f'goD.fillColor = {hex_to_rgb_array(props.get("color1", "#000000"))};')
        parts.append('goP.setValue(goD);')
        parts.append(f'goL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'TextBubble' in parsed_components:
        props = parsed_components['TextBubble']
        parts.append('// TextBubble')
        parts.append('var tbL = comp.layers.addText();')
        parts.append('tbL.name = "TextBubble";')
        parts.append('var tbP = tbL.property("Source Text");')
        parts.append('var tbD = tbP.value;')
        parts.append('tbD.text = "Text Bubble Component";')
        parts.append('tbD.fontSize = 40;')
        parts.append(f'tbD.fillColor = {hex_to_rgb_array(props.get("bgColor", "#ffffff"))};')
        parts.append('tbP.setValue(tbD);')
        parts.append(f'tbL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    # ════════════════════════════════════════
    # SPRINT 4.5: PRIMITIVAS EXTRA
    # ════════════════════════════════════════

    if 'MediaFrame' in parsed_components:
        props = parsed_components['MediaFrame']
        parts.append('// MediaFrame')
        parts.append('var mfL = comp.layers.addText();')
        parts.append('mfL.name = "MediaFrame";')
        parts.append('var mfP = mfL.property("Source Text");')
        parts.append('var mfD = mfP.value;')
        parts.append('mfD.text = "Media Frame Component\\n" + "' + props.get("url", "") + '";')
        parts.append('mfD.fontSize = 30;')
        parts.append('mfD.fillColor = [0.8, 0.8, 0.8];')
        parts.append('mfP.setValue(mfD);')
        parts.append(f'mfL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'RippleEffect' in parsed_components:
        props = parsed_components['RippleEffect']
        parts.append('// RippleEffect')
        parts.append('var reL = comp.layers.addText();')
        parts.append('reL.name = "RippleEffect";')
        parts.append('var reP = reL.property("Source Text");')
        parts.append('var reD = reP.value;')
        parts.append('reD.text = "Ripple Effect Component";')
        parts.append('reD.fontSize = 40;')
        parts.append(f'reD.fillColor = {hex_to_rgb_array(props.get("color", "#3b82f6"))};')
        parts.append('reP.setValue(reD);')
        parts.append(f'reL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'MaskedReveal' in parsed_components:
        props = parsed_components['MaskedReveal']
        parts.append('// MaskedReveal')
        parts.append('var mrL = comp.layers.addText();')
        parts.append('mrL.name = "MaskedReveal";')
        parts.append('var mrP = mrL.property("Source Text");')
        parts.append('var mrD = mrP.value;')
        parts.append('mrD.text = "Masked Reveal Component\\n" + "' + props.get("content", "") + '";')
        parts.append('mrD.fontSize = 40;')
        parts.append(f'mrD.fillColor = {hex_to_rgb_array(props.get("color", "#ffffff"))};')
        parts.append('mrP.setValue(mrD);')
        parts.append(f'mrL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'ProgressPill' in parsed_components:
        props = parsed_components['ProgressPill']
        parts.append('// ProgressPill')
        parts.append('var ppL = comp.layers.addText();')
        parts.append('ppL.name = "ProgressPill";')
        parts.append('var ppP = ppL.property("Source Text");')
        parts.append('var ppD = ppP.value;')
        parts.append('ppD.text = "Progress Pill Component";')
        parts.append('ppD.fontSize = 40;')
        parts.append(f'ppD.fillColor = {hex_to_rgb_array(props.get("barColor", "#3b82f6"))};')
        parts.append('ppP.setValue(ppD);')
        parts.append(f'ppL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
        parts.append('')

    if 'LottieAnimation' in parsed_components:
        props = parsed_components['LottieAnimation']
        parts.append('// LottieAnimation')
        parts.append('var laL = comp.layers.addText();')
        parts.append('laL.name = "LottieAnimation";')
        parts.append('var laP = laL.property("Source Text");')
        parts.append('var laD = laP.value;')
        parts.append('laD.text = "Lottie Animation Component\\n" + "' + props.get("lottieUrl", "") + '";')
        parts.append('laD.fontSize = 30;')
        parts.append('laD.fillColor = [0.9, 0.9, 0.9];')
        parts.append('laP.setValue(laD);')
        parts.append(f'laL.property("ADBE Transform Group").property("ADBE Position").setValue([{props.get("x", 540)}, {props.get("y", 540)}]);')
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

    return '\n'.join(parts)
