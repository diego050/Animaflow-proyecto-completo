"""TSX element manifest builder."""
from typing import List, Dict, Any


def _build_element_manifest(tsx_code: str, analysis: Dict, width: int, height: int, fps: int) -> List[Dict[str, Any]]:
    """
    Build a complete element manifest with resolved positions/sizes.
    Each element has all the data needed for deterministic AE layer creation.
    """
    elements = []
    animations = analysis["animations"]
    groups = analysis["groups"]
    anim_by_var = {a["variable"]: a for a in animations}

    # Helper to find animation for a variable
    def get_anim(var_name):
        return anim_by_var.get(var_name)

    # 1. Process group-wrapped elements (like the leaf in <g transform=...>)
    for group in groups:
        tx_var = group.get("translateX_var")
        ty_var = group.get("translateY_var")
        sc_var = group.get("scale_var")
        op_var = group.get("opacity_var")

        # Resolve base position
        base_x = group.get("translateX") or width // 2
        base_y_anim = get_anim(ty_var) if ty_var else None
        base_y = base_y_anim["keyframes"][-1]["value"] if base_y_anim else (group.get("translateY") or height // 2)

        elements.append({
            "name": "GroupElement",
            "type": "group",
            "basePosition": [base_x, base_y],
            "positionY_animated": bool(base_y_anim),
            "positionY_var": ty_var,
            "scale_var": sc_var,
            "opacity_var": op_var,
            "animations": {
                "positionY": base_y_anim,
                "scale": get_anim(sc_var) if sc_var else None,
                "opacity": get_anim(op_var) if op_var else None,
            }
        })

    # 2. Process standalone circles (ripple, etc.)
    # Find circles NOT inside .map()
    import re
    circle_pattern = r'<circle\s+(?:(?!\.map).)*?cx="(\d+)"[^>]*cy="(\d+)"[^>]*r=\{([^}]+)\}'
    for match in re.finditer(circle_pattern, tsx_code, re.DOTALL):
        cx = int(match.group(1))
        cy = int(match.group(2))
        r_expr = match.group(3).strip()

        # Resolve r expression (e.g., Math.max(0, rippleScale))
        r_var = re.search(r'(\w+Scale|\w+Radius|\w+Size)', r_expr)
        if r_var:
            anim = get_anim(r_var.group(1))
            if anim:
                max_r = anim["maxValue"]
                elements.append({
                    "name": f"Circle_animated",
                    "type": "circle",
                    "position": [cx, cy],
                    "maxRadius": max_r,
                    "aeSize": [max_r * 2, max_r * 2],
                    "r_animated": True,
                    "r_var": r_var.group(1),
                    "animations": {"radius": anim},
                })

    # 3. Process standalone circles with static r
    static_circle = r'<circle\s+[^>]*cx="(\d+)"[^>]*cy="(\d+)"[^>]*r="(\d+\.?\d*)"'
    # (These are already handled by svg_parser, but we add position context)

    # 4. Process text block
    text_pattern = r'bottom:\s*[\'"](\d+)%[\'"]'
    text_match = re.search(text_pattern, tsx_code)
    if text_match:
        bottom_pct = int(text_match.group(1))
        text_y = int(height * (1 - bottom_pct / 100))
        elements.append({
            "name": "TextBlock",
            "type": "text",
            "position": [width // 2, text_y],
            "bottomPercent": bottom_pct,
        })

    # 5. Add map expansion elements
    for expansion in analysis["map_expansions"]:
        for elem in expansion["elements"]:
            elements.append({
                "name": f"Particle_{elem['index']}",
                "type": expansion["elementType"],
                "position": [elem["x"], elem["y"]],
                "size": elem["size"],
                "fillColor": expansion["fillColor"],
                "delaySeconds": elem["delaySeconds"],
                "perElementAnimations": {k: v for k, v in elem.items() if k.startswith("anim_")},
                "fromMapExpansion": True,
            })

    # 6. Process transform animations (rotation, scale via style transform)
    for transform in analysis.get("transform_animations", []):
        var_name = transform.get("variable")
        if var_name:
            anim = anim_by_var.get(var_name)
            if anim:
                elements.append({
                    "name": f"Transform_{transform['tag']}_{var_name}",
                    "type": transform["type"],
                    "variable": var_name,
                    "tag": transform["tag"],
                    "animations": {transform["type"]: anim},
                })

    # 7. Process trim paths
    for trim in analysis.get("trim_paths", []):
        elements.append({
            "name": f"TrimPath_{trim['tag']}",
            "type": "trim",
            "tag": trim["tag"],
            "trim_keyframes": trim["keyframes"],
            "length": trim.get("length"),
        })

    # 8. Process morphing
    for morph in analysis.get("morphing", []):
        elements.append({
            "name": f"Morph_{morph['variable']}",
            "type": "morph",
            "variable": morph["variable"],
            "pathVariables": morph.get("pathVariables", []),
            "keyframes": morph["keyframes"],
        })

    return elements
