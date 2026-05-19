"""TSX animation extractors from enriched analyzer."""
import re
from typing import List, Dict, Any


def _extract_all_animations(tsx_code: str, fps: int) -> List[Dict[str, Any]]:
    """Extract ALL interpolate() and spring() calls, including those with variables."""
    animations = []

    # 1. Interpolate calls: supports both interpolate(frame, ...) and interpolate(frame - N, ...)
    pattern = r'const\s+(\w+)\s*=\s*interpolate\(\s*frame\s*(?:\s*-\s*(\d+))?\s*,\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]\s*(?:,\s*\{([^}]+)\})?\s*\)'
    for match in re.finditer(pattern, tsx_code, re.DOTALL):
        var_name = match.group(1)
        frame_offset = int(match.group(2)) if match.group(2) else 0
        input_str = match.group(3)
        output_str = match.group(4)

        try:
            input_frames = [float(x.strip()) + frame_offset for x in input_str.split(',')]
            output_values = [float(x.strip()) for x in output_str.split(',')]
        except ValueError:
            continue  # Has variables, handled separately by map expansion

        options_str = match.group(5) or ""

        anim_type = _classify_animation(var_name, output_values)
        input_seconds = [f / fps for f in input_frames]

        # Check for overshoot (Easing.back)
        if "Easing.back" in options_str and len(input_seconds) == 2:
            t0, t1 = input_seconds
            v0, v1 = output_values
            diff = v1 - v0

            # Create a 3-point bounce keyframe array
            t_overshoot = t0 + (t1 - t0) * 0.8
            v_overshoot = v1 + (diff * 0.15)  # 15% overshoot

            keyframes = [
                {"time": round(t0, 3), "value": v0},
                {"time": round(t_overshoot, 3), "value": v_overshoot},
                {"time": round(t1, 3), "value": v1}
            ]
        else:
            keyframes = [{"time": round(t, 3), "value": v} for t, v in zip(input_seconds, output_values)]

        animations.append({
            "variable": var_name,
            "type": anim_type,
            "keyframes": keyframes,
            "maxValue": max(output_values) if "Easing.back" not in options_str else max(output_values) + abs((output_values[-1] - output_values[0]) * 0.15),
            "minValue": min(output_values) if "Easing.back" not in options_str else min(output_values) - abs((output_values[-1] - output_values[0]) * 0.15),
            "frameOffset": frame_offset,
            "easing": "ease" if "Easing" in options_str else "linear"
        })

    # 2. Spring calls
    spring_pattern = r'const\s+(\w+)\s*=\s*spring\(\s*\{\s*(?:frame:\s*frame|frame)\s*(?:\s*-\s*(\d+))?\s*,\s*(?:fps:\s*fps|fps)\s*,\s*config:\s*\{\s*damping:\s*(\d+)\s*,\s*stiffness:\s*(\d+)\s*\}'
    for match in re.finditer(spring_pattern, tsx_code, re.DOTALL):
        var_name = match.group(1)
        offset = int(match.group(2)) if match.group(2) else 0
        damping = int(match.group(3))
        stiffness = int(match.group(4))

        t0 = offset / fps
        t1 = (offset + 5) / fps
        t2 = (offset + 15) / fps

        animations.append({
            "variable": var_name,
            "type": "spring",
            "keyframes": [
                {"time": round(t0, 3), "value": 0},
                {"time": round(t1, 3), "value": 1.2},
                {"time": round(t2, 3), "value": 1.0},
            ],
            "springConfig": {"damping": damping, "stiffness": stiffness},
            "maxValue": 1.2,
            "minValue": 0,
        })

    return animations


def _classify_animation(var_name: str, values: list) -> str:
    """Classify animation type from variable name."""
    name = var_name.lower()
    if 'opacity' in name or 'opac' in name:
        return 'opacity'
    elif 'scale' in name:
        return 'scale'
    elif 'y' in name and ('pos' in name or name.endswith('y')):
        return 'positionY'
    elif 'x' in name and ('pos' in name or name.endswith('x')):
        return 'positionX'
    elif 'rotat' in name:
        return 'rotation'
    elif any(v > 100 for v in values):
        return 'positionY'
    elif all(0 <= v <= 1 for v in values):
        return 'opacity'
    return 'unknown'
