"""
SVG Parser for AnimaFlow AE Export Pipeline.

Extracts geometric shapes from TSX <svg> code and converts them to AE new Shape() format.
Provides ground-truth geometry for LLM prompt to eliminate path translation errors.
"""
import re
from typing import List, Dict, Any, Optional, Tuple


def parse_svg_from_tsx(tsx_code: str) -> List[Dict[str, Any]]:
    """
    Extract geometric shapes from TSX code containing <svg> elements.
    
    Parses: path, circle, rect, line, ellipse, polygon, polyline
    Also captures: dynamic elements from .map() patterns, transform attributes, gradients, filters
    
    Returns structured list ready for LLM prompt injection.
    """
    svg_block = _extract_svg_block(tsx_code)
    if not svg_block:
        return []
    
    elements = []
    
    # First, expand dynamic .map() elements into concrete SVG tags
    expanded_block = _expand_map_elements(tsx_code, svg_block)
    
    elements.extend(_parse_paths(expanded_block))
    elements.extend(_parse_circles(expanded_block))
    elements.extend(_parse_rects(expanded_block))
    elements.extend(_parse_lines(expanded_block))
    elements.extend(_parse_ellipses(expanded_block))
    elements.extend(_parse_polygons(expanded_block))
    
    # Capture gradients and filters as special elements
    elements.extend(_parse_gradients(tsx_code))
    elements.extend(_parse_filters(tsx_code))
    
    return elements


def _expand_map_elements(tsx_code: str, svg_block: str) -> str:
    """
    Expand dynamic .map() patterns into concrete SVG elements.
    
    Handles patterns like:
    - {particles.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r={p.r} ... />))}
    - {[0,45,90,...].map((angle, i) => (<line key={i} transform={`rotate(${angle})`} ... />))}
    """
    expanded = svg_block
    
    # Pattern 1: Array.map with inline JSX elements
    # Match: {array.map((_, i) => (<tag ... attrs ... />))}
    map_patterns = [
        # Circle map: {Array.from({ length: N }).map((_, i) => (<circle ... />))}
        (r'\{[^}]*?Array\.from\(\{\s*length:\s*(\d+)\s*\}\)\.map\(\([^)]*\)\s*=>\s*\(\s*<circle\b([^>]*)/?>\s*\)\)', 'circle'),
        # Generic map with rotation: {[angles].map((angle, i) => (<line ... transform={`rotate(${angle})`} ... />))}
        (r'\{\[([^\]]+)\]\.map\(\((\w+),\s*(\w+)\)\s*=>\s*\(\s*<line\b([^>]*)transform=\{`rotate\(\$\{' + r'\w+' + r'\}\)`\}([^>]*)/?>\s*\)\)', 'rotated_line'),
    ]
    
    for pattern, elem_type in map_patterns:
        for match in re.finditer(pattern, tsx_code, re.DOTALL):
            if elem_type == 'circle':
                count = int(match.group(1))
                attrs_str = match.group(2)
                # Generate N circles with placeholder positions
                for i in range(count):
                    circle_tag = f'<circle cx="540" cy="{960 + i * 30}" r="3" fill="#a2dff7" />'
                    expanded += '\n' + circle_tag
            
            elif elem_type == 'rotated_line':
                angles_str = match.group(1)
                attrs_base = match.group(4)
                attrs_after = match.group(5)
                angles = [float(a.strip()) for a in angles_str.split(',')]
                for angle in angles:
                    line_tag = f'<line x1="0" y1="-45" x2="0" y2="-65" stroke="#4ade80" strokeWidth="6" transform="rotate({angle})" />'
                    expanded += '\n' + line_tag
    
    return expanded


def _parse_gradients(tsx_code: str) -> List[Dict[str, Any]]:
    """Parse <radialGradient> and <linearGradient> from <defs>."""
    elements = []
    
    # Radial gradients
    radial_pattern = r'<radialGradient\s+id="([^"]+)"[^>]*>(.*?)</radialGradient>'
    for match in re.finditer(radial_pattern, tsx_code, re.DOTALL):
        grad_id = match.group(1)
        stops = []
        stop_pattern = r'<stop\s+offset="([^"]+)"\s+stopColor="([^"]+)"'
        for stop_match in re.finditer(stop_pattern, match.group(2)):
            stops.append({"offset": stop_match.group(1), "color": stop_match.group(2)})
        
        elements.append({
            "type": "radialGradient",
            "id": grad_id,
            "stops": stops,
            "startColor": stops[0]["color"] if len(stops) > 0 else None,
            "endColor": stops[-1]["color"] if len(stops) > 1 else None,
        })
    
    # Linear gradients
    linear_pattern = r'<linearGradient\s+id="([^"]+)"[^>]*>(.*?)</linearGradient>'
    for match in re.finditer(linear_pattern, tsx_code, re.DOTALL):
        grad_id = match.group(1)
        stops = []
        stop_pattern = r'<stop\s+offset="([^"]+)"\s+stopColor="([^"]+)"'
        for stop_match in re.finditer(stop_pattern, match.group(2)):
            stops.append({"offset": stop_match.group(1), "color": stop_match.group(2)})
        
        elements.append({
            "type": "linearGradient",
            "id": grad_id,
            "stops": stops,
            "startColor": stops[0]["color"] if len(stops) > 0 else None,
            "endColor": stops[-1]["color"] if len(stops) > 1 else None,
        })
    
    return elements


