"""Tests para de-solapamiento (Fase 3) y atenuado de decorativos (Fase 4)."""
from app.modules.llm.component_strategy import (
    _estimate_layer_height,
    _resolve_vertical_overlaps,
    _tame_decorative_backgrounds,
    _dedup_cta_components,
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


def test_wordhighlight_over_button_separated():
    """Regresion (escena 3): texto largo sin fontSize explicito + boton lg.

    El estimador subestimaba la altura del texto y el motor creia que no se
    pisaban. Con estimacion conservadora deben quedar separados.
    """
    spec = {
        "layers": [
            {"type": "component", "componentName": "GlobalVFX", "x": 0, "y": 0},
            {"type": "component", "componentName": "WordHighlight", "x": 0, "y": 0,
             "text": "lo que destruye su energia diaria. Descubre el secreto ahora!",
             "width": 918},
            {"type": "component", "componentName": "StyleButton", "x": 0, "y": 300,
             "text": "Descubre el secreto", "size": "lg"},
        ]
    }
    _resolve_vertical_overlaps(spec, 1080, 1920)
    assert _y(spec, "GlobalVFX") == 0  # VFX de fondo intacto
    assert _y(spec, "StyleButton") > _y(spec, "WordHighlight") + 200


def test_single_content_layer_noop():
    spec = {"layers": [
        {"type": "component", "componentName": "StyleTextBlock", "x": 0, "y": 0, "text": "Solo"},
    ]}
    _resolve_vertical_overlaps(spec, 1080, 1920)
    assert _y(spec, "StyleTextBlock") == 0


def test_busy_decorative_dimmed_when_text_present():
    """Fase 4: FloatingBlobs detras del texto se atenua (escena 3)."""
    spec = {"layers": [
        {"type": "component", "componentName": "FloatingBlobs", "x": 0, "y": 0},  # sin opacity
        {"type": "component", "componentName": "StyleTextBlock", "x": 0, "y": 0, "text": "Deja de sufrir"},
    ]}
    _tame_decorative_backgrounds(spec)
    blobs = next(l for l in spec["layers"] if l["componentName"] == "FloatingBlobs")
    assert blobs["opacity"] <= 0.30


def test_cta_button_removed_when_text_duplicates_narration():
    """Escena 4: botón 'Sígueme' se quita si el texto narrado ya lo dice."""
    spec = {"layers": [
        {"type": "component", "componentName": "HighlightText", "x": 0, "y": 0,
         "text": "¡Empieza hoy y sígueme!"},
        {"type": "component", "componentName": "StyleButton", "x": 0, "y": 300,
         "text": "Sígueme"},
    ]}
    _dedup_cta_components(spec)
    names = [l.get("componentName") for l in spec["layers"]]
    assert "StyleButton" not in names
    assert "HighlightText" in names


def test_cta_button_kept_when_distinct():
    """Un CTA con texto distinto al narrado se conserva."""
    spec = {"layers": [
        {"type": "component", "componentName": "StyleTextBlock", "x": 0, "y": 0,
         "text": "El deporte cambia tu cerebro"},
        {"type": "component", "componentName": "StyleButton", "x": 0, "y": 300,
         "text": "Link en bio"},
    ]}
    _dedup_cta_components(spec)
    assert any(l.get("componentName") == "StyleButton" for l in spec["layers"])


def test_decorative_not_dimmed_without_content():
    """Si la escena es solo el decorativo (sin texto), no se atenua."""
    spec = {"layers": [
        {"type": "component", "componentName": "FloatingBlobs", "x": 0, "y": 0, "opacity": 0.8},
    ]}
    _tame_decorative_backgrounds(spec)
    assert spec["layers"][0]["opacity"] == 0.8
