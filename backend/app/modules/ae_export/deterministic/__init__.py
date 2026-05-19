"""
Deterministic AE Script Generator subpackage.

Generates ExtendScript (.jsx) without LLM using parsed SVG + enriched data.
"""
from .generator import generate_deterministic_script

__all__ = [
    "generate_deterministic_script",
]