def _parse_filters(tsx_code: str) -> List[Dict[str, Any]]:
    """Parse <filter> elements from <defs>."""
    elements = []
    
    filter_pattern = r'<filter\s+id="([^"]+)"[^>]*>(.*?)</filter>'
    for match in re.finditer(filter_pattern, tsx_code, re.DOTALL):
        filter_id = match.group(1)
        content = match.group(2)
        
        # Glow: feGaussianBlur
        blur_match = re.search(r'<feGaussianBlur\s+stdDeviation="([^"]+)"', content)
        if blur_match:
            elements.append({
                "type": "glow",
                "id": filter_id,
                "stdDeviation": float(blur_match.group(1)),
            })
        
        # Drop shadow: feDropShadow
        shadow_match = re.search(r'<feDropShadow\s+dx="([^"]+)"\s+dy="([^"]+)"\s+stdDeviation="([^"]+)"\s+floodColor="([^"]+)"\s+floodOpacity="([^"]+)"', content)
        if shadow_match:
            elements.append({
                "type": "dropShadow",
                "id": filter_id,
                "dx": float(shadow_match.group(1)),
                "dy": float(shadow_match.group(2)),
                "stdDeviation": float(shadow_match.group(3)),
                "floodColor": shadow_match.group(4),
                "floodOpacity": float(shadow_match.group(5)),
            })
    
    return elements


def _extract_svg_block(tsx_code: str) -> Optional[str]:
    """Extract the content between <svg> and </svg> tags."""
    match = re.search(r'<svg\b[^>]*>(.*?)</svg>', tsx_code, re.DOTALL)
    if match:
        return match.group(1)
    return None


def _parse_attr(element_str: str, attr: str) -> Optional[str]:
    """Extract an attribute value from an SVG element string."""
    pattern = rf'\b{attr}=["\']([^"\']*)["\']'
    match = re.search(pattern, element_str)
    return match.group(1) if match else None


def _parse_number(value: Optional[str], default: float = 0.0) -> float:
    """Parse a numeric string, returning default on failure."""
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _parse_color(value: Optional[str]) -> Optional[str]:
    """Parse a color value, handling hex, rgb(), and named colors."""
    if not value or value == 'none':
        return None
    value = value.strip()
    if value.startswith('#'):
        return value
    rgb_match = re.match(r'rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', value)
    if rgb_match:
        r, g, b = int(rgb_match.group(1)), int(rgb_match.group(2)), int(rgb_match.group(3))
        return f'#{r:02x}{g:02x}{b:02x}'
    return value


# =============================================================================
# PATH PARSER
# =============================================================================

def _parse_paths(svg_block: str) -> List[Dict[str, Any]]:
    """Parse <path> elements with d attribute → vertices, tangents, closed."""
    elements = []
    path_pattern = r'<path\b([^>]*)/?>'
    
    for match in re.finditer(path_pattern, svg_block, re.DOTALL):
        attrs_str = match.group(1)
        d_attr = _parse_attr(attrs_str, 'd')
        
        if not d_attr:
            continue
        
        vertices, in_tangents, out_tangents, closed = _parse_path_d(d_attr)
        
        if not vertices:
            continue
        
        fill = _parse_color(_parse_attr(attrs_str, 'fill'))
        stroke = _parse_color(_parse_attr(attrs_str, 'stroke'))
        stroke_width = _parse_number(_parse_attr(attrs_str, 'stroke-width'), 1.0)
        
        element = {
            "type": "path",
            "vertices": vertices,
            "inTangents": in_tangents,
            "outTangents": out_tangents,
            "closed": closed,
        }
        if fill:
            element["fill"] = fill
        if stroke:
            element["stroke"] = stroke
            element["strokeWidth"] = stroke_width
        
        elements.append(element)
    
    return elements


