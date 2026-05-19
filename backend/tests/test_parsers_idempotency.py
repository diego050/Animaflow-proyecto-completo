from app.modules.parsers.svg.extractor import parse_svg_from_tsx


def test_parse_svg_is_idempotent():
    """Parsing the same SVG twice yields identical results."""
    tsx = '''<svg><rect x="10" y="20" width="50" height="30" fill="#ff0000"/></svg>'''
    result1 = parse_svg_from_tsx(tsx)
    result2 = parse_svg_from_tsx(tsx)
    assert result1 == result2
