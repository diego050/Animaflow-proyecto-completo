"""TSX Animation Parser for AnimaFlow AE Export Pipeline.

Extracts animation data from Remotion TSX components to provide the LLM with
exact timing, positioning, easing, and effect information for faithful AE reproduction.

This complements svg_parser.py which only extracts geometry.
"""
from typing import List, Dict, Any

from app.modules.parsers.tsx.transforms import _parse_group_transforms
from app.modules.parsers.tsx.effects import (
    _parse_text_animation,
    _parse_effects,
    _generate_timing_summary,
)
from app.modules.parsers.tsx.animation_utils import (
    _extract_easing,
    _classify_animation,
    _map_to_ae_property,
)


def parse_tsx_animations(tsx_code: str, duration_seconds: float = 6.0, fps: int = 30) -> Dict[str, Any]:
    """
    Main entry point: extracts all animation data from a TSX component.

    Returns a structured dict ready for LLM prompt injection.
    """
    result = {
        "animations": [],
        "text_animation": {},
        "effects": [],
        "groups": [],
        "timing_summary": {}
    }

    # Extract animation logic from interpolate() and spring() calls
    result["animations"] = _parse_interpolate_calls(tsx_code, fps)
    result["animations"].extend(_parse_spring_calls(tsx_code, fps))

    # Extract group transforms (translate, scale, rotate on <g> elements)
    result["groups"] = _parse_group_transforms(tsx_code)

    # Extract text animation details
    result["text_animation"] = _parse_text_animation(tsx_code, fps)

    # Extract visual effects (filters, gradients, shadows)
    result["effects"] = _parse_effects(tsx_code)

    # Generate timing summary
    result["timing_summary"] = _generate_timing_summary(result["animations"], duration_seconds)

    return result


def _parse_interpolate_calls(tsx_code: str, fps: int) -> List[Dict[str, Any]]:
    """
    Extract interpolate() calls and convert to AE-compatible keyframe data.

    Handles patterns like:
    - interpolate(frame, [0, 60], [1400, 960], { easing: ..., extrapolateRight: 'clamp' })
    - interpolate(frame, [30, 60, 90], [0, 0.3, 0], { ... })
    """
    animations = []

    # Find all interpolate calls
    pattern = r'const\s+(\w+)\s*=\s*interpolate\(\s*frame\s*,\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]\s*(?:,\s*\{([^}]+)\})?\s*\)'

    for match in re.finditer(pattern, tsx_code, re.DOTALL):
        var_name = match.group(1)

        # Skip if input frames contain variables (not pure numbers)
        input_str = match.group(2)
        output_str = match.group(3)

        # Check if all values are numeric
        try:
            input_frames = [float(x.strip()) for x in input_str.split(',')]
            output_values = [float(x.strip()) for x in output_str.split(',')]
        except ValueError:
            # Contains variables like 'delay', skip this one
            continue

        options_str = match.group(4) or ''

        # Parse easing
        easing = _extract_easing(options_str)

        # Convert frames to seconds
        input_seconds = [f / fps for f in input_frames]

        # Build keyframes
        keyframes = []
        for i in range(len(input_seconds)):
            keyframes.append({
                "time": round(input_seconds[i], 3),
                "value": output_values[i]
            })

        # Determine animation type based on variable name
        anim_type = _classify_animation(var_name, output_values)

        # Detect if values are offsets (small values < 200 for position types)
        is_offset = anim_type in ("positionY", "positionX") and all(abs(v) < 200 for v in output_values)

        # Detect if values are pixel values for scale (values > 100 for scale types)
        is_pixel_value = anim_type == "scale" and any(v > 100 for v in output_values)

        anim_entry = {
            "variable": var_name,
            "type": anim_type,
            "inputFrames": input_frames,
            "inputSeconds": input_seconds,
            "outputValues": output_values,
            "keyframes": keyframes,
            "easing": easing,
            "ae_property": _map_to_ae_property(var_name, anim_type),
            "isOffset": is_offset,
            "isPixelValue": is_pixel_value
        }

        if is_offset:
            anim_entry["ae_instruction"] = f"SUMA estos offsets a la posicion base. NO usar como posicion absoluta."
        if is_pixel_value:
            anim_entry["ae_instruction"] = f"Estos son pixeles, NO porcentajes. Convierte a scale %: (valor / tamano_base) * 100."

        animations.append(anim_entry)

    return animations


def _parse_spring_calls(tsx_code: str, fps: int) -> List[Dict[str, Any]]:
    """
    Extract spring() calls and convert to AE-compatible scale/position keyframes.

    Spring in Remotion creates a bounce effect. We approximate it with AE keyframes:
    - Frame 0: 0%
    - Frame ~3: 120% (overshoot)
    - Frame ~9: 100% (settle)
    """
    animations = []

    # Find spring calls with config
    pattern = r'const\s+(\w+)\s*=\s*spring\(\s*\{\s*frame:\s*frame\s*(?:\s*-\s*(\d+))?\s*,\s*fps\s*,\s*config:\s*\{\s*damping:\s*(\d+)\s*,\s*stiffness:\s*(\d+)\s*\}'

    for match in re.finditer(pattern, tsx_code, re.DOTALL):
        var_name = match.group(1)
        frame_offset = int(match.group(2)) if match.group(2) else 0
        damping = int(match.group(3))
        stiffness = int(match.group(4))

        # Approximate spring with 3 keyframes
        start_frame = frame_offset
        overshoot_frame = frame_offset + 3
        settle_frame = frame_offset + 9

        animations.append({
            "variable": var_name,
            "type": "spring",
            "inputFrames": [start_frame, overshoot_frame, settle_frame],
            "inputSeconds": [start_frame / fps, overshoot_frame / fps, settle_frame / fps],
            "outputValues": [0, 1.2, 1.0],
            "keyframes": [
                {"time": round(start_frame / fps, 3), "value": 0},
                {"time": round(overshoot_frame / fps, 3), "value": 1.2},
                {"time": round(settle_frame / fps, 3), "value": 1.0}
            ],
            "easing": "spring",
            "springConfig": {"damping": damping, "stiffness": stiffness},
            "ae_property": _map_to_ae_property(var_name, "spring")
        })

    return animations
