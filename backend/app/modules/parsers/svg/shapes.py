"""SVG shape parsers (circle, rect, line, ellipse, polygon, polyline)."""
import re
from typing import List, Dict, Any

from app.modules.parsers.svg.utils import _parse_attr, _parse_number, _parse_color


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
        filter_url = _parse_attr(attrs_str, 'filter')

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
        if filter_url:
            element["filter_url"] = filter_url

        element["_start_idx"] = match.start()

        elements.append(element)

    return elements


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

        element["_start_idx"] = match.start()

        elements.append(element)

    return elements


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

        element["_start_idx"] = match.start()

        elements.append(element)

    return elements


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

        element["_start_idx"] = match.start()

        elements.append(element)

    return elements


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

            element["_start_idx"] = match.start()

            elements.append(element)

    return elements
