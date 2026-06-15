"""Tests para el de-solapamiento vertical de Fase 3 (component_strategy)."""
from app.modules.llm.component_strategy import (
    _estimate_layer_height,
    _resolve_vertical_overlaps,
)


def _y(spec, name):
    return next(l["y"] for l in spec["layers"] if l.get("componentName") == name)


def test_fill_components_not_moved():
    spec = {
        "layers": [
            {"type": "component", "componentName": "ParticleField", "x": 0, "y": 0},
            {"type": "component", "componentName": "StyleTextBlock", "x": 0, "y": 0,
             "text": "Hola mundo", "fontSize": 80},
            {"type": "component", "componentName": "StyleBadge", "x": 0, "y": 10,
             "text": "CTA", "fontSize": 48},
        ]
    }
    _resolve_vertical_overlaps(spec, 1080, 1920)
    assert _y(spec, "ParticleField") == 0  # backdrop intacto


def test_overlapping_content_separated_and_ordered():
    spec = {
        "layers": [
            {"type": "component", "componentName": "IconifyIcon", "x": 0, "y": -250,
             "icon": "mdi:heart", "size": 160},
            {"type": "component", "componentName": "WordHighlight", "x": 0, "y": 0,
             "text": "Ellos sanan tu ansiedad sin decir una sola palabra y te acompanan",
             "fontSize": 84, "width": 918, "maxLines": 3},
            {"type": "component", "componentName": "StyleBadge", "x": 0, "y": 40,
             "text": "Sigueme", "fontSize": 48},
        ]
    }
    _resolve_vertical_overlaps(spec, 1080, 1920)
    # Orden vertical preservado y sin solapamiento (badge claramente debajo del texto)
    assert _y(spec, "IconifyIcon") < _y(spec, "WordHighlight") < _y(spec, "StyleBadge")
    assert _y(spec, "StyleBadge") - _y(spec, "WordHighlight") > 150


def test_stack_kept_in_safe_zone():
    spec = {
        "layers": [
            {"type": "component", "componentName": "StyleTextBlock", "x": 0, "y": 800,
             "text": "Texto muy abajo y largo " * 4, "fontSize": 80, "width": 918},
            {"type": "component", "componentName": "StyleBadge", "x": 0, "y": 820,
             "text": "CTA", "fontSize": 48},
        ]
    }
    _resolve_vertical_overlaps(spec, 1080, 1920)
    # nada debe quedar fuera de ~±43% del alto (≈ ±825 en 1920)
    for l in spec["layers"]:
        assert -860 <= l["y"] <= 860


def test_estimate_height_multiline_text_taller_than_single_line():
    short = _estimate_layer_height(
        {"type": "text", "text": "Hi", "fontSize": 80, "width": 900}, 1080, 1920)
    long = _estimate_layer_height(
        {"type": "text", "text": "x" * 200, "fontSize": 80, "width": 900}, 1080, 1920)
    assert long > short


def test_single_content_layer_noop():
    spec = {"layers": [
        {"type": "component", "componentName": "StyleTextBlock", "x": 0, "y": 0, "text": "Solo"},
    ]}
    _resolve_vertical_overlaps(spec, 1080, 1920)
    assert _y(spec, "StyleTextBlock") == 0
