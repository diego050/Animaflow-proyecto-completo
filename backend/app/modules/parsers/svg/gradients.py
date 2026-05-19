"""SVG gradient and filter parsers."""
import re
from typing import List, Dict, Any

from app.modules.parsers.svg.utils import _parse_number


def _parse_gradients(tsx_code: str) -> List[Dict[str, Any]]:
    """Parse <radialGradient> and <linearGradient> from <defs>."""
    elements = []

    # Radial gradients
    radial_pattern = r'<radialGradient\s+id="([^"]+)"[^>]*>(.*?)</radialGradient>'
    for match in re.finditer(radial_pattern, tsx_code, re.DOTALL):
        grad_id = match.group(1)
        stops = []
        stop_pattern = r'<stop\s+offset="([^"]+)"\s+stopColor="([^"]+)"'
        for stop_match in re.finditer(stop_pattern, match.group(2)):
            stops.append({"offset": stop_match.group(1), "color": stop_match.group(2)})

        elements.append({
            "type": "radialGradient",
            "id": grad_id,
            "stops": stops,
            "startColor": stops[0]["color"] if len(stops) > 0 else None,
            "endColor": stops[-1]["color"] if len(stops) > 1 else None,
        })

    # Linear gradients
    linear_pattern = r'<linearGradient\s+id="([^"]+)"[^>]*>(.*?)</linearGradient>'
    for match in re.finditer(linear_pattern, tsx_code, re.DOTALL):
        grad_id = match.group(1)
        stops = []
        stop_pattern = r'<stop\s+offset="([^"]+)"\s+stopColor="([^"]+)"'
        for stop_match in re.finditer(stop_pattern, match.group(2)):
            stops.append({"offset": stop_match.group(1), "color": stop_match.group(2)})

        elements.append({
            "type": "linearGradient",
            "id": grad_id,
            "stops": stops,
            "startColor": stops[0]["color"] if len(stops) > 0 else None,
            "endColor": stops[-1]["color"] if len(stops) > 1 else None,
        })

    return elements


def _parse_filters(tsx_code: str) -> List[Dict[str, Any]]:
    """Parse <filter> elements from <defs>."""
    elements = []

    filter_pattern = r'<filter\s+id="([^"]+)"[^>]*>(.*?)</filter>'
    for match in re.finditer(filter_pattern, tsx_code, re.DOTALL):
        filter_id = match.group(1)
        content = match.group(2)

        # Glow: feGaussianBlur
        if 'feGaussianBlur' in content:
            # Match stdDeviation with either quotes or curly braces
            blur_match = re.search(r'stdDeviation=["\'{]?([a-zA-Z0-9_.-]+)["\'}]?', content)
            std_dev = 8.0
            if blur_match:
                try:
                    std_dev = float(blur_match.group(1))
                except ValueError:
                    std_dev = 8.0
            elements.append({
                "type": "glow",
                "id": filter_id,
                "stdDeviation": std_dev,
            })

        # Drop shadow: feDropShadow
        if 'feDropShadow' in content:
            dx_match = re.search(r'\bdx=["\'{]?([a-zA-Z0-9_.-]+)["\'}]?', content)
            dy_match = re.search(r'\bdy=["\'{]?([a-zA-Z0-9_.-]+)["\'}]?', content)
            std_match = re.search(r'\bstdDeviation=["\'{]?([a-zA-Z0-9_.-]+)["\'}]?', content)
            color_match = re.search(r'\bfloodColor=["\'{]?([^"\'}]+)["\'}]?', content)
            opacity_match = re.search(r'\bfloodOpacity=["\'{]?([a-zA-Z0-9_.-]+)["\'}]?', content)

            elements.append({
                "type": "dropShadow",
                "id": filter_id,
                "dx": _parse_number(dx_match.group(1) if dx_match else None, 2.0),
                "dy": _parse_number(dy_match.group(1) if dy_match else None, 2.0),
                "stdDeviation": _parse_number(std_match.group(1) if std_match else None, 4.0),
                "floodColor": color_match.group(1) if color_match else "#000000",
                "floodOpacity": _parse_number(opacity_match.group(1) if opacity_match else None, 0.5),
            })

    return elements
