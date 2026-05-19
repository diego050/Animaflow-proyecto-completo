"""Parsers package - re-exports public functions."""
from app.modules.parsers.svg.extractor import parse_svg_from_tsx
from app.modules.parsers.tsx.analyzer import analyze_tsx_for_ae
from app.modules.parsers.tsx.summary import generate_element_summary
from app.modules.parsers.tsx.animations import parse_tsx_animations

__all__ = [
    "parse_svg_from_tsx",
    "analyze_tsx_for_ae",
    "generate_element_summary",
    "parse_tsx_animations",
]
