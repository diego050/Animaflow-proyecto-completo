"""TSX effects and text animation parsers."""
import re
from typing import List, Dict, Any


def _parse_text_animation(tsx_code: str, fps: int) -> Dict[str, Any]:
    """
    Extract text animation details from the TSX.

    Finds:
    - Text position (bottom: '15%', left: '50%')
    - Transform (translateX, translateY, scale)
    - Opacity animation
    - Font size, weight, color, textShadow
    """
    text_info = {}

    # Find text container div
    text_container_pattern = r'<div\s+style=\{\{[^}]*position:\s*\'absolute\'[^}]*bottom:\s*\'([^\']+)\'[^}]*left:\s*\'([^\']+)\'[^}]*transform:\s*`([^`]+)`[^}]*opacity:\s*(\w+)[^}]*\}\}>'

    match = re.search(text_container_pattern, tsx_code, re.DOTALL)
    if match:
        text_info["position"] = {
            "bottom": match.group(1),
            "left": match.group(2),
            "transform": match.group(3),
            "opacityVar": match.group(4)
        }

    # Find text style (h1)
    text_style_pattern = r'<h1\s+style=\{\{\s*color:\s*\'([^\']+)\'\s*,\s*fontSize:\s*\'([^\']+)\'\s*,\s*fontWeight:\s*(\d+)\s*,\s*[^}]*textShadow:\s*\'([^\']+)\'[^}]*\}\}>'

    match = re.search(text_style_pattern, tsx_code, re.DOTALL)
    if match:
        text_info["style"] = {
            "color": match.group(1),
            "fontSize": match.group(2),
            "fontWeight": int(match.group(3)),
            "textShadow": match.group(4)
        }

    # Find text-specific animations (textScale, textOpacity, textY)
    text_anim_vars = ['textScale', 'textOpacity', 'textY']
    text_keyframes = []

    for var_name in text_anim_vars:
        pattern = rf'const\s+{var_name}\s*=\s*interpolate\(\s*frame\s*,\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]'
        match = re.search(pattern, tsx_code)
        if match:
            try:
                input_frames = [float(x.strip()) for x in match.group(1).split(',')]
                output_values = [float(x.strip()) for x in match.group(2).split(',')]
            except ValueError:
                continue
            text_keyframes.append({
                "variable": var_name,
                "inputFrames": input_frames,
                "inputSeconds": [f / fps for f in input_frames],
                "outputValues": output_values
            })

    text_info["keyframes"] = text_keyframes

    return text_info


def _parse_effects(tsx_code: str) -> List[Dict[str, Any]]:
    """
    Extract visual effects from <defs> section.

    Handles:
    - radialGradient, linearGradient
    - feGaussianBlur (glow effects)
    - feDropShadow
    """
    effects = []

    # Extract gradients
    gradient_pattern = r'<(radialGradient|linearGradient)\s+id="([^"]+)"[^>]*>(.*?)</\1>'

    for match in re.finditer(gradient_pattern, tsx_code, re.DOTALL):
        gradient_type = match.group(1)
        gradient_id = match.group(2)
        stops = []

        stop_pattern = r'<stop\s+offset="([^"]+)"\s+stopColor="([^"]+)"'
        for stop_match in re.finditer(stop_pattern, match.group(3)):
            stops.append({
                "offset": stop_match.group(1),
                "color": stop_match.group(2)
            })

        effects.append({
            "type": gradient_type,
            "id": gradient_id,
            "stops": stops
        })

    # Extract filters (glow, shadow)
    filter_pattern = r'<filter\s+id="([^"]+)"[^>]*>(.*?)</filter>'

    for match in re.finditer(filter_pattern, tsx_code, re.DOTALL):
        filter_id = match.group(1)
        filter_content = match.group(2)

        # Check for glow (feGaussianBlur)
        blur_match = re.search(r'<feGaussianBlur\s+stdDeviation="([^"]+)"', filter_content)
        if blur_match:
            effects.append({
                "type": "glow",
                "id": filter_id,
                "stdDeviation": float(blur_match.group(1))
            })

        # Check for drop shadow
        shadow_match = re.search(r'<feDropShadow[^>]*>', filter_content)
        if shadow_match:
            effects.append({
                "type": "dropShadow",
                "id": filter_id
            })

    # Check for inline textShadow in CSS
    textshadow_pattern = r"textShadow:\s*'([^']+)'"
    match = re.search(textshadow_pattern, tsx_code)
    if match:
        effects.append({
            "type": "textShadow",
            "value": match.group(1)
        })

    return effects


def _generate_timing_summary(animations: List[Dict], duration_seconds: float) -> Dict[str, Any]:
    """
    Generate a high-level timing summary for the LLM.
    """
    if not animations:
        return {}

    all_times = []
    for anim in animations:
        for kf in anim.get("keyframes", []):
            all_times.append(kf["time"])

    if not all_times:
        return {}

    return {
        "earliestKeyframe": min(all_times),
        "latestKeyframe": max(all_times),
        "totalDuration": duration_seconds,
        "animationCount": len(animations)
    }
