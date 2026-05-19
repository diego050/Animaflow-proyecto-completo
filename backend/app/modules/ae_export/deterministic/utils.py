"""
Utility helpers for deterministic AE script generation.
"""
import re
from typing import List, Dict


def hex_to_rgb_array(hex_color: str) -> str:
    """Convierte color HEX a array RGB normalizado [r, g, b] para AE."""
    if not hex_color:
        return "[0.5, 0.5, 0.5]"
        
    color = hex_color.lower().strip()
    if color == 'black': return "[0.000, 0.000, 0.000]"
    if color == 'white': return "[1.000, 1.000, 1.000]"
    if color == 'none' or color == 'transparent': return "[0.000, 0.000, 0.000]"
    
    hex_clean = color.lstrip('#').rstrip('}').strip()
    
    # Handle shorthand #000
    if len(hex_clean) == 3:
        hex_clean = hex_clean[0]*2 + hex_clean[1]*2 + hex_clean[2]*2
        
    if len(hex_clean) != 6:
        return "[0.500, 0.500, 0.500]"
        
    try:
        r = int(hex_clean[0:2], 16) / 255.0
        g = int(hex_clean[2:4], 16) / 255.0
        b = int(hex_clean[4:6], 16) / 255.0
        return f"[{r:.3f}, {g:.3f}, {b:.3f}]"
    except ValueError:
        return "[0.500, 0.500, 0.500]"


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


def _validate_ae_script(script: str) -> tuple:
    """
    Validate that the generated AE script has minimum viable structure.
    
    Returns:
        (is_valid: bool, errors: list[str])
    """
    errors = []
    
    # Check for composition creation
    if 'addComp(' not in script:
        errors.append("Missing composition creation (addComp)")
    
    # Check for at least one layer
    has_shape = 'addShape()' in script
    has_text = 'addText(' in script or 'addBoxText(' in script
    has_solid = 'addSolid(' in script
    
    if not has_shape and not has_text:
        errors.append("No shape or text layers found")
    
    # Check for at least one animation
    if 'setValueAtTime(' not in script:
        errors.append("No animations found (setValueAtTime)")
    
    # Check for common syntax errors
    # Empty property calls
    if re.search(r'\.property\(\s*\)', script):
        errors.append("Empty property() call detected")
    
    # Unclosed parentheses (basic check)
    open_parens = script.count('(')
    close_parens = script.count(')')
    if abs(open_parens - close_parens) > 2:
        errors.append(f"Unbalanced parentheses: {open_parens} open, {close_parens} close")
    
    # Check for undefined variables (basic)
    if re.search(r'\bundefined\b', script):
        errors.append("Contains 'undefined' literal")
    
    return len(errors) == 0, errors
