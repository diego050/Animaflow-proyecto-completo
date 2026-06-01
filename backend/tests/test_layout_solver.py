"""
Tests for the Layout Solver module.

Validates that solve_layout correctly calculates absolute x, y, width, height
coordinates from flexbox layouts, absolute positioning, nested groups, and
default center-based coordinate conversion.

All tests use the pure solve_layout function — no DB, no I/O, no side effects.
"""

import pytest
from app.services.layout_solver import solve_layout


# ---------------------------------------------------------------------------
# 1. Flex Row Distribution
# ---------------------------------------------------------------------------

def test_flex_row_space_between():
    """Test horizontal distribution with space-between.

    Two equal-flex children in a row container should be placed at opposite
    edges with the configured gap between them.

    Layout math (canvas 1080x1920):
      - Container fills parent: width=1080, height=1920
      - remaining = 1080 - 0 (fixed) - 20 (gap) = 1060
      - Each child width = 1060 / 2 = 530
      - used_size = 530 + 530 + 20 = 1080 → free_space = 0
      - space-between with free_space=0 → positions [0, 550]
    """
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "row",
            "justifyContent": "space-between",
            "gap": 20,
            "children": [
                {"type": "text", "text": "Left", "flex": 1},
                {"type": "text", "text": "Right", "flex": 1},
            ],
        }],
    }
    result = solve_layout(spec, 1080, 1920)

    container = result["layers"][0]
    children = container["children"]

    # Container fills the canvas
    assert container["x"] == 0
    assert container["y"] == 0
    assert container["width"] == 1080
    assert container["height"] == 1920

    # Left child starts at 0
    assert children[0]["x"] == 0
    assert children[0]["width"] == 530

    # Right child is pushed to the far side (550 > 500)
    assert children[1]["x"] == 550
    assert children[1]["width"] == 530

    # Both children share the same default height
    assert children[0]["height"] == 100
    assert children[1]["height"] == 100


def test_flex_row_space_between_three_children():
    """Verify space-between with three children distributes evenly."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "row",
            "justifyContent": "space-between",
            "gap": 10,
            "children": [
                {"type": "text", "text": "A", "flex": 1},
                {"type": "text", "text": "B", "flex": 1},
                {"type": "text", "text": "C", "flex": 1},
            ],
        }],
    }
    result = solve_layout(spec, 1080, 1920)
    children = result["layers"][0]["children"]

    # remaining = 1080 - 0 - 10*2 = 1060; each = 353
    # used = 353*3 + 20 = 1079; free = 1; step = 0
    # positions: [0, 363, 726]
    assert children[0]["x"] == 0
    assert children[1]["x"] == 363
    assert children[2]["x"] == 726


# ---------------------------------------------------------------------------
# 2. Flex Column Distribution
# ---------------------------------------------------------------------------

def test_flex_column_center():
    """Test vertical distribution with center alignment.

    Two children in a column with justifyContent=center should be centered
    as a group within the container.

    Layout math (canvas 1080x1920):
      - Container: width=1080, height=1920
      - remaining = 1920 - 0 - 20 = 1900
      - Each child height = 950
      - used_size = 950 + 950 + 20 = 1920 → free_space = 0
      - center with free_space=0 → offset = 0 → positions [0, 970]
    """
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "column",
            "justifyContent": "center",
            "alignItems": "center",
            "gap": 20,
            "children": [
                {"type": "component", "componentName": "Icon"},
                {"type": "text", "text": "Hello"},
            ],
        }],
    }
    result = solve_layout(spec, 1080, 1920)

    container = result["layers"][0]
    children = container["children"]

    # Icon is above the text
    assert children[0]["y"] < children[1]["y"]

    # With free_space=0, center offset is 0, so positions start at 0
    assert children[0]["y"] == 0
    assert children[1]["y"] == 970  # 0 + 950 + 20

    # alignItems=center → horizontal centering
    # child width = 200 (default), container = 1080
    # x = (1080 - 200) // 2 = 440
    assert children[0]["x"] == 440
    assert children[1]["x"] == 440


def test_flex_column_center_with_free_space():
    """Verify center justification when there is actual free space."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "column",
            "justifyContent": "center",
            "gap": 0,
            "children": [
                {"type": "text", "text": "A", "height": 100},
                {"type": "text", "text": "B", "height": 100},
            ],
        }],
    }
    result = solve_layout(spec, 1080, 1920)
    children = result["layers"][0]["children"]

    # used = 100 + 100 + 0 = 200; free = 1720; offset = 860
    assert children[0]["y"] == 860
    assert children[1]["y"] == 960  # 860 + 100 + 0


