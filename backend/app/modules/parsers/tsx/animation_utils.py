"""TSX animation utility helpers."""
from typing import List


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
