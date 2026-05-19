"""TSX Enriched Analyzer for AnimaFlow AE Export Pipeline.

Extracts EXACT positions, sizes, timing, and element counts from TSX code.
Produces a deterministic element manifest that bypasses LLM guessing.

This is the core of Option C (Hybrid): deterministic structure + LLM animations.
"""
from typing import Dict, Any

from app.modules.parsers.tsx.transforms import _extract_group_transforms
from app.modules.parsers.tsx.animation_extractors import _extract_all_animations
from app.modules.parsers.tsx.animation_special import (
    _extract_transform_animations,
    _extract_trim_paths,
    _extract_morphing,
)
from app.modules.parsers.tsx.elements import _extract_map_expansions
from app.modules.parsers.tsx.manifest import _build_element_manifest


def analyze_tsx_for_ae(tsx_code: str, width: int = 1080, height: int = 1920, fps: int = 30) -> Dict[str, Any]:
    """
    Main entry: analyze TSX and produce a complete element manifest.

    Returns:
        {
            "elements": [],        # All visual elements with exact properties
            "animations": [],      # All animations with resolved keyframes
            "groups": [],          # Group transforms (translate, scale)
            "map_expansions": [],  # Expanded .map() elements
            "transform_animations": [],  # Style transform animations (rotate, scale, translate)
            "trim_paths": [],      # Trim Paths via strokeDashoffset
            "morphing": [],        # Path morphing via interpolate on 'd'
        }
    """
    result = {
        "elements": [],
        "animations": [],
        "groups": [],
        "map_expansions": [],
        "transform_animations": [],
        "trim_paths": [],
        "morphing": [],
    }

    # 1. Extract group transforms (translate, scale, opacity)
    result["groups"] = _extract_group_transforms(tsx_code)

    # 2. Extract all interpolate/spring animations with variable resolution
    result["animations"] = _extract_all_animations(tsx_code, fps)

    # 3. Extract .map() expansions with computed per-element data
    result["map_expansions"] = _extract_map_expansions(tsx_code, fps, width, height)

    # 4. Extract style transform animations (rotation, scale, translate via CSS transform)
    result["transform_animations"] = _extract_transform_animations(tsx_code, fps)

    # 5. Extract trim paths (strokeDashoffset animations)
    result["trim_paths"] = _extract_trim_paths(tsx_code, fps)

    # 6. Extract path morphing (interpolate on 'd' attribute)
    result["morphing"] = _extract_morphing(tsx_code, fps)

    # 7. Build element manifest with resolved positions/sizes
    result["elements"] = _build_element_manifest(tsx_code, result, width, height, fps)

    return result