# ---------------------------------------------------------------------------
# 3. Absolute Positioning
# ---------------------------------------------------------------------------

def test_absolute_positioning_top_right():
    """Test overlay with absolute positioning at top-right corner.

    Layout math (canvas 1080x1920):
      - Background layer: default center-based → x=440, y=910
      - Button: position=absolute, top=20, right=20
        - width=200 (default), height=100 (default)
        - x = 0 + 1080 - 20 - 200 = 860
        - y = 0 + 20 = 20
    """
    spec = {
        "layers": [
            {"type": "component", "componentName": "Background", "zIndex": 0},
            {
                "type": "component",
                "componentName": "Button",
                "position": "absolute",
                "top": 20,
                "right": 20,
                "zIndex": 10,
            },
        ],
    }
    result = solve_layout(spec, 1080, 1920)

    background = result["layers"][0]
    button = result["layers"][1]

    # Background uses default center-based positioning
    # x = 540 + 0 - 100 = 440, y = 960 + 0 - 50 = 910
    assert background["x"] == 440
    assert background["y"] == 910

    # Button is positioned at top-right
    assert button["x"] == 860  # 1080 - 20 - 200
    assert button["y"] == 20
    assert button["width"] == 200
    assert button["height"] == 100


def test_absolute_positioning_bottom_left():
    """Test absolute positioning with bottom and left offsets."""
    spec = {
        "layers": [
            {
                "type": "component",
                "componentName": "Footer",
                "position": "absolute",
                "bottom": 50,
                "left": 30,
            },
        ],
    }
    result = solve_layout(spec, 1080, 1920)

    footer = result["layers"][0]
    # x = 0 + 30 = 30
    # y = 0 + 1920 - 50 - 100 = 1770
    assert footer["x"] == 30
    assert footer["y"] == 1770


def test_absolute_positioning_with_explicit_dimensions():
    """Test absolute positioning when width/height are explicitly set."""
    spec = {
        "layers": [
            {
                "type": "component",
                "componentName": "Banner",
                "position": "absolute",
                "top": 0,
                "left": 0,
                "width": 500,
                "height": 300,
            },
        ],
    }
    result = solve_layout(spec, 1080, 1920)

    banner = result["layers"][0]
    assert banner["x"] == 0
    assert banner["y"] == 0
    assert banner["width"] == 500
    assert banner["height"] == 300


# ---------------------------------------------------------------------------
# 4. Nested Flex Groups
# ---------------------------------------------------------------------------

def test_nested_flex_groups():
    """Test flex group inside another flex group.

    Structure:
      - Outer group (column) → fills canvas
        - Inner group (row) → fills outer group
          - Text A, Text B → distributed horizontally
    """
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "column",
            "children": [{
                "type": "group",
                "layout": "flex",
                "direction": "row",
                "children": [
                    {"type": "text", "text": "A"},
                    {"type": "text", "text": "B"},
                ],
            }],
        }],
    }
    result = solve_layout(spec, 1080, 1920)

    outer = result["layers"][0]
    inner = outer["children"][0]
    texts = inner["children"]

    # Outer fills canvas
    assert outer["width"] == 1080
    assert outer["height"] == 1920

    # Inner fills outer (single child stretch)
    assert inner["width"] == 1080
    assert inner["height"] == 1920

    # Two text children exist inside inner group
    assert len(texts) == 2
    assert texts[0]["text"] == "A"
    assert texts[1]["text"] == "B"

    # Text children are distributed horizontally
    assert texts[0]["x"] == 0
    assert texts[1]["x"] > texts[0]["x"]


