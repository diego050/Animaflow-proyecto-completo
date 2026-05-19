"""TSX map expansion extractor."""
import random
import re
from typing import List, Dict, Any

from app.modules.parsers.tsx.animation_extractors import _classify_animation


def _extract_map_expansions(tsx_code: str, fps: int, width: int, height: int) -> List[Dict[str, Any]]:
    """
    Extract .map() patterns and resolve per-element data.
    Handles: Array.from({length: N}).map((_, i) => {...})
    """
    expansions = []

    # Find the array definition block
    # Pattern: const varName = Array.from({ length: N }).map((_, i) => { ... return {...}; });
    map_block_pattern = r'const\s+(\w+)\s*=\s*Array\.from\(\{\s*length:\s*(\d+)\s*\}\)\.map\(\((_,?\s*\w*),\s*(\w+)\)\s*=>\s*\{(.*?)\breturn\s*\{([^}]+)\}'

    for match in re.finditer(map_block_pattern, tsx_code, re.DOTALL):
        array_var = match.group(1)
        count = int(match.group(2))
        iter_var = match.group(4)
        body = match.group(5)
        return_obj = match.group(6)

        # Cap at 8 for AE performance
        actual_count = min(count, 8)

        # Extract delay pattern: const delay = i * N
        delay_pattern = rf'const\s+(\w+)\s*=\s*{re.escape(iter_var)}\s*\*\s*(\d+)'
        delay_match = re.search(delay_pattern, body)
        delay_var = delay_match.group(1) if delay_match else None
        delay_multiplier = int(delay_match.group(2)) if delay_match else 0

        # Extract size pattern: const size = N + Math.random() * M
        size_pattern = r'const\s+(\w+)\s*=\s*(\d+\.?\d*)\s*\+\s*Math\.random\(\)\s*\*\s*(\d+\.?\d*)'
        size_match = re.search(size_pattern, body)
        base_size = float(size_match.group(2)) if size_match else 3
        size_range = float(size_match.group(3)) if size_match else 0

        # Extract x offset: const xOffset = (Math.random() - 0.5) * N
        xoff_pattern = r'const\s+(\w+)\s*=\s*\(Math\.random\(\)\s*-\s*0\.5\)\s*\*\s*(\d+)'
        xoff_match = re.search(xoff_pattern, body)
        x_spread = int(xoff_match.group(2)) if xoff_match else 100

        # Extract interpolate calls inside map body (with delay variable)
        map_interpolates = []
        interp_pattern = r'const\s+(\w+)\s*=\s*interpolate\(\s*frame\s*,\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]'
        for ip_match in re.finditer(interp_pattern, body):
            ip_var = ip_match.group(1)
            ip_inputs = ip_match.group(2)
            ip_outputs = ip_match.group(3)

            # Try to resolve outputs (usually pure numbers)
            try:
                out_vals = [float(x.strip()) for x in ip_outputs.split(',')]
            except ValueError:
                out_vals = []

            # Check if inputs reference delay variable
            uses_delay = delay_var and delay_var in ip_inputs

            map_interpolates.append({
                "variable": ip_var,
                "type": _classify_animation(ip_var, out_vals),
                "inputExpression": ip_inputs,
                "outputValues": out_vals,
                "usesDelay": uses_delay,
            })

        # Find the SVG element this maps to
        svg_tag_pattern = rf'\{{{re.escape(array_var)}\.map\(\((\w+),\s*(\w+)\)\s*=>\s*\(\s*<(\w+)\b([^>]*)/?>'
        svg_match = re.search(svg_tag_pattern, tsx_code, re.DOTALL)
        element_type = svg_match.group(3) if svg_match else "circle"
        element_attrs = svg_match.group(4) if svg_match else ""

        # Extract fill color from the SVG element
        fill_match = re.search(r'fill="([^"]+)"', element_attrs)
        fill_color = fill_match.group(1) if fill_match else "#a2dff7"

        # Generate per-element computed data
        random.seed(42)  # Deterministic randomness

        elements = []
        for i in range(actual_count):
            delay_frames = i * delay_multiplier
            x_offset = (random.random() - 0.5) * x_spread
            size = base_size + random.random() * size_range

            elem = {
                "index": i,
                "x": round(width / 2 + x_offset),
                "y": height // 2,  # Will be animated
                "size": round(size, 1),
                "delayFrames": delay_frames,
                "delaySeconds": round(delay_frames / fps, 3),
            }

            # Resolve per-element keyframes
            for interp in map_interpolates:
                if interp["usesDelay"] and interp["outputValues"]:
                    # Resolve the input frames with this element's delay
                    resolved_inputs = []
                    for token in interp["inputExpression"].split(','):
                        token = token.strip()
                        if delay_var and delay_var in token:
                            expr = token.replace(delay_var, str(delay_frames))
                            try:
                                resolved_inputs.append(eval(expr))
                            except (SyntaxError, NameError, TypeError, ValueError):
                                # Fallback: use delay_frames if eval fails
                                resolved_inputs.append(delay_frames)
                        else:
                            try:
                                resolved_inputs.append(float(token))
                            except ValueError:
                                resolved_inputs.append(0)

                    kf = []
                    for t_frame, val in zip(resolved_inputs, interp["outputValues"]):
                        kf.append({"time": round(t_frame / fps, 3), "value": val})

                    elem[f"anim_{interp['type']}"] = kf

            elements.append(elem)

        expansions.append({
            "arrayVariable": array_var,
            "originalCount": count,
            "actualCount": actual_count,
            "elementType": element_type,
            "fillColor": fill_color,
            "delayMultiplier": delay_multiplier,
            "xSpread": x_spread,
            "baseSize": base_size,
            "sizeRange": size_range,
            "elements": elements,
            "interpolates": map_interpolates,
        })

    return expansions
