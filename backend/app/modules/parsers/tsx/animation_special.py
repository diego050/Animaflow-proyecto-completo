"""Specialized TSX animation extractors (transforms, trim paths, morphing)."""
import re
from typing import List, Dict, Any


def _extract_transform_animations(tsx_code: str, fps: int) -> List[Dict[str, Any]]:
    """
    Detect transform animations in style={{ transform: ... }} on SVG elements.
    Handles: rotate(${var}deg), scale(${var}), translate(${x}px, ${y}px)
    """
    transforms = []

    # Pattern: style={{ transform: `rotate(${var}deg)` }} or style={{ transform: `scale(${var})` }}
    # Also handles: style={{ transform: `rotate(${var}deg) scale(${var2})` }}
    style_transform_pattern = r'<(\w+)\s+[^>]*style=\{\{[^}]*transform:\s*`([^`]+)`[^}]*\}\}[^>]*>'

    for match in re.finditer(style_transform_pattern, tsx_code, re.DOTALL):
        tag = match.group(1)
        transform_expr = match.group(2)

        # Extract rotate variable
        rot_match = re.search(r'rotate\(\$\{(\w+)\}deg\)', transform_expr)
        if rot_match:
            var_name = rot_match.group(1)
            transforms.append({
                "tag": tag,
                "type": "rotation",
                "variable": var_name,
                "expression": transform_expr,
            })

        # Extract scale variable (if not already captured by main animation extraction)
        scale_match = re.search(r'scale\(\$\{(\w+)\}\)', transform_expr)
        if scale_match:
            var_name = scale_match.group(1)
            # Only add if not already a known scale animation
            transforms.append({
                "tag": tag,
                "type": "scale_transform",
                "variable": var_name,
                "expression": transform_expr,
            })

        # Extract translate variables
        tr_match = re.search(r'translate\(\$\{(\w+)\}px,\s*\$\{(\w+)\}px\)', transform_expr)
        if tr_match:
            transforms.append({
                "tag": tag,
                "type": "translate",
                "x_var": tr_match.group(1),
                "y_var": tr_match.group(2),
                "expression": transform_expr,
            })

    # Also detect style={{ opacity: var }} patterns
    style_opacity_pattern = r'<(\w+)\s+[^>]*style=\{\{[^}]*opacity:\s*(\w+)[^}]*\}\}[^>]*>'
    for match in re.finditer(style_opacity_pattern, tsx_code, re.DOTALL):
        tag = match.group(1)
        var_name = match.group(2)
        transforms.append({
            "tag": tag,
            "type": "opacity_style",
            "variable": var_name,
        })

    return transforms


def _extract_trim_paths(tsx_code: str, fps: int) -> List[Dict[str, Any]]:
    """
    Detect Trim Paths animations via strokeDasharray/strokeDashoffset.
    Pattern: strokeDasharray={length} strokeDashoffset={interpolate(frame, [0, 60], [length, 0])}
    """
    trims = []

    # Find elements with strokeDashoffset animated via interpolate
    dashoffset_pattern = r'strokeDashoffset=\{([^}]+)\}'
    dasharray_pattern = r'strokeDasharray=\{([^}]+)\}'

    # Find the full SVG tag containing both
    svg_tag_pattern = r'<(path|line|polyline|polygon)\s+([^>]*?)>'

    for match in re.finditer(svg_tag_pattern, tsx_code, re.DOTALL):
        tag = match.group(1)
        attrs = match.group(2)

        dashoffset_match = re.search(dashoffset_pattern, attrs)
        dasharray_match = re.search(dasharray_pattern, attrs)

        if dashoffset_match:
            offset_expr = dashoffset_match.group(1)
            length_val = None

            # Try to extract length from dasharray
            if dasharray_match:
                length_expr = dasharray_match.group(1)
                try:
                    length_val = float(length_expr)
                except ValueError:
                    # It's a variable, try to resolve
                    var_match = re.search(r'(\w+)', length_expr)
                    if var_match:
                        # Look for const assignment
                        const_pattern = rf'const\s+{re.escape(var_match.group(1))}\s*=\s*(\d+\.?\d*)'
                        const_match = re.search(const_pattern, tsx_code)
                        if const_match:
                            length_val = float(const_match.group(1))

            # Extract interpolate from offset expression
            interp_match = re.search(r'interpolate\(\s*frame\s*,\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]', offset_expr)
            if interp_match:
                input_str = interp_match.group(1)
                output_str = interp_match.group(2)
                try:
                    input_frames = [float(x.strip()) for x in input_str.split(',')]
                    output_values = [float(x.strip()) for x in output_str.split(',')]
                    input_seconds = [f / fps for f in input_frames]

                    # Convert dashoffset to trim percentage: offset goes from length->0, trim goes 0->100
                    trim_keyframes = []
                    for t, offset in zip(input_seconds, output_values):
                        if length_val and length_val > 0:
                            trim_pct = round((1 - offset / length_val) * 100, 1)
                        else:
                            trim_pct = round(100 - offset, 1)
                        trim_keyframes.append({"time": round(t, 3), "value": trim_pct})

                    trims.append({
                        "tag": tag,
                        "type": "trim",
                        "keyframes": trim_keyframes,
                        "length": length_val,
                    })
                except ValueError:
                    pass

    return trims


def _extract_morphing(tsx_code: str, fps: int) -> List[Dict[str, Any]]:
    """
    Detect path morphing via interpolate() on the 'd' attribute.
    Pattern: d={interpolate(frame, [0, 30], [circlePath, squarePath])}
    """
    morphs = []

    # Find interpolate calls assigned to variables that are used in d={}
    # Pattern: const morphedPath = interpolate(frame, [start, end], [path1, path2])
    morph_pattern = r'const\s+(\w+)\s*=\s*interpolate\(\s*frame\s*,\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]'

    for match in re.finditer(morph_pattern, tsx_code, re.DOTALL):
        var_name = match.group(1)
        input_str = match.group(2)
        output_str = match.group(3)

        # Check if this variable is used in a d={} attribute
        if re.search(rf'd=\{{\s*{re.escape(var_name)}\s*\}}', tsx_code):
            try:
                input_frames = [float(x.strip()) for x in input_str.split(',')]
                input_seconds = [f / fps for f in input_frames]

                # Output values are path strings - we just need to track the variable
                path_vars = [x.strip() for x in output_str.split(',')]

                morphs.append({
                    "variable": var_name,
                    "type": "morph",
                    "keyframes": [{"time": t, "value": i} for i, t in enumerate(input_seconds)],
                    "pathVariables": path_vars,
                    "frameCount": len(path_vars),
                })
            except ValueError:
                pass

    return morphs