def test_deeply_nested_structure():
    """Verify coordinate propagation through 3 levels of nesting."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "column",
            "children": [{
                "type": "group",
                "layout": "flex",
                "direction": "column",
                "children": [{
                    "type": "group",
                    "layout": "flex",
                    "direction": "row",
                    "children": [
                        {"type": "text", "text": "Deep"},
                    ],
                }],
            }],
        }],
    }
    result = solve_layout(spec, 1080, 1920)

    # Navigate to the deepest text
    deep_text = result["layers"][0]["children"][0]["children"][0]["children"][0]

    # All ancestors fill their parents, so deepest text starts at (0, 0)
    # relative to the innermost container
    assert deep_text["x"] == 0
    assert deep_text["y"] == 0
    assert deep_text["width"] == 1080  # single child stretches


# ---------------------------------------------------------------------------
# 5. Backward Compatibility (No Layout)
# ---------------------------------------------------------------------------

def test_backward_compatibility_no_layout():
    """Test that specs without layout properties still work.

    Layers without 'position' or 'layout' use default center-based conversion:
        abs_x = center_x + offset_x - width/2
        abs_y = center_y + offset_y - height/2

    Layout math (canvas 1080x1920, default width=200, height=100):
      - Layer 0: x_offset=0, y_offset=0
        → x = 540 + 0 - 100 = 440
        → y = 960 + 0 - 50  = 910
      - Layer 1: x_offset=0, y_offset=-200
        → x = 540 + 0 - 100 = 440
        → y = 960 - 200 - 50 = 710
    """
    spec = {
        "layers": [
            {"type": "text", "text": "Hello", "x": 0, "y": 0},
            {"type": "component", "componentName": "Icon", "x": 0, "y": -200},
        ],
    }
    result = solve_layout(spec, 1080, 1920)

    # Layer 0: center-based with zero offset → top-left of center
    assert result["layers"][0]["x"] == 440  # 540 - 100 (half width)
    assert result["layers"][0]["y"] == 910  # 960 - 50  (half height)

    # Layer 1: offset -200 from center → higher on screen
    assert result["layers"][1]["y"] == 710  # 960 - 200 - 50

    # Default dimensions are applied
    assert result["layers"][0]["width"] == 200
    assert result["layers"][0]["height"] == 100
    assert result["layers"][1]["width"] == 200
    assert result["layers"][1]["height"] == 100


def test_backward_compatibility_with_explicit_dimensions():
    """Verify center conversion respects explicit width/height."""
    spec = {
        "layers": [
            {
                "type": "text",
                "text": "Wide",
                "x": 0,
                "y": 0,
                "width": 400,
                "height": 200,
            },
        ],
    }
    result = solve_layout(spec, 1080, 1920)

    layer = result["layers"][0]
    # x = 540 + 0 - 200 = 340
    # y = 960 + 0 - 100 = 860
    assert layer["x"] == 340
    assert layer["y"] == 860
    assert layer["width"] == 400
    assert layer["height"] == 200


# ---------------------------------------------------------------------------
# 6. Single Child Stretch
# ---------------------------------------------------------------------------

def test_single_child_stretch_column():
    """Test that a single child in a column flex container stretches to fill.

    _size_single_child sets width/height to container dimensions when
    not explicitly provided.
    """
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "column",
            "children": [
                {"type": "component", "componentName": "FullHeight"},
            ],
        }],
    }
    result = solve_layout(spec, 1080, 1920)

    container = result["layers"][0]
    child = container["children"][0]

    # Single child fills the entire container
    assert child["width"] == 1080
    assert child["height"] == 1920
    assert child["x"] == 0
    assert child["y"] == 0


def test_single_child_stretch_row():
    """Test single child stretch in a row flex container."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "row",
            "children": [
                {"type": "component", "componentName": "FullWidth"},
            ],
        }],
    }
    result = solve_layout(spec, 1080, 1920)

    child = result["layers"][0]["children"][0]

    assert child["width"] == 1080
    assert child["height"] == 1920


