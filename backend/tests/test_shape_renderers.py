"""
Shape renderer tests for AE export.

Tests each shape renderer produces valid ExtendScript output.
"""
import pytest
from app.modules.ae_export.shape_renderers import SHAPE_RENDERERS
from app.modules.ae_export.shape_renderers.rectangle import generate_ae_rectangle
from app.modules.ae_export.shape_renderers.circle import generate_ae_circle
from app.modules.ae_export.shape_renderers.flash import generate_ae_flash


class TestShapeRenderers:
    def test_registry_has_all_shapes(self):
        """SHAPE_RENDERERS registry contains all expected shapes."""
        expected = ["rectangle", "circle", "flash", "calendar", "line", "particle"]
        for shape in expected:
            assert shape in SHAPE_RENDERERS

    def test_rectangle_generates_valid_script(self):
        """Rectangle renderer produces non-empty ExtendScript."""
        elem = {
            "id": "rect1",
            "size": [50, 30],
            "position": [100, 200],
            "color_keyframes": [{"time": 0, "color": "#ff0000"}],
        }
        script_lines = generate_ae_rectangle(elem, width=1080, height=1920)
        assert script_lines is not None
        assert len(script_lines) > 0
        script = "\n".join(script_lines)
        assert "rect" in script.lower() or "shape" in script.lower()

    def test_circle_generates_valid_script(self):
        """Circle renderer produces non-empty ExtendScript."""
        elem = {
            "id": "circle1",
            "size": [60, 60],
            "position": [100, 200],
            "color_keyframes": [{"time": 0, "color": "#0000ff"}],
        }
        script_lines = generate_ae_circle(elem, width=1080, height=1920)
        assert script_lines is not None
        assert len(script_lines) > 0
        script = "\n".join(script_lines)
        assert "ellipse" in script.lower() or "circle" in script.lower()

    def test_flash_generates_valid_script(self):
        """Flash renderer produces non-empty ExtendScript."""
        elem = {
            "id": "flash1",
            "color": "#ffff00",
            "position_keyframes": [{"time": 0, "value": [100, 200]}],
        }
        script_lines = generate_ae_flash(elem, width=1080, height=1920)
        assert script_lines is not None
        assert len(script_lines) > 0
        script = "\n".join(script_lines)
        assert "destello" in script.lower() or "flash" in script.lower()

    def test_each_renderer_returns_list_of_strings(self):
        """All renderers return a list of strings."""
        test_elems = {
            "rectangle": {"id": "r1", "size": [10, 10]},
            "circle": {"id": "c1", "size": [10, 10]},
            "flash": {"id": "f1", "color": "#000"},
            "calendar": {"id": "cal1"},
            "line": {"id": "l1", "color": "#000"},
            "particle": {"id": "p1", "size": [5, 5]},
        }

        for shape_name, renderer in SHAPE_RENDERERS.items():
            elem = test_elems.get(shape_name, {"id": f"{shape_name}1"})
            result = renderer(elem, width=1080, height=1920)
            assert isinstance(result, list), f"{shape_name} should return list"
            assert len(result) > 0, f"{shape_name} should not be empty"
            for line in result:
                assert isinstance(line, str), f"{shape_name} lines should be strings"

    def test_rectangle_with_effects(self):
        """Rectangle renderer handles effects correctly."""
        elem = {
            "id": "rect_fx",
            "size": [100, 100],
            "effects": [
                {"type": "glow", "intensity": 80},
                {"type": "drop_shadow", "distance": 15, "softness": 30, "opacity": 90},
                {"type": "blur", "intensity": 40},
            ],
        }
        script_lines = generate_ae_rectangle(elem, width=1080, height=1920)
        script = "\n".join(script_lines)
        assert "glow" in script.lower()
        assert "shadow" in script.lower()
        assert "blur" in script.lower()

    def test_circle_with_keyframes(self):
        """Circle renderer handles position and scale keyframes."""
        elem = {
            "id": "circle_kf",
            "size": [50, 50],
            "position_keyframes": [
                {"time": 0, "value": [100, 200]},
                {"time": 1, "value": [300, 400]},
            ],
            "scale_keyframes": [
                {"time": 0, "value": [0, 0]},
                {"time": 1, "value": [100, 100]},
            ],
            "opacity_keyframes": [
                {"time": 0, "value": 0},
                {"time": 1, "value": 100},
            ],
        }
        script_lines = generate_ae_circle(elem, width=1080, height=1920)
        script = "\n".join(script_lines)
        assert "setValueAtTime" in script
        assert "ADBE Position" in script
        assert "ADBE Scale" in script
        assert "ADBE Opacity" in script
