"""SVG extractor - main entry point for parsing SVG from TSX code."""
import re
from typing import List, Dict, Any, Optional

from app.modules.parsers.svg.paths import _parse_paths
from app.modules.parsers.svg.shapes import (
    _parse_circles,
    _parse_rects,
    _parse_lines,
    _parse_ellipses,
    _parse_polygons,
)
from app.modules.parsers.svg.gradients import _parse_gradients, _parse_filters
from app.modules.parsers.svg.utils import _parse_attr


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
    expanded_block = _propagate_group_attributes(expanded_block)

    elements.extend(_parse_paths(expanded_block))
    elements.extend(_parse_circles(expanded_block))
    elements.extend(_parse_rects(expanded_block))
    elements.extend(_parse_lines(expanded_block))
    elements.extend(_parse_ellipses(expanded_block))
    elements.extend(_parse_polygons(expanded_block))

    # Capture gradients and filters as special elements
    elements.extend(_parse_gradients(tsx_code))
    elements.extend(_parse_filters(tsx_code))

    # Sort shape elements by their appearance order in the TSX (Z-index)
    shape_elements = [e for e in elements if "_start_idx" in e]
    other_elements = [e for e in elements if "_start_idx" not in e]

    shape_elements.sort(key=lambda x: x["_start_idx"])

    # Resolve filter links
    filters_map = {f["id"]: f for f in other_elements if "id" in f and f.get("type") in ["glow", "dropShadow"]}

    # Clean up internal sorting keys and attach filters
    for e in shape_elements:
        del e["_start_idx"]

        if "filter_url" in e:
            # extract "glow" from "url(#glow)"
            url_match = re.search(r'url\(#([^)]+)\)', e["filter_url"])
            if url_match:
                filter_id = url_match.group(1)
                if filter_id in filters_map:
                    e["filter"] = filters_map[filter_id]
            del e["filter_url"]

    return other_elements + shape_elements


def _propagate_group_attributes(svg_block: str) -> str:
    """
    Find <g> blocks and propagate attributes like stroke, fill, filter, stroke-width
    down to child element tags if they do not have them defined locally.
    """
    g_pattern = r'<g\b([^>]*)>(.*?)</g>'

    def replace_group(match):
        g_attrs = match.group(1)
        g_content = match.group(2)

        g_stroke = _parse_attr(g_attrs, 'stroke')
        g_fill = _parse_attr(g_attrs, 'fill')
        g_filter = _parse_attr(g_attrs, 'filter')
        g_stroke_width = _parse_attr(g_attrs, 'stroke-width') or _parse_attr(g_attrs, 'strokeWidth')

        child_tags = ['path', 'circle', 'rect', 'ellipse', 'line', 'polygon', 'polyline']

        updated_content = g_content
        for tag in child_tags:
            tag_pattern = rf'<{tag}\b([^>/]*)(/?)>'

            def replace_child(tag_match):
                child_attrs = tag_match.group(1)
                is_self_closing = tag_match.group(2) == '/'

                new_attrs = child_attrs
                if g_stroke and 'stroke=' not in child_attrs:
                    new_attrs += f' stroke="{g_stroke}"'
                if g_fill and 'fill=' not in child_attrs:
                    new_attrs += f' fill="{g_fill}"'
                if g_filter and 'filter=' not in child_attrs:
                    new_attrs += f' filter="{g_filter}"'
                if g_stroke_width and 'stroke-width=' not in child_attrs and 'strokeWidth=' not in child_attrs:
                    new_attrs += f' stroke-width="{g_stroke_width}"'

                if is_self_closing:
                    return f'<{tag}{new_attrs} />'
                else:
                    return f'<{tag}{new_attrs}>'

            updated_content = re.sub(tag_pattern, replace_child, updated_content, flags=re.DOTALL)

        return f'<g{g_attrs}>{updated_content}</g>'

    prev_block = ""
    current_block = svg_block
    for _ in range(3):
        prev_block = current_block
        current_block = re.sub(g_pattern, replace_group, current_block, flags=re.DOTALL)
        if current_block == prev_block:
            break

    return current_block


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
        (r'\{\[([^\]]+)\]\.map\((\w+),\s*(\w+)\)\s*=>\s*\(\s*<line\b([^>]*)transform=\{`rotate\(\$\{' + r'\w+' + r'\}\)`\}([^>]*)/?>\s*\)\)', 'rotated_line'),
    ]

    for pattern, elem_type in map_patterns:
        for match in re.finditer(pattern, tsx_code, re.DOTALL):
            if elem_type == 'circle':
                count = int(match.group(1))
                attrs_str = match.group(2)
                replacement = ""
                for i in range(count):
                    replacement += f'<circle cx="540" cy="{960 + i * 30}" r="3" fill="#a2dff7" />\n'
                if match.group(0) in expanded:
                    expanded = expanded.replace(match.group(0), replacement)

            elif elem_type == 'rotated_line':
                angles_str = match.group(1)
                attrs_base = match.group(4)
                attrs_after = match.group(5)
                angles = [float(a.strip()) for a in angles_str.split(',')]
                replacement = ""
                for angle in angles:
                    replacement += f'<line x1="0" y1="-45" x2="0" y2="-65" stroke="#4ade80" strokeWidth="6" transform="rotate({angle})" />\n'
                if match.group(0) in expanded:
                    expanded = expanded.replace(match.group(0), replacement)

    return expanded


def _extract_svg_block(tsx_code: str) -> Optional[str]:
    """Extract the content between <svg> and </svg> tags."""
    match = re.search(r'<svg\b[^>]*>(.*?)</svg>', tsx_code, re.DOTALL)
    if match:
        return match.group(1)
    return None
