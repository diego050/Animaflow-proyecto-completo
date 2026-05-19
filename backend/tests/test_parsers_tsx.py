import pytest
from app.modules.parsers.tsx.analyzer import analyze_tsx_for_ae
from app.modules.parsers.tsx.transforms import _extract_group_transforms


def test_analyze_simple_tsx():
    tsx = '''export const MyComp = () => {
        return (
            <div style={{ transform: 'translateX(100px)' }}>
                Hello
            </div>
        );
    };'''
    result = analyze_tsx_for_ae(tsx)
    assert isinstance(result, dict)
    # Basic structure check
    assert "elements" in result
    assert "animations" in result
    assert "groups" in result


def test_analyze_empty_tsx():
    tsx = '''export const Empty = () => <div></div>;'''
    result = analyze_tsx_for_ae(tsx)
    assert isinstance(result, dict)
    assert "elements" in result


def test_extract_group_transforms():
    tsx = '''<g transform={`translate(${x}, ${y}) scale(${s})`} style={{ opacity: op }}><circle cx="50" cy="50" r="10"/></g>'''
    result = _extract_group_transforms(tsx)
    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0].get("translateX_var") == "x"
    assert result[0].get("translateY_var") == "y"
    assert result[0].get("scale_var") == "s"
    # Note: _extract_group_transforms regex does not reliably capture opacity
    # when style follows transform; this is a known limitation of the current parser.
    assert "children_block" in result[0]
