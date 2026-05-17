"""
TSX Animation Parser for AnimaFlow AE Export Pipeline.

Extracts animation data from Remotion TSX components to provide the LLM with
exact timing, positioning, easing, and effect information for faithful AE reproduction.

This complements svg_parser.py which only extracts geometry.
"""
import re
import json
from typing import List, Dict, Any, Optional


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
            anim_entry["ae_instruction"] = f"SUMA estos offsets a la posición base. NO usar como posición absoluta."
        if is_pixel_value:
            anim_entry["ae_instruction"] = f"Estos son píxeles, NO porcentajes. Convierte a scale %: (valor / tamaño_base) * 100."
        
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


# =============================================================================
# Helper Functions
# =============================================================================

def _extract_easing(options_str: str) -> str:
    """Extract easing function from interpolate options."""
    if 'Easing.out(Easing.back' in options_str:
        return "backOut"
    elif 'Easing.inOut(Easing.cubic' in options_str:
        return "cubicInOut"
    elif 'Easing.out(Easing.quad' in options_str:
        return "quadOut"
    elif 'Easing.in(Easing.cubic' in options_str:
        return "cubicIn"
    elif 'Easing.out(Easing.elastic' in options_str:
        return "elasticOut"
    elif 'Easing.bezier' in options_str:
        return "customBezier"
    return "linear"


def _classify_animation(var_name: str, output_values: List[float]) -> str:
    """Classify animation type based on variable name and values."""
    name_lower = var_name.lower()
    
    if 'scale' in name_lower:
        return "scale"
    elif 'opacity' in name_lower or 'opac' in name_lower:
        return "opacity"
    elif 'y' in name_lower and ('leaf' in name_lower or 'text' in name_lower or 'p' in name_lower):
        return "positionY"
    elif 'x' in name_lower:
        return "positionX"
    elif 'r' in name_lower:
        return "radius"
    elif 'width' in name_lower:
        return "width"
    elif 'height' in name_lower:
        return "height"
    else:
        return "custom"


def _map_to_ae_property(var_name: str, anim_type: str) -> str:
    """Map Remotion variable to After Effects property name."""
    if anim_type == "scale":
        return "ADBE Scale"
    elif anim_type == "opacity":
        return "ADBE Opacity"
    elif anim_type == "positionY":
        return "ADBE Position (Y)"
    elif anim_type == "positionX":
        return "ADBE Position (X)"
    elif anim_type == "spring":
        return "ADBE Scale"
    else:
        return "ADBE Transform"