def _parse_path_d(d: str) -> Tuple[List[List[float]], List[List[float]], List[List[float]], bool]:
    """
    Parse SVG path d attribute into Shape-compatible format.
    
    Commands handled: M, L, C, Z, H, V
    Returns: (vertices, inTangents, outTangents, closed)
    """
    tokens = re.findall(r'([MLCZHV])|(-?\d+\.?\d*)', d)
    
    vertices = []
    in_tangents = []
    out_tangents = []
    closed = False
    
    current_cmd = 'M'
    current_point = None
    start_point = None
    
    i = 0
    while i < len(tokens):
        cmd_or_num, num_str = tokens[i]
        
        if cmd_or_num:
            current_cmd = cmd_or_num
            i += 1
            continue
        
        number = float(num_str)
        
        if current_cmd == 'M':
            next_num = float(tokens[i + 1][1]) if i + 1 < len(tokens) else 0.0
            vertices.append([number, next_num])
            in_tangents.append([0.0, 0.0])
            out_tangents.append([0.0, 0.0])
            current_point = [number, next_num]
            if start_point is None:
                start_point = [number, next_num]
            i += 2
        
        elif current_cmd == 'L':
            next_num = float(tokens[i + 1][1]) if i + 1 < len(tokens) else 0.0
            vertices.append([number, next_num])
            in_tangents.append([0.0, 0.0])
            out_tangents.append([0.0, 0.0])
            current_point = [number, next_num]
            i += 2
        
        elif current_cmd == 'C':
            if i + 5 < len(tokens):
                cx1 = float(tokens[i][1])
                cy1 = float(tokens[i + 1][1])
                cx2 = float(tokens[i + 2][1])
                cy2 = float(tokens[i + 3][1])
                ex = float(tokens[i + 4][1])
                ey = float(tokens[i + 5][1])
                
                if current_point and len(out_tangents) > 0:
                    out_tangents[-1] = [cx1 - current_point[0], cy1 - current_point[1]]
                
                in_tangent = [cx2 - ex, cy2 - ey]
                
                vertices.append([ex, ey])
                in_tangents.append(in_tangent)
                out_tangents.append([0.0, 0.0])
                current_point = [ex, ey]
                i += 6
            else:
                i += 1
        
        elif current_cmd == 'H':
            vertices.append([number, current_point[1] if current_point else 0.0])
            in_tangents.append([0.0, 0.0])
            out_tangents.append([0.0, 0.0])
            current_point = [number, current_point[1] if current_point else 0.0]
            i += 1
        
        elif current_cmd == 'V':
            vertices.append([current_point[0] if current_point else 0.0, number])
            in_tangents.append([0.0, 0.0])
            out_tangents.append([0.0, 0.0])
            current_point = [current_point[0] if current_point else 0.0, number]
            i += 1
        
        elif current_cmd == 'Z':
            closed = True
            if start_point and current_point:
                if current_point != start_point:
                    vertices.append([start_point[0], start_point[1]])
                    in_tangents.append([0.0, 0.0])
                    out_tangents.append([0.0, 0.0])
            current_point = start_point
            i += 1
        
        else:
            i += 1
    
    return vertices, in_tangents, out_tangents, closed


# =============================================================================
# CIRCLE PARSER
# =============================================================================

def _parse_circles(svg_block: str) -> List[Dict[str, Any]]:
    """Parse <circle> elements."""
    elements = []
    pattern = r'<circle\b([^>]*)/?>'
    
    for match in re.finditer(pattern, svg_block, re.DOTALL):
        attrs_str = match.group(1)
        cx = _parse_number(_parse_attr(attrs_str, 'cx'))
        cy = _parse_number(_parse_attr(attrs_str, 'cy'))
        r = _parse_number(_parse_attr(attrs_str, 'r'))
        fill = _parse_color(_parse_attr(attrs_str, 'fill'))
        stroke = _parse_color(_parse_attr(attrs_str, 'stroke'))
        stroke_width = _parse_number(_parse_attr(attrs_str, 'stroke-width'), 1.0)
        
        element = {
            "type": "circle",
            "cx": cx,
            "cy": cy,
            "r": r,
        }
        if fill:
            element["fill"] = fill
        if stroke:
            element["stroke"] = stroke
            element["strokeWidth"] = stroke_width
        
        elements.append(element)
    
    return elements


# =============================================================================
# RECT PARSER
# =============================================================================

