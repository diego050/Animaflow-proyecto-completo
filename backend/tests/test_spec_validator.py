"""Tests for spec_validator module."""
import pytest
from app.modules.llm.spec_validator import validate_composer_spec


class TestValidateComposerSpec:
    """Test suite for validate_composer_spec function."""

    def test_clean_spec_returns_no_warnings(self):
        """A well-formed spec should produce zero warnings."""
        spec = {
            "layers": [
                {
                    "type": "component",
                    "componentName": "Typewriter",
                    "text": "Hello world",
                    "fontSize": 48,
                    "width": 900,
                    "x": 540,
                    "y": 960,
                }
            ]
        }
        warnings = validate_composer_spec(spec, "9:16", auto_fix=False)
        assert len(warnings) == 0

    def test_group_with_items_warns(self):
        """Groups using 'items' instead of 'children' should warn."""
        spec = {
            "layers": [
                {
                    "type": "group",
                    "items": [{"icon": "lucide:dog"}],
                    "x": 0,
                    "y": 0,
                }
            ]
        }
        warnings = validate_composer_spec(spec, "9:16", auto_fix=False)
        assert any("items" in w for w in warnings)

    def test_group_with_items_auto_fixed(self):
        """Auto-fix should convert 'items' to 'children'."""
        spec = {
            "layers": [
                {
                    "type": "group",
                    "items": [{"icon": "lucide:dog"}],
                    "x": 0,
                    "y": 0,
                }
            ]
        }
        validate_composer_spec(spec, "9:16", auto_fix=True)
        assert "children" in spec["layers"][0]
        assert "items" not in spec["layers"][0]

    def test_text_overflow_warns(self):
        """Text that overflows the viewport should warn."""
        spec = {
            "layers": [
                {
                    "type": "text",
                    "text": "A" * 100,  # 100 chars at fontSize 96
                    "fontSize": 96,
                    "x": 540,
                    "y": 960,
                }
            ]
        }
        warnings = validate_composer_spec(spec, "9:16", auto_fix=False)
        assert any("overflows" in w for w in warnings)

    def test_text_overflow_auto_fixed(self):
        """Auto-fix should scale down fontSize for overflowing text."""
        spec = {
            "layers": [
                {
                    "type": "text",
                    "text": "A" * 100,
                    "fontSize": 96,
                    "x": 540,
                    "y": 960,
                }
            ]
        }
        validate_composer_spec(spec, "9:16", auto_fix=True)
        assert spec["layers"][0]["fontSize"] < 96
        assert spec["layers"][0]["fontSize"] >= 28  # Never below minimum

    def test_type_text_with_component_name_warns(self):
        """type='text' with componentName should warn."""
        spec = {
            "layers": [
                {
                    "type": "text",
                    "componentName": "TextReveal",
                    "text": "Hello",
                    "fontSize": 48,
                }
            ]
        }
        warnings = validate_composer_spec(spec, "9:16", auto_fix=False)
        assert any("componentName" in w for w in warnings)

    def test_type_text_with_component_name_auto_fixed(self):
        """Auto-fix should change type to 'component'."""
        spec = {
            "layers": [
                {
                    "type": "text",
                    "componentName": "TextReveal",
                    "text": "Hello",
                    "fontSize": 48,
                }
            ]
        }
        validate_composer_spec(spec, "9:16", auto_fix=True)
        assert spec["layers"][0]["type"] == "component"

    def test_string_number_warns(self):
        """String values for numeric fields should warn."""
        spec = {
            "layers": [
                {
                    "type": "component",
                    "componentName": "IconifyIcon",
                    "icon": "lucide:dog",
                    "size": "120",
                    "x": 540,
                    "y": 960,
                }
            ]
        }
        warnings = validate_composer_spec(spec, "9:16", auto_fix=False)
        assert any("string" in w for w in warnings)

    def test_string_number_auto_fixed(self):
        """Auto-fix should convert string numbers to actual numbers."""
        spec = {
            "layers": [
                {
                    "type": "component",
                    "componentName": "IconifyIcon",
                    "icon": "lucide:dog",
                    "size": "120",
                    "x": 540,
                    "y": 960,
                }
            ]
        }
        validate_composer_spec(spec, "9:16", auto_fix=True)
        assert spec["layers"][0]["size"] == 120
        assert isinstance(spec["layers"][0]["size"], int)

    def test_duplicate_text_warns(self):
        """Duplicate text across layers should warn."""
        spec = {
            "layers": [
                {"type": "text", "text": "Sígueme para ver más contenido increíble", "fontSize": 48},
                {"type": "text", "text": "Sígueme para ver más contenido increíble", "fontSize": 36},
            ]
        }
        warnings = validate_composer_spec(spec, "9:16", auto_fix=False)
        assert any("duplicate" in w for w in warnings)

    def test_empty_group_warns(self):
        """Groups with no children should warn."""
        spec = {
            "layers": [
                {"type": "group", "children": [], "x": 0, "y": 0}
            ]
        }
        warnings = validate_composer_spec(spec, "9:16", auto_fix=False)
        assert any("no children" in w for w in warnings)

    def test_missing_component_width_warns(self):
        """Text components without explicit width should warn."""
        spec = {
            "layers": [
                {
                    "type": "component",
                    "componentName": "Typewriter",
                    "text": "Hello",
                    "fontSize": 48,
                    "x": 540,
                    "y": 960,
                }
            ]
        }
        warnings = validate_composer_spec(spec, "9:16", auto_fix=False)
        assert any("width" in w for w in warnings)

    def test_excessive_layers_warns(self):
        """Specs with too many layers should warn."""
        spec = {
            "layers": [
                {"type": "text", "text": f"Layer {i}", "fontSize": 24}
                for i in range(20)
            ]
        }
        warnings = validate_composer_spec(spec, "9:16", auto_fix=False)
        assert any("too complex" in w for w in warnings)
