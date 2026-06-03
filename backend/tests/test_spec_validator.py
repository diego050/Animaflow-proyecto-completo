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

    def test_text_overflow_no_longer_shrinks(self):
        """v7.1: el validador YA NO encoge texto largo (Check 2 eliminado).

        El ajuste de tamaño lo hace exclusivamente el auto-fit multilínea de
        component_strategy. El validador solo conserva el piso de fontSize
        (Check 10), así que un texto grande debe quedar intacto (no bajar a 28).
        """
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
        warnings = validate_composer_spec(spec, "9:16", auto_fix=True)
        # Ya no debe existir el warning de "overflows"
        assert not any("overflows" in w for w in warnings)
        # El tamaño grande se conserva (no se aplasta a 28)
        assert spec["layers"][0]["fontSize"] == 96

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
                    "componentName": "Typewriter",
                    "text": "Hello world",
                    "fontSize": "48",
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
                    "componentName": "Typewriter",
                    "text": "Hello world",
                    "fontSize": "48",
                    "x": 540,
                    "y": 960,
                }
            ]
        }
        validate_composer_spec(spec, "9:16", auto_fix=True)
        assert spec["layers"][0]["fontSize"] == 48
        assert isinstance(spec["layers"][0]["fontSize"], int)

    def test_size_field_semantic_not_coerced(self):
        """Size field with semantic values (lg, md) should NOT be coerced to number."""
        spec = {
            "layers": [
                {
                    "type": "component",
                    "componentName": "StyleButton",
                    "text": "Click me",
                    "size": "lg",
                    "x": 540,
                    "y": 960,
                }
            ]
        }
        warnings = validate_composer_spec(spec, "9:16", auto_fix=True)
        # size "lg" is semantic, should not trigger numeric warning
        assert not any("size" in w and "string" in w for w in warnings)
        # size should remain as string
        assert spec["layers"][0]["size"] == "lg"

    def test_size_field_numeric_string_normalized(self):
        """Size field with numeric string should be normalized but not coerced to int."""
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
        # size remains as string (normalized by Pydantic, not by validator)
        assert spec["layers"][0]["size"] == "120"
        assert isinstance(spec["layers"][0]["size"], str)

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
