"""
Deterministic AE Script Generator for AnimaFlow.

Generates ExtendScript (.jsx) code WITHOUT using LLM.
Uses enriched TSX analysis + SVG parser data to produce exact code.

Replaces LLM Phase 1 (structure) + Phase 2 (animations) entirely.
"""
import re
from typing import List, Dict, Any, Optional


def generate_deterministic_script(
    svg_elements: list,
    enriched: dict,
    text: str,
    duration: float,
    bg_color: str,
    text_color: str,
    width: int = 1080,
    height: int = 1920,
    fps: int = 30,
) -> str:
    """
    Generate a complete AE ExtendScript from parsed data.
    No LLM involved — 100% deterministic.
    """
    from app.services.ae_export import hex_to_rgb_array
    
    parts = []
    layer_idx = 0
    layer_vars = []  # Track (var_name, element_data) for animation phase
    
    # === HEADER ===
    parts.append(f'var comp = app.project.items.addComp("Scene", {width}, {height}, 1, {duration}, {fps});')
    parts.append(f'comp.layers.addSolid({hex_to_rgb_array(bg_color)}, "Background", {width}, {height}, 1, {duration});')
    parts.append('')
    
    # Build animation lookup from enriched data
    anim_by_var = {a["variable"]: a for a in enriched.get("animations", [])}
    groups = enriched.get("groups", [])
    enriched_elements = enriched.get("elements", [])
    map_expansions = enriched.get("map_expansions", [])
    
    # Separate SVG elements into group children vs standalone
    group_svg_indices = set()
    
    # === GENERATE ANIMATED CIRCLES (ripple, etc.) ===
    for elem in enriched_elements:
        if elem.get("type") == "circle" and elem.get("r_animated"):
            layer_idx += 1
            var = f"sl{layer_idx}"
            name = elem.get("name", f"Circle_{layer_idx}")
            ae_size = elem.get("aeSize", [100, 100])
            pos = elem.get("position", [width // 2, height // 2])
            
            # Find matching circle color from SVG
            circle_color = _find_circle_color(svg_elements, pos)
            
            code = _generate_ellipse_layer(var, name, ae_size, pos, circle_color, stroke_only=True)
            parts.append(code)
            
            r_anim = elem.get("animations", {}).get("radius")
            # For animated radius, we animate Scale (not size)
            # rippleScale goes 0->1400, AE size is 2800, so Scale 0%->100%
            opacity_var = None
            for a in enriched.get("animations", []):
                if "opacity" in a["variable"].lower() and "ripple" in a["variable"].lower():
                    opacity_var = a
                    break
            
            layer_vars.append((var, name, {
                "scale_from_radius": r_anim,
                "opacity": opacity_var,
                "basePosition": pos,
                "maxRadius": elem.get("maxRadius", 100),
            }))
            
    # === IDENTIFY GROUP SHAPES FIRST ===
    matched_svg_ids = set()
    for group in groups:
        children_block = group.get("children_block", "")
        group_shapes = _find_shapes_in_block(children_block, svg_elements)
        for shape in group_shapes:
            matched_svg_ids.add(id(shape))
            
    # === GENERATE STANDALONE SVG ELEMENTS (not in groups, not already used) ===
    for svg_elem in svg_elements:
        if id(svg_elem) in matched_svg_ids:
            continue
        if svg_elem.get("type") in ("circle", "glow", "dropShadow", "gradient", "linearGradient", "radialGradient"):
            continue  # Handled by enriched or are effects/gradients
            
        layer_idx += 1
        var = f"sl{layer_idx}"
        name = _generate_layer_name(svg_elem, layer_idx)
        pos = _calc_center(svg_elem, width, height)
        
        code = _generate_shape_layer(var, name, svg_elem, pos, width, height, svg_elements, is_group_child=False)
        parts.append(code)
        
        # Standalone elements may have opacity animations like lineOpacity or similar variables
        elem_opacity_anim = None
        for a in enriched.get("animations", []):
            vname = a["variable"].lower()
            if "opacity" in vname and "line" in vname and svg_elem.get("type") == "path":
                elem_opacity_anim = a
                break
                
        layer_vars.append((var, name, {
            "basePosition": pos,
            "opacity": elem_opacity_anim,
        }))
            
    # === GENERATE PARTICLES ===
    for expansion in map_expansions:
        for elem_data in expansion["elements"]:
            layer_idx += 1
            var = f"sl{layer_idx}"
            name = f"Particle_{elem_data['index']}"
            pos = [elem_data["x"], elem_data["y"]]
            size = [elem_data["size"] * 2, elem_data["size"] * 2]
            fill = expansion.get("fillColor", "#a2dff7")
            
            code = _generate_ellipse_layer(var, name, size, pos, fill, add_glow=True)
            parts.append(code)
            
            layer_vars.append((var, name, {
                "basePosition": pos,
                "perElementAnimations": {k: v for k, v in elem_data.items() if k.startswith("anim_")},
                "isParticle": True,
            }))

    # === GENERATE GROUP ELEMENTS (like the leaf) ===
    for group in groups:
        tx = group.get("translateX") or width // 2
        ty_var = group.get("translateY_var")
        sc_var = group.get("scale_var")
        op_var = group.get("opacity_var")
        
        # Resolve final position for static setValue
        ty_anim = anim_by_var.get(ty_var)
        ty = ty_anim["keyframes"][-1]["value"] if ty_anim else (group.get("translateY") or height // 2)
        
        children_block = group.get("children_block", "")
        
        # Find SVG elements that belong to this group
        group_shapes = _find_shapes_in_block(children_block, svg_elements)
        
        for shape in group_shapes:
            layer_idx += 1
            var = f"sl{layer_idx}"
            name = _generate_layer_name(shape, layer_idx)
            
            code = _generate_shape_layer(var, name, shape, [tx, ty], width, height, svg_elements, is_group_child=True)
            parts.append(code)
            
            # Collect animation data for this layer
            layer_vars.append((var, name, {
                "positionY": ty_anim,
                "scale": anim_by_var.get(sc_var) if sc_var else None,
                "opacity": anim_by_var.get(op_var) if op_var else None,
                "basePosition": [tx, ty],
                "shape": shape,
            }))
    
    # === GENERATE TEXT LAYER ===
    text_elem = next((e for e in enriched_elements if e.get("type") == "text"), None)
    text_pos = text_elem["position"] if text_elem else [width // 2, int(height * 0.82)]
    
    from app.services.ae_export import hex_to_rgb_array
    parts.append(_generate_text_layer(text, text_color, text_pos, width, height))
    
    # Text animations
    text_anims = {}
    for a in enriched.get("animations", []):
        vname = a["variable"].lower()
        if "textopacity" in vname or "textopac" in vname:
            text_anims["opacity"] = a
        elif "texty" in vname:
            text_anims["positionY"] = a
        elif "textscale" in vname:
            text_anims["scale"] = a
    
    layer_vars.append(("textLayer", "textLayer", {
        "basePosition": text_pos,
        "isText": True,
        **text_anims,
    }))
    
    # === ANIMATIONS ===
    parts.append('')
    parts.append('// === ANIMATIONS ===')
    
    for var, name, anim_data in layer_vars:
        anim_code = _generate_animations(var, name, anim_data, fps)
        if anim_code:
            parts.append(anim_code)
    
    return '\n'.join(parts)


# =============================================================================
# LAYER GENERATORS
# =============================================================================

def _generate_shape_layer(var: str, name: str, elem: dict, position: list, width: int, height: int, svg_elements: list, is_group_child: bool = False) -> str:
    """Generate code for a shape layer (path, rect, line, ellipse, polygon)."""
    from app.services.ae_export import hex_to_rgb_array
    
    lines = [f'// --- {name} ---']
    lines.append(f'var {var} = comp.layers.addShape(); {var}.name = "{name}";')
    lines.append(f'var g{var[2:]} = {var}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");')
    lines.append(f'var vg{var[2:]} = g{var[2:]}.property("ADBE Vectors Group");')
    
    elem_type = elem.get("type", "path")
    idx = var[2:]  # e.g., "1" from "sl1"
    
    if elem_type in ("path", "polygon", "polyline"):
        vertices = elem.get("vertices", [[0, 0]])
        in_tangents = elem.get("inTangents", [[0, 0]] * len(vertices))
        out_tangents = elem.get("outTangents", [[0, 0]] * len(vertices))
        closed = elem.get("closed", False)
        
        # Center vertices around 0,0 so the position property defines the actual bounding box center
        if vertices:
            min_x = min(v[0] for v in vertices)
            max_x = max(v[0] for v in vertices)
            min_y = min(v[1] for v in vertices)
            max_y = max(v[1] for v in vertices)
            cx = (min_x + max_x) / 2
            cy = (min_y + max_y) / 2
            elem["cx"] = cx
            elem["cy"] = cy
            vertices = [[v[0] - cx, v[1] - cy] for v in vertices]
        
        lines.append(f'var ps{idx} = vg{idx}.addProperty("ADBE Vector Shape - Group");')
        lines.append(f'var s{idx} = new Shape();')
        lines.append(f's{idx}.vertices = {_format_points(vertices)};')
        lines.append(f's{idx}.inTangents = {_format_points(in_tangents)};')
        lines.append(f's{idx}.outTangents = {_format_points(out_tangents)};')
        lines.append(f's{idx}.closed = {"true" if closed else "false"};')
        lines.append(f'ps{idx}.property("ADBE Vector Shape").setValue(s{idx});')
    
    elif elem_type == "rect":
        w = elem.get("width", 100)
        h = elem.get("height", 100)
        rx = elem.get("rx", 0)
        lines.append(f'var ps{idx} = vg{idx}.addProperty("ADBE Vector Shape - Rect");')
        lines.append(f'ps{idx}.property("ADBE Vector Rect Size").setValue([{w}, {h}]);')
        if rx > 0:
            lines.append(f'ps{idx}.property("ADBE Vector Rect Roundness").setValue({rx});')
    
    elif elem_type == "ellipse":
        rx = elem.get("rx", 25)
        ry = elem.get("ry", 25)
        lines.append(f'var ps{idx} = vg{idx}.addProperty("ADBE Vector Shape - Ellipse");')
        lines.append(f'ps{idx}.property("ADBE Vector Ellipse Size").setValue([{rx * 2}, {ry * 2}]);')
    
    elif elem_type == "line":
        x1 = elem.get("x1", 0)
        y1 = elem.get("y1", 0)
        x2 = elem.get("x2", 100)
        y2 = elem.get("y2", 0)
        lines.append(f'var ps{idx} = vg{idx}.addProperty("ADBE Vector Shape - Group");')
        lines.append(f'var s{idx} = new Shape();')
        lines.append(f's{idx}.vertices = [[{x1}, {y1}], [{x2}, {y2}]];')
        lines.append(f's{idx}.inTangents = [[0, 0], [0, 0]];')
        lines.append(f's{idx}.outTangents = [[0, 0], [0, 0]];')
        lines.append(f's{idx}.closed = false;')
        lines.append(f'ps{idx}.property("ADBE Vector Shape").setValue(s{idx});')
    
    elif elem_type == "circle":
        r = elem.get("r", 25)
        lines.append(f'var ps{idx} = vg{idx}.addProperty("ADBE Vector Shape - Ellipse");')
        lines.append(f'ps{idx}.property("ADBE Vector Ellipse Size").setValue([{r * 2}, {r * 2}]);')
    
    # Fill
    fill = elem.get("fill")
    fill_rgb = "[0.5, 0.5, 0.5]" # default
    gradient_data = None
    if fill and fill != 'none':
        if fill.startswith("url(#"):
            grad_id = fill[5:-1]
            gradient_data = _resolve_gradient(svg_elements, grad_id)
            if gradient_data:
                fill = gradient_data.get("startColor") or "#ffffff"
                
        fill_rgb = hex_to_rgb_array(fill)
        lines.append(f'var f{idx} = vg{idx}.addProperty("ADBE Vector Graphic - Fill");')
        lines.append(f'f{idx}.property("ADBE Vector Fill Color").setValue({fill_rgb});')
    
    # Stroke
    stroke = elem.get("stroke")
    stroke_rgb = None
    if stroke and stroke != 'none':
        stroke_rgb = hex_to_rgb_array(stroke)
        sw = elem.get("strokeWidth", 1.0)
        lines.append(f'var st{idx} = vg{idx}.addProperty("ADBE Vector Graphic - Stroke");')
        lines.append(f'st{idx}.property("ADBE Vector Stroke Color").setValue({stroke_rgb});')
        lines.append(f'st{idx}.property("ADBE Vector Stroke Width").setValue({sw});')
        
        # Trim paths for lines
        if elem_type == "line":
            lines.append(f'var trim{idx} = vg{idx}.addProperty("ADBE Vector Filter - Trim");')
            lines.append(f'trim{idx}.property("ADBE Vector Trim Start").setValue(0);')
            lines.append(f'trim{idx}.property("ADBE Vector Trim End").setValue(100);')
    
    # If no fill and no stroke, add a default fill
    if not fill and not stroke:
        lines.append(f'var f{idx} = vg{idx}.addProperty("ADBE Vector Graphic - Fill");')
        lines.append(f'f{idx}.property("ADBE Vector Fill Color").setValue([0.5, 0.5, 0.5]);')
    
    # Position
    offset_x = elem.get("offsetX", 0)
    offset_y = elem.get("offsetY", 0)
    cx = elem.get("cx", 0)
    cy = elem.get("cy", 0)
    
    if is_group_child:
        final_px = position[0] + offset_x + cx
        final_py = position[1] + offset_y + cy
    else:
        # Standalone elements are already in global coordinate space
        if elem_type in ("path", "polygon", "polyline"):
            final_px = cx + offset_x
            final_py = cy + offset_y
        else:
            final_px = position[0] + offset_x + cx
            final_py = position[1] + offset_y + cy
            
    lines.append(f'{var}.property("ADBE Transform Group").property("ADBE Position").setValue([{final_px}, {final_py}]);')
    
    # Add Gradient Fill Effect if applicable
    if gradient_data:
        start_rgb = hex_to_rgb_array(gradient_data.get("startColor", "#ffffff"))
        end_rgb = hex_to_rgb_array(gradient_data.get("endColor", "#ffffff"))
        is_radial = 2 if gradient_data.get("type") == "radialGradient" else 1
        
        lines.append(f'var ramp{idx} = {var}.property("ADBE Effect Parade").addProperty("ADBE Ramp");')
        lines.append(f'ramp{idx}.property(1).setValue([{final_px}, {final_py}]); // Start Point (center)')
        lines.append(f'ramp{idx}.property(2).setValue({start_rgb}); // Start Color')
        lines.append(f'ramp{idx}.property(3).setValue([{final_px}, {final_py + 200}]); // End Point (radius border)')
        lines.append(f'ramp{idx}.property(4).setValue({end_rgb}); // End Color')
        lines.append(f'ramp{idx}.property(5).setValue({is_radial}); // Ramp Shape (1=Linear, 2=Radial)')
        lines.append(f'ramp{idx}.property(7).setValue(0); // Blend with Original (0 = completely replace fill but keep alpha)')
    
    # Filters (Glow / Drop Shadow)
    filter_data = elem.get("filter")
    if filter_data:
        if filter_data.get("type") == "glow":
            # In SVG, feGaussianBlur + feMerge acts like a colored drop shadow with 0 distance.
            # Using ADBE Glow blows out the core to white if threshold is low. Drop Shadow is much more accurate.
            glow_color = fill_rgb
            if (not fill or fill == 'none') and stroke_rgb:
                glow_color = stroke_rgb
            lines.append(f'var glow{idx} = {var}.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");')
            lines.append(f'glow{idx}.property(1).setValue({glow_color}); // Color (inherits fill/stroke)')
            lines.append(f'glow{idx}.property(2).setValue(100); // Opacity')
            lines.append(f'glow{idx}.property(4).setValue(0); // Distance')
            lines.append(f'glow{idx}.property(5).setValue({filter_data.get("stdDeviation", 8) * 5}); // Softness')
        elif filter_data.get("type") == "dropShadow":
            lines.append(f'var ds{idx} = {var}.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");')
            lines.append(f'ds{idx}.property(2).setValue({filter_data.get("opacity", 0.5) * 100}); // Opacity')
            lines.append(f'ds{idx}.property(5).setValue({filter_data.get("stdDeviation", 4) * 5}); // Softness')
            if "color" in filter_data:
                rgb = hex_to_rgb_array(filter_data["color"])
                lines.append(f'ds{idx}.property(1).setValue({rgb}); // Color')
    
    lines.append('')
    return '\n'.join(lines)


def _generate_ellipse_layer(var: str, name: str, size: list, position: list, fill_color: str, add_glow: bool = False, stroke_only: bool = False) -> str:
    """Generate code for a circle/ellipse layer."""
    from app.services.ae_export import hex_to_rgb_array
    
    idx = var[2:]
    rgb = hex_to_rgb_array(fill_color) if fill_color else "[0.639, 0.875, 0.969]"
    
    lines = [f'// --- {name} ---']
    lines.append(f'var {var} = comp.layers.addShape(); {var}.name = "{name}";')
    lines.append(f'var g{idx} = {var}.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");')
    lines.append(f'var vg{idx} = g{idx}.property("ADBE Vectors Group");')
    lines.append(f'var ps{idx} = vg{idx}.addProperty("ADBE Vector Shape - Ellipse");')
    lines.append(f'ps{idx}.property("ADBE Vector Ellipse Size").setValue([{size[0]}, {size[1]}]);')
    
    if stroke_only:
        lines.append(f'var st{idx} = vg{idx}.addProperty("ADBE Vector Graphic - Stroke");')
        lines.append(f'st{idx}.property("ADBE Vector Stroke Color").setValue({rgb});')
        lines.append(f'st{idx}.property("ADBE Vector Stroke Width").setValue(4.0);')
    else:
        lines.append(f'var f{idx} = vg{idx}.addProperty("ADBE Vector Graphic - Fill");')
        lines.append(f'f{idx}.property("ADBE Vector Fill Color").setValue({rgb});')
        
    lines.append(f'{var}.property("ADBE Transform Group").property("ADBE Position").setValue([{position[0]}, {position[1]}]);')
    
    if add_glow:
        lines.append(f'var glow{idx} = {var}.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");')
        lines.append(f'glow{idx}.property(1).setValue([0.4, 0.9, 0.6]); // Color')
        lines.append(f'glow{idx}.property(2).setValue(100); // Opacity')
        lines.append(f'glow{idx}.property(4).setValue(0); // Distance')
        lines.append(f'glow{idx}.property(5).setValue(20); // Softness')
    
    lines.append('')
    return '\n'.join(lines)


def _generate_text_layer(text: str, text_color: str, position: list, width: int, height: int) -> str:
    """Generate code for the text layer with proper font and paragraph wrapping."""
    from app.services.ae_export import hex_to_rgb_array
    
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


# =============================================================================
# ANIMATION GENERATORS
# =============================================================================

def _generate_animations(var: str, name: str, anim_data: dict, fps: int) -> str:
    """Generate setValueAtTime calls for a layer from enriched data."""
    lines = [f'// Animations for {name}']
    has_any = False
    
    # Position Y animation
    pos_y_anim = anim_data.get("positionY")
    base_pos = anim_data.get("basePosition", [540, 960])
    is_text = anim_data.get("isText", False)
    
    if pos_y_anim:
        base_x = base_pos[0]
        offset_x = anim_data.get("shape", {}).get("offsetX", 0)
        offset_y = anim_data.get("shape", {}).get("offsetY", 0)
        cx = anim_data.get("shape", {}).get("cx", 0)
        cy = anim_data.get("shape", {}).get("cy", 0)
        
        base_x += (offset_x + cx)
        
        lines.append(f'var {var}Pos = {var}.property("ADBE Transform Group").property("ADBE Position");')
        for kf in pos_y_anim["keyframes"]:
            y_val = kf["value"]
            # If text and values are small offsets (< 200), add base Y position
            if is_text and abs(y_val) < 200:
                y_val = base_pos[1] + y_val
            
            if not is_text:
                y_val += (offset_y + cy)
                
            lines.append(f'{var}Pos.setValueAtTime({kf["time"]}, [{base_x}, {y_val}]);')
        has_any = True
    
    # Opacity animation
    opacity_anim = anim_data.get("opacity")
    if opacity_anim:
        lines.append(f'var {var}Opac = {var}.property("ADBE Transform Group").property("ADBE Opacity");')
        for kf in opacity_anim["keyframes"]:
            # Convert 0-1 to 0-100 for AE
            val = kf["value"]
            if val <= 1.0 and opacity_anim.get("maxValue", 1) <= 1.0:
                val = val * 100
            lines.append(f'{var}Opac.setValueAtTime({kf["time"]}, {round(val, 1)});')
        has_any = True
    
    # Scale animation (from spring or direct)
    scale_anim = anim_data.get("scale")
    if scale_anim:
        lines.append(f'var {var}Scale = {var}.property("ADBE Transform Group").property("ADBE Scale");')
        for kf in scale_anim["keyframes"]:
            val = kf["value"]
            # Spring values are 0-1.2 range -> convert to 0-120%
            if scale_anim.get("type") == "spring" or (isinstance(val, (int, float)) and val <= 2.0):
                pct = round(val * 100)
            else:
                pct = round(val)
            lines.append(f'{var}Scale.setValueAtTime({kf["time"]}, [{pct}, {pct}]);')
        has_any = True
    
    # Scale from animated radius (ripple effect)
    radius_anim = anim_data.get("scale_from_radius")
    if radius_anim:
        max_r = anim_data.get("maxRadius", 100)
        lines.append(f'var {var}Scale = {var}.property("ADBE Transform Group").property("ADBE Scale");')
        for kf in radius_anim["keyframes"]:
            # Convert radius to scale percentage: (current_r / max_r) * 100
            pct = round((kf["value"] / max_r) * 100) if max_r > 0 else 0
            lines.append(f'{var}Scale.setValueAtTime({kf["time"]}, [{pct}, {pct}]);')
        has_any = True
    
    # Per-element animations (particles)
    per_anims = anim_data.get("perElementAnimations", {})
    if per_anims:
        for anim_key, keyframes in per_anims.items():
            prop_type = anim_key.replace("anim_", "")
            
            if prop_type == "positionY" and keyframes:
                base_x = anim_data.get("basePosition", [540, 960])[0]
                lines.append(f'var {var}Pos = {var}.property("ADBE Transform Group").property("ADBE Position");')
                for kf in keyframes:
                    lines.append(f'{var}Pos.setValueAtTime({kf["time"]}, [{base_x}, {kf["value"]}]);')
                has_any = True
            
            elif prop_type == "opacity" and keyframes:
                lines.append(f'var {var}Opac = {var}.property("ADBE Transform Group").property("ADBE Opacity");')
                for kf in keyframes:
                    val = kf["value"]
                    if val <= 1.0:
                        val = val * 100
                    lines.append(f'{var}Opac.setValueAtTime({kf["time"]}, {round(val, 1)});')
                has_any = True
    
    # Text-specific animations
    if anim_data.get("isText"):
        # These are already handled by the generic positionY/opacity/scale above
        pass
    
    if not has_any:
        return ''
    
    lines.append('')
    return '\n'.join(lines)


# =============================================================================
# HELPERS
# =============================================================================

def _resolve_gradient(svg_elements: list, grad_id: str) -> dict:
    for elem in svg_elements:
        if elem.get("id") == grad_id and elem.get("type") in ["linearGradient", "radialGradient"]:
            return elem
    return None


def _find_shapes_in_block(children_block: str, svg_elements: list) -> list:
    """Find SVG elements whose geometry matches content within a group block."""
    if not children_block or not svg_elements:
        return []
    
    matched = []
    block_lower = children_block.lower()
    
    # 1. Identify which tag types are present in children_block
    tags_in_block = []
    import re
    for tag in ["path", "circle", "rect", "ellipse", "line", "polygon", "polyline"]:
        if re.search(r'<\s*' + tag + r'\b', children_block):
            tags_in_block.append(tag)
            
    for elem in svg_elements:
        elem_type = elem.get("type")
        if elem_type in ("glow", "dropShadow", "gradient", "linearGradient", "radialGradient"):
            continue
            
        if elem_type not in tags_in_block:
            continue
            
        # Match by fill/stroke color if present (including gradient URLs)
        fill = elem.get("fill")
        stroke = elem.get("stroke")
        if fill and fill.lower() in block_lower:
            matched.append(elem)
            continue
        if stroke and stroke.lower() in block_lower:
            matched.append(elem)
            continue
            
        # Match by geometry coordinates
        if elem_type == "path" and "vertices" in elem:
            vertices = elem["vertices"]
            if vertices:
                # Check if coordinates appear as non-zero numbers in children_block
                match_count = 0
                for v in vertices[:3]:
                    val_x = int(abs(v[0]))
                    val_y = int(abs(v[1]))
                    if val_x != 0 and re.search(r'\b' + str(val_x) + r'\b', children_block):
                        match_count += 1
                    if val_y != 0 and re.search(r'\b' + str(val_y) + r'\b', children_block):
                        match_count += 1
                if match_count >= 1:
                    matched.append(elem)
                    continue
        
        elif elem_type == "rect":
            x = int(abs(elem.get("x", 0)))
            y = int(abs(elem.get("y", 0)))
            w = int(elem.get("width", 0))
            h = int(elem.get("height", 0))
            if (x != 0 and re.search(r'\b' + str(x) + r'\b', children_block)) or \
               (y != 0 and re.search(r'\b' + str(y) + r'\b', children_block)) or \
               (w != 0 and re.search(r'\b' + str(w) + r'\b', children_block)) or \
               (h != 0 and re.search(r'\b' + str(h) + r'\b', children_block)):
                matched.append(elem)
                continue
                
        elif elem_type == "ellipse":
            cx = int(abs(elem.get("cx", 0)))
            cy = int(abs(elem.get("cy", 0)))
            rx = int(elem.get("rx", 0))
            ry = int(elem.get("ry", 0))
            if (cx != 0 and re.search(r'\b' + str(cx) + r'\b', children_block)) or \
               (cy != 0 and re.search(r'\b' + str(cy) + r'\b', children_block)) or \
               (rx != 0 and re.search(r'\b' + str(rx) + r'\b', children_block)) or \
               (ry != 0 and re.search(r'\b' + str(ry) + r'\b', children_block)):
                matched.append(elem)
                continue
                
        elif elem_type == "line":
            x1 = int(abs(elem.get("x1", 0)))
            y1 = int(abs(elem.get("y1", 0)))
            x2 = int(abs(elem.get("x2", 0)))
            y2 = int(abs(elem.get("y2", 0)))
            if (x1 != 0 and re.search(r'\b' + str(x1) + r'\b', children_block)) or \
               (y1 != 0 and re.search(r'\b' + str(y1) + r'\b', children_block)) or \
               (x2 != 0 and re.search(r'\b' + str(x2) + r'\b', children_block)) or \
               (y2 != 0 and re.search(r'\b' + str(y2) + r'\b', children_block)):
                matched.append(elem)
                continue

    return matched


def _find_circle_color(svg_elements: list, position: list) -> str:
    """Find the fill color of a circle near the given position."""
    for elem in svg_elements:
        if elem.get("type") == "circle" and elem.get("fill"):
            return elem["fill"]
    return "#a2dff7"


def _calc_center(elem: dict, width: int, height: int) -> list:
    """Calculate center position of an SVG element."""
    elem_type = elem.get("type", "path")
    
    if elem_type in ("circle", "ellipse"):
        return [elem.get("cx", width // 2), elem.get("cy", height // 2)]
    elif elem_type == "rect":
        x = elem.get("x", 0)
        y = elem.get("y", 0)
        w = elem.get("width", 100)
        h = elem.get("height", 100)
        return [x + w / 2, y + h / 2]
    elif elem_type == "line":
        x1, y1 = elem.get("x1", 0), elem.get("y1", 0)
        x2, y2 = elem.get("x2", 100), elem.get("y2", 0)
        return [(x1 + x2) / 2, (y1 + y2) / 2]
    elif "vertices" in elem:
        vertices = elem["vertices"]
        if vertices:
            avg_x = sum(v[0] for v in vertices) / len(vertices)
            avg_y = sum(v[1] for v in vertices) / len(vertices)
            return [round(avg_x, 1), round(avg_y, 1)]
    
    return [width // 2, height // 2]


def _generate_layer_name(elem: dict, idx: int) -> str:
    """Generate a descriptive layer name."""
    elem_type = elem.get("type", "Shape")
    type_map = {
        "path": "Path",
        "circle": "Circle",
        "rect": "Rect",
        "line": "Line",
        "ellipse": "Ellipse",
        "polygon": "Polygon",
        "polyline": "Polyline",
    }
    return f"{type_map.get(elem_type, 'Shape')}_{idx}"


def _format_points(points: list) -> str:
    """Format a list of [x, y] points for ExtendScript."""
    formatted = []
    for p in points:
        if len(p) >= 2:
            formatted.append(f"[{p[0]}, {p[1]}]")
        else:
            formatted.append("[0, 0]")
    return "[" + ", ".join(formatted) + "]"
