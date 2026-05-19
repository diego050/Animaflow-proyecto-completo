"""SVG parser utility functions."""
import re
from typing import Optional


def _parse_attr(element_str: str, attr: str) -> Optional[str]:
    """Extract an attribute value from an SVG element string."""
    pattern = rf'\b{attr}=["\']([^"\']*)["\']'
    match = re.search(pattern, element_str)
    return match.group(1) if match else None


def _parse_number(value: Optional[str], default: float = 0.0) -> float:
    """Parse a numeric string, returning default on failure."""
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _parse_color(value: Optional[str]) -> Optional[str]:
    """Parse a color value, handling hex, rgb(), and named colors."""
    if not value or value == 'none':
        return None
    value = value.strip()
    if value.startswith('#'):
        return value
    rgb_match = re.match(r'rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', value)
    if rgb_match:
        r, g, b = int(rgb_match.group(1)), int(rgb_match.group(2)), int(rgb_match.group(3))
        return f'#{r:02x}{g:02x}{b:02x}'
    return value
