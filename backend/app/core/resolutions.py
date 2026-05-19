"""
Resoluciones y aspect ratios soportados por AnimaFlow.
"""
from typing import Tuple, Dict

ASPECT_RATIOS: Dict[str, Tuple[int, int]] = {
    "9:16": (1080, 1920),
    "4:5": (1080, 1350),
    "3:4": (1080, 1440),
    "1:1": (1080, 1080),
    "16:9": (1920, 1080),
}

DEFAULT_ASPECT_RATIO = "9:16"

def get_resolution(aspect_ratio: str) -> Tuple[int, int]:
    """Retorna (width, height) para el aspect ratio dado."""
    return ASPECT_RATIOS.get(aspect_ratio, ASPECT_RATIOS[DEFAULT_ASPECT_RATIO])

def get_center(aspect_ratio: str) -> Tuple[float, float]:
    """Retorna el centro (x, y) para el aspect ratio dado."""
    w, h = get_resolution(aspect_ratio)
    return (w / 2, h / 2)

def get_prompt_dimensions(aspect_ratio: str) -> str:
    """Retorna string de dimensiones para prompts del LLM."""
    w, h = get_resolution(aspect_ratio)
    return f"{w}x{h}"