def test_single_child_preserves_explicit_dimensions():
    """Single child stretch should NOT override explicit width/height."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "column",
            "children": [
                {"type": "component", "componentName": "Fixed", "width": 300, "height": 150},
            ],
        }],
    }
    result = solve_layout(spec, 1080, 1920)

    child = result["layers"][0]["children"][0]

    # Explicit dimensions are preserved
    assert child["width"] == 300
    assert child["height"] == 150


# ---------------------------------------------------------------------------
# 7. Edge Cases & Robustness
# ---------------------------------------------------------------------------

def test_empty_layers():
    """Spec with no layers should return unchanged."""
    spec = {"layers": []}
    result = solve_layout(spec, 1080, 1920)
    assert result["layers"] == []


def test_empty_flex_container():
    """Flex container with no children should not crash."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "row",
            "children": [],
        }],
    }
    result = solve_layout(spec, 1080, 1920)
    container = result["layers"][0]
    assert container["width"] == 1080
    assert container["height"] == 1920
    assert container["children"] == []


def test_original_spec_not_mutated():
    """solve_layout must return a new dict; original spec must be unchanged."""
    spec = {
        "layers": [
            {"type": "text", "text": "Hello", "x": 0, "y": 0},
        ],
    }
    import copy
    original = copy.deepcopy(spec)

    result = solve_layout(spec, 1080, 1920)

    assert spec == original, "Original spec was mutated!"
    assert "x" not in original["layers"][0] or original["layers"][0]["x"] == 0
    assert result is not spec


def test_mixed_positioning_strategies():
    """Layers using different positioning strategies in the same spec."""
    spec = {
        "layers": [
            # Default center-based
            {"type": "text", "text": "Center", "x": 0, "y": 0},
            # Absolute top-left
            {"type": "component", "componentName": "Badge", "position": "absolute", "top": 10, "left": 10},
            # Flex container
            {
                "type": "group",
                "layout": "flex",
                "direction": "row",
                "gap": 0,
                "children": [
                    {"type": "text", "text": "Flex A", "flex": 1},
                    {"type": "text", "text": "Flex B", "flex": 1},
                ],
            },
        ],
    }
    result = solve_layout(spec, 1080, 1920)

    # All three layers should have absolute coordinates
    for layer in result["layers"]:
        assert "x" in layer, f"Layer {layer['type']} missing x"
        assert "y" in layer, f"Layer {layer['type']} missing y"
        assert "width" in layer, f"Layer {layer['type']} missing width"
        assert "height" in layer, f"Layer {layer['type']} missing height"


def test_flex_gap_with_single_child():
    """Gap should not affect single child positioning."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "row",
            "gap": 50,  # Large gap, but only one child
            "children": [
                {"type": "text", "text": "Solo"},
            ],
        }],
    }
    result = solve_layout(spec, 1080, 1920)
    child = result["layers"][0]["children"][0]

    # Single child stretches regardless of gap
    assert child["x"] == 0
    assert child["y"] == 0
    assert child["width"] == 1080
    assert child["height"] == 1920


def test_unequal_flex_factors():
    """Children with different flex values should receive proportional sizes."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "row",
            "gap": 0,
            "children": [
                {"type": "text", "text": "Small", "flex": 1},
                {"type": "text", "text": "Large", "flex": 3},
            ],
        }],
    }
    result = solve_layout(spec, 1080, 1920)
    children = result["layers"][0]["children"]

    # remaining = 1080; flex_total = 4
    # Small: 1080 * 1/4 = 270
    # Large: 1080 * 3/4 = 810
    assert children[0]["width"] == 270
    assert children[1]["width"] == 810
    assert children[0]["x"] == 0
    assert children[1]["x"] == 270


