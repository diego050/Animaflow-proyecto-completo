"""Tests para el refuerzo determinista de 'texto opcional por escena' (Fase 5)."""
from app.modules.llm.component_strategy import (
    _visual_pure_indices,
    apply_visual_pure_strip,
)


def _scene_with_text_and_icon():
    return {
        "version": "1.0",
        "background": {"type": "linear-gradient", "colors": ["#111", "#222"]},
        "layers": [
            {"type": "component", "componentName": "ParticleField", "x": 0, "y": 0},
            {"type": "component", "componentName": "IconifyIcon", "x": 0, "y": 250,
             "icon": "mdi:rocket", "size": 120},
            {"type": "component", "componentName": "StyleTextBlock", "x": 0, "y": -100,
             "text": "Texto de la escena", "fontSize": 80},
        ],
    }


# ── selección determinista de índices ────────────────────────────────────────

def test_less_than_three_scenes_never_stripped():
    assert _visual_pure_indices(1) == set()
    assert _visual_pure_indices(2) == set()


def test_three_scenes_picks_the_single_middle():
    assert _visual_pure_indices(3) == {1}


def test_never_first_or_last():
    for total in range(3, 25):
        chosen = _visual_pure_indices(total)
        assert 0 not in chosen
        assert (total - 1) not in chosen
        assert chosen, f"al menos una visual-pura para total={total}"


def test_scales_roughly_one_third():
    assert len(_visual_pure_indices(10)) == 2   # 8 del medio // 3 = 2
    assert len(_visual_pure_indices(20)) == 6   # 18 del medio // 3 = 6


def test_deterministic():
    assert _visual_pure_indices(17) == _visual_pure_indices(17)


# ── strip real del texto ─────────────────────────────────────────────────────

def test_strip_removes_text_and_centers_icon_hero():
    spec, stripped = apply_visual_pure_strip(_scene_with_text_and_icon(), 1, 3, "9:16")
    assert stripped is True
    names = [l.get("componentName") for l in spec["layers"]]
    assert "StyleTextBlock" not in names           # texto removido
    assert "IconifyIcon" in names                   # visual conservado
    assert "ParticleField" in names                 # fondo conservado
    hero = next(l for l in spec["layers"] if l.get("componentName") == "IconifyIcon")
    assert hero["x"] == 0 and hero["y"] == 0        # centrado
    assert hero["size"] > 120                        # agrandado a héroe


def test_non_selected_scene_is_untouched():
    spec, stripped = apply_visual_pure_strip(_scene_with_text_and_icon(), 0, 3, "9:16")
    assert stripped is False
    assert any(l.get("componentName") == "StyleTextBlock" for l in spec["layers"])


def test_text_only_scene_not_stripped_to_empty():
    """Si lo único no-fondo es texto, NO se quita (dejaría pantalla vacía)."""
    spec = {
        "background": {"type": "solid", "colors": ["#000"]},
        "layers": [
            {"type": "component", "componentName": "KineticBackground", "x": 0, "y": 0},
            {"type": "component", "componentName": "StyleTextBlock", "x": 0, "y": 0,
             "text": "Solo texto", "fontSize": 80},
        ],
    }
    out, stripped = apply_visual_pure_strip(spec, 1, 3, "9:16")
    assert stripped is False
    assert any(l.get("componentName") == "StyleTextBlock" for l in out["layers"])
