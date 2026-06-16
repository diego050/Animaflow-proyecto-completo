"""Tests para el filtro de íconos 'basura' (coincidencia literal de números)."""
from app.services.iconify_search import _is_junk_icon


def test_megapixel_and_resolution_icons_are_junk():
    for name in ["10mp", "10mp-outline", "12mp", "4k", "4k-box", "1080p", "16x9", "720p"]:
        assert _is_junk_icon(name), name


def test_pure_number_counter_icons_are_junk():
    for name in ["10", "100", "counter-5", "numeric-9-box", "clock-time-3"]:
        assert _is_junk_icon(name), name


def test_normal_concept_icons_are_kept():
    for name in [
        "clock-outline", "rocket-takeoff", "brain", "star", "heart",
        "co2", "3d-rotation", "h1", "view-grid", "lightning-bolt",
    ]:
        assert not _is_junk_icon(name), name