def test_align_items_center_in_row():
    """alignItems=center should vertically center children in a row."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "row",
            "alignItems": "center",
            "gap": 0,
            "children": [
                {"type": "text", "text": "A", "height": 50},
                {"type": "text", "text": "B", "height": 50},
            ],
        }],
    }
    result = solve_layout(spec, 1080, 1920)
    children = result["layers"][0]["children"]

    # y = (1920 - 50) // 2 = 935
    assert children[0]["y"] == 935
    assert children[1]["y"] == 935


def test_align_items_center_in_column():
    """alignItems=center should horizontally center children in a column."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "column",
            "alignItems": "center",
            "gap": 0,
            "children": [
                {"type": "text", "text": "A", "width": 100},
                {"type": "text", "text": "B", "width": 100},
            ],
        }],
    }
    result = solve_layout(spec, 1080, 1920)
    children = result["layers"][0]["children"]

    # x = (1080 - 100) // 2 = 490
    assert children[0]["x"] == 490
    assert children[1]["x"] == 490


# ---------------------------------------------------------------------------
# 8. Padding & Margin in Flex Layouts
# ---------------------------------------------------------------------------

def test_flex_row_with_padding():
    """Test that padding offsets children correctly in a row layout."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "row",
            "gap": 10,
            "style": {"padding": 20},
            "children": [
                {"type": "text", "text": "Left"},
                {"type": "text", "text": "Right"},
            ],
        }]
    }
    result = solve_layout(spec, 1080, 1920)
    group = result["layers"][0]
    # Children should start at x=20 (padding), not x=0
    assert group["children"][0]["x"] == 20
    assert group["children"][1]["x"] > 20  # After first child + gap


def test_flex_column_with_padding():
    """Test that padding offsets children correctly in a column layout."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "column",
            "gap": 10,
            "style": {"padding": 30},
            "children": [
                {"type": "text", "text": "Top"},
                {"type": "text", "text": "Bottom"},
            ],
        }]
    }
    result = solve_layout(spec, 1080, 1920)
    group = result["layers"][0]
    assert group["children"][0]["y"] == 30
    assert group["children"][1]["y"] > 30


def test_flex_with_asymmetric_padding():
    """Test [top, right, bottom, left] padding array."""
    spec = {
        "layers": [{
            "type": "group",
            "layout": "flex",
            "direction": "row",
            "style": {"padding": [10, 20, 30, 40]},
            "children": [
                {"type": "text", "text": "Item"},
            ],
        }]
    }
    result = solve_layout(spec, 1080, 1920)
    group = result["layers"][0]
    assert group["children"][0]["x"] == 40  # left padding
    assert group["children"][0]["y"] == 10  # top padding


def test_resolve_spacing_helper():
    """Test the _resolve_spacing helper function."""
    from app.services.layout_solver import _resolve_spacing

    # Single value
    layer = {"style": {"padding": 10}}
    p = _resolve_spacing(layer)
    assert p == (10, 10, 10, 10, 0, 0, 0, 0)

    # Two values [vertical, horizontal]
    layer = {"style": {"padding": [10, 20]}}
    p = _resolve_spacing(layer)
    assert p == (10, 20, 10, 20, 0, 0, 0, 0)

    # Four values [top, right, bottom, left]
    layer = {"style": {"padding": [10, 20, 30, 40]}}
    p = _resolve_spacing(layer)
    assert p == (10, 20, 30, 40, 0, 0, 0, 0)

    # No style
    layer = {}
    p = _resolve_spacing(layer)
    assert p == (0, 0, 0, 0, 0, 0, 0, 0)
