"""
Shape layer generators for deterministic AE script generation.
"""
from typing import List

from .utils import hex_to_rgb_array, _resolve_gradient, _format_points


def _generate_shape_layer(var: str, name: str, elem: dict, position: list, width: int, height: int, svg_elements: list, is_group_child: bool = False) -> str:
    """Generate code for a shape layer (path, rect, line, ellipse, polygon)."""
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
