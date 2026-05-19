"""SVG path parsers."""
import re
from typing import List, Dict, Any, Tuple

from app.modules.parsers.svg.utils import _parse_attr, _parse_number, _parse_color


def _parse_paths(svg_block: str) -> List[Dict[str, Any]]:
    """Parse <path> elements with d attribute -> vertices, tangents, closed."""
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
        filter_url = _parse_attr(attrs_str, 'filter')

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
        if filter_url:
            element["filter_url"] = filter_url

        translate_match = re.search(r'translate\(\s*(-?\d+\.?\d*)[px]*\s*,\s*(-?\d+\.?\d*)[px]*\s*\)', attrs_str)
        if translate_match:
            element["offsetX"] = float(translate_match.group(1))
            element["offsetY"] = float(translate_match.group(2))

        element["_start_idx"] = match.start()

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
