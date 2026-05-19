"""TSX transform extractors."""
import re
from typing import List, Dict, Any, Optional


def _extract_group_transforms(tsx_code: str) -> List[Dict[str, Any]]:
    """Extract <g transform=...> with variable references resolved to animation data."""
    groups = []

    # Pattern: <g transform={`translate(${X}, ${Y}) scale(${S})`} style={{ opacity: O }}>
    pattern = r'<g\s+[^>]*transform=\{`([^`]+)`\}[^>]*(?:style=\{\{([^}]*)\}\})?[^>]*>'

    for match in re.finditer(pattern, tsx_code, re.DOTALL):
        transform_expr = match.group(1)
        style_str = match.group(2) or ''

        group = {"transformExpression": transform_expr}

        # Extract translate variables
        tr_match = re.search(r'translate\(\$\{(\w+)\},\s*\$\{(\w+)\}\)', transform_expr)
        if tr_match:
            group["translateX_var"] = tr_match.group(1)
            group["translateY_var"] = tr_match.group(2)
            # Resolve static value if it's a number
            group["translateX"] = _try_resolve_static(tsx_code, tr_match.group(1))
            group["translateY"] = _try_resolve_static(tsx_code, tr_match.group(2))

        # Extract scale variable
        sc_match = re.search(r'scale\(\$\{(\w+)\}\)', transform_expr)
        if sc_match:
            group["scale_var"] = sc_match.group(1)

        # Extract opacity variable
        op_match = re.search(r'opacity:\s*(\w+)', style_str)
        if op_match:
            group["opacity_var"] = op_match.group(1)

        # Find children elements inside this <g>
        g_start = match.end()
        g_end = tsx_code.find('</g>', g_start)
        if g_end > g_start:
            group["children_block"] = tsx_code[g_start:g_end]

        groups.append(group)

    return groups


def _try_resolve_static(tsx_code: str, var_name: str) -> Optional[float]:
    """Try to resolve a variable to a static number (e.g., const x = 540)."""
    if var_name.isdigit():
        return float(var_name)
    # Check if it's a literal number in the template
    try:
        return float(var_name)
    except ValueError:
        pass
    # Look for const assignment
    pattern = rf'const\s+{re.escape(var_name)}\s*=\s*(\d+\.?\d*)\s*;'
    match = re.search(pattern, tsx_code)
    if match:
        return float(match.group(1))
    return None


def _parse_group_transforms(tsx_code: str) -> List[Dict[str, Any]]:
    """
    Extract <g transform="..."> elements and their associated styles.

    Handles patterns like:
    - <g transform={`translate(${540}, ${leafY}) scale(${leafScale})`} style={{ opacity: leafOpacity }}>
    """
    groups = []

    # Find <g> elements with transform
    pattern = r'<g\s+[^>]*transform=\{`([^`]+)`\}[^>]*style=\{\{([^}]+)\}\}[^>]*>'

    for match in re.finditer(pattern, tsx_code, re.DOTALL):
        transform_expr = match.group(1)
        style_str = match.group(2)

        # Parse translate
        translate_match = re.search(r'translate\(\$\{(\w+)\},\s*\$\{(\w+)\}\)', transform_expr)
        translate_x_var = translate_match.group(1) if translate_match else None
        translate_y_var = translate_match.group(2) if translate_match else None

        # Parse scale
        scale_match = re.search(r'scale\(\$\{(\w+)\}\)', transform_expr)
        scale_var = scale_match.group(1) if scale_match else None

        # Parse opacity from style
        opacity_match = re.search(r'opacity:\s*(\w+)', style_str)
        opacity_var = opacity_match.group(1) if opacity_match else None

        groups.append({
            "translateX": translate_x_var,
            "translateY": translate_y_var,
            "scale": scale_var,
            "opacity": opacity_var,
            "transformExpression": transform_expr
        })

    return groups
