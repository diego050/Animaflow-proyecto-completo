import pytest
from app.modules.parsers.svg.extractor import parse_svg_from_tsx
from app.modules.parsers.svg.shapes import _parse_rects, _parse_circles
from app.modules.parsers.svg.paths import _parse_paths
from app.modules.parsers.svg.gradients import _parse_gradients


def test_parse_simple_rect():
    tsx = '''<svg viewBox="0 0 100 100"><rect x="10" y="20" width="50" height="30" fill="#ff0000"/></svg>'''
    result = parse_svg_from_tsx(tsx)
    assert len(result) == 1
    assert result[0]["type"] == "rect"
    assert result[0]["x"] == 10.0
    assert result[0]["fill"] == "#ff0000"


def test_parse_circle():
    tsx = '''<svg><circle cx="50" cy="50" r="30" fill="blue"/></svg>'''
    result = parse_svg_from_tsx(tsx)
    assert len(result) == 1
    assert result[0]["type"] == "circle"
    assert result[0]["cx"] == 50.0
    assert result[0]["r"] == 30.0


def test_parse_multiple_shapes():
    tsx = '''<svg><rect x="0" y="0" width="10" height="10"/><circle cx="5" cy="5" r="5"/></svg>'''
    result = parse_svg_from_tsx(tsx)
    assert len(result) == 2
    assert result[0]["type"] == "rect"
    assert result[1]["type"] == "circle"


def test_parse_empty_svg():
    tsx = '''<svg viewBox="0 0 100 100"></svg>'''
    result = parse_svg_from_tsx(tsx)
    assert len(result) == 0


def test_parse_with_gradient():
    tsx = '''<svg><defs><linearGradient id="grad1"><stop offset="0%" stop-color="#ff0000"/><stop offset="100%" stop-color="#0000ff"/></linearGradient></defs><rect fill="url(#grad1)" width="100" height="100"/></svg>'''
    result = parse_svg_from_tsx(tsx)
    # Should parse the rect even with gradient reference
    assert len(result) >= 1
    rect = next((e for e in result if e["type"] == "rect"), None)
    assert rect is not None
    assert rect["width"] == 100.0
    gradient = next((e for e in result if e["type"] == "linearGradient"), None)
    assert gradient is not None
    assert gradient["id"] == "grad1"


def test_parse_paths():
    tsx = '''<svg><path d="M 0 0 L 10 10" fill="none" stroke="black"/></svg>'''
    result = parse_svg_from_tsx(tsx)
    assert len(result) == 1
    assert result[0]["type"] == "path"


def test_parse_rects_private():
    svg = '''<rect x="5" y="10" width="20" height="30" fill="#00ff00"/>'''
    result = _parse_rects(svg)
    assert len(result) == 1
    assert result[0]["x"] == 5.0
    assert result[0]["fill"] == "#00ff00"


def test_parse_circles_private():
    svg = '''<circle cx="100" cy="200" r="50" fill="red"/>'''
    result = _parse_circles(svg)
    assert len(result) == 1
    assert result[0]["cx"] == 100.0
    assert result[0]["cy"] == 200.0
    assert result[0]["r"] == 50.0
    assert result[0]["fill"] == "red"


def test_parse_gradients_private():
    tsx = '''<defs><linearGradient id="g1"><stop offset="0%" stopColor="#ff0000"/><stop offset="100%" stopColor="#00ff00"/></linearGradient></defs>'''
    result = _parse_gradients(tsx)
    assert len(result) == 1
    assert result[0]["type"] == "linearGradient"
    assert result[0]["id"] == "g1"
    assert len(result[0]["stops"]) == 2