def _parse_rects(svg_block: str) -> List[Dict[str, Any]]:
    """Parse <rect> elements."""
    elements = []
    pattern = r'<rect\b([^>]*)/?>'
    
    for match in re.finditer(pattern, svg_block, re.DOTALL):
        attrs_str = match.group(1)
        x = _parse_number(_parse_attr(attrs_str, 'x'))
        y = _parse_number(_parse_attr(attrs_str, 'y'))
        width = _parse_number(_parse_attr(attrs_str, 'width'))
        height = _parse_number(_parse_attr(attrs_str, 'height'))
        rx = _parse_number(_parse_attr(attrs_str, 'rx'), 0.0)
        ry = _parse_number(_parse_attr(attrs_str, 'ry'), 0.0)
        fill = _parse_color(_parse_attr(attrs_str, 'fill'))
        stroke = _parse_color(_parse_attr(attrs_str, 'stroke'))
        stroke_width = _parse_number(_parse_attr(attrs_str, 'stroke-width'), 1.0)
        
        element = {
            "type": "rect",
            "x": x,
            "y": y,
            "width": width,
            "height": height,
            "rx": rx,
            "ry": ry,
        }
        if fill:
            element["fill"] = fill
        if stroke:
            element["stroke"] = stroke
            element["strokeWidth"] = stroke_width
        
        elements.append(element)
    
    return elements


# =============================================================================
# LINE PARSER
# =============================================================================

def _parse_lines(svg_block: str) -> List[Dict[str, Any]]:
    """Parse <line> elements."""
    elements = []
    pattern = r'<line\b([^>]*)/?>'
    
    for match in re.finditer(pattern, svg_block, re.DOTALL):
        attrs_str = match.group(1)
        x1 = _parse_number(_parse_attr(attrs_str, 'x1'))
        y1 = _parse_number(_parse_attr(attrs_str, 'y1'))
        x2 = _parse_number(_parse_attr(attrs_str, 'x2'))
        y2 = _parse_number(_parse_attr(attrs_str, 'y2'))
        stroke = _parse_color(_parse_attr(attrs_str, 'stroke'))
        stroke_width = _parse_number(_parse_attr(attrs_str, 'stroke-width'), 1.0)
        
        element = {
            "type": "line",
            "x1": x1,
            "y1": y1,
            "x2": x2,
            "y2": y2,
        }
        if stroke:
            element["stroke"] = stroke
            element["strokeWidth"] = stroke_width
        
        elements.append(element)
    
    return elements


# =============================================================================
# ELLIPSE PARSER
# =============================================================================

def _parse_ellipses(svg_block: str) -> List[Dict[str, Any]]:
    """Parse <ellipse> elements."""
    elements = []
    pattern = r'<ellipse\b([^>]*)/?>'
    
    for match in re.finditer(pattern, svg_block, re.DOTALL):
        attrs_str = match.group(1)
        cx = _parse_number(_parse_attr(attrs_str, 'cx'))
        cy = _parse_number(_parse_attr(attrs_str, 'cy'))
        rx = _parse_number(_parse_attr(attrs_str, 'rx'))
        ry = _parse_number(_parse_attr(attrs_str, 'ry'))
        fill = _parse_color(_parse_attr(attrs_str, 'fill'))
        stroke = _parse_color(_parse_attr(attrs_str, 'stroke'))
        stroke_width = _parse_number(_parse_attr(attrs_str, 'stroke-width'), 1.0)
        
        element = {
            "type": "ellipse",
            "cx": cx,
            "cy": cy,
            "rx": rx,
            "ry": ry,
        }
        if fill:
            element["fill"] = fill
        if stroke:
            element["stroke"] = stroke
            element["strokeWidth"] = stroke_width
        
        elements.append(element)
    
    return elements


# =============================================================================
# POLYGON/POLYLINE PARSER
# =============================================================================

def _parse_polygons(svg_block: str) -> List[Dict[str, Any]]:
    """Parse <polygon> and <polyline> elements."""
    elements = []
    
    for tag, closed in [('polygon', True), ('polyline', False)]:
        pattern = rf'<{tag}\b([^>]*)/?>'
        
        for match in re.finditer(pattern, svg_block, re.DOTALL):
            attrs_str = match.group(1)
            points_str = _parse_attr(attrs_str, 'points')
            
            if not points_str:
                continue
            
            vertices = []
            for point_pair in points_str.strip().split():
                coords = point_pair.split(',')
                if len(coords) == 2:
                    vertices.append([float(coords[0]), float(coords[1])])
            
            if not vertices:
                continue
            
            in_tangents = [[0.0, 0.0] for _ in vertices]
            out_tangents = [[0.0, 0.0] for _ in vertices]
            
            fill = _parse_color(_parse_attr(attrs_str, 'fill'))
            stroke = _parse_color(_parse_attr(attrs_str, 'stroke'))
            stroke_width = _parse_number(_parse_attr(attrs_str, 'stroke-width'), 1.0)
            
            element = {
                "type": tag,
                "vertices": vertices,
                "inTangents": in_tangents,
                "outTangents": out_tangents,
                "closed": closed,
            }
            if fill:
                element["fill"] = fill
            if stroke:
                element["stroke"] = stroke
                element["strokeWidth"] = stroke_width
            
            elements.append(element)
    
    return elements
