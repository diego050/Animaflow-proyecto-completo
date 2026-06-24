import pytest
from app.modules.parsers.tsx.components import _extract_universal_props, parse_components_from_tsx

def test_extract_universal_props_string():
    props_str = 'color="#ffffff" text="Hello World"'
    props = _extract_universal_props(props_str)
    assert props['color'] == '#ffffff'
    assert props['text'] == 'Hello World'

def test_extract_universal_props_numeric():
    props_str = 'fontSize={40} delay={10.5}'
    props = _extract_universal_props(props_str)
    assert props['fontSize'] == 40.0
    assert props['delay'] == 10.5

def test_extract_universal_props_negative():
    props_str = 'x={-100} y={-50.5}'
    props = _extract_universal_props(props_str)
    assert props['x'] == -100.0
    assert props['y'] == -50.5

def test_extract_universal_props_mixed():
    props_str = 'color="#ff0000" fontSize={20} x={100} y={-50}'
    props = _extract_universal_props(props_str)
    assert props['color'] == '#ff0000'
    assert props['fontSize'] == 20.0
    assert props['x'] == 100.0
    assert props['y'] == -50.0

def test_parse_components_from_tsx_extracts_defaults():
    tsx = '<KineticBackground speed={2.0} />'
    parsed = parse_components_from_tsx(tsx)
    assert 'KineticBackground' in parsed
    # Should use the default color1 if not provided
    assert parsed['KineticBackground']['color1'] == '#0f172a'
    # Should override speed
    assert parsed['KineticBackground']['speed'] == 2.0
