"""
Layout Solver for AnimaFlow.

Calculates absolute x, y, width, height coordinates for every layer
in a spec.json, supporting flex layouts, absolute positioning, and
default center-based coordinate conversion.

This module is pure: no side effects, no DB calls, no external I/O.
"""

from __future__ import annotations

from copy import deepcopy


# ---------------------------------------------------------------------------
# Constants & defaults
# ---------------------------------------------------------------------------

_DEFAULT_GAP: int = 0
_DEFAULT_DIRECTION: str = "column"
_DEFAULT_JUSTIFY: str = "flex-start"
_DEFAULT_ALIGN: str = "flex-start"
_DEFAULT_LAYER_HEIGHT: int = 100  # fallback when height is unspecified
_DEFAULT_LAYER_WIDTH: int = 200  # fallback when width is unspecified


def _resolve_spacing(layer: dict) -> tuple[int, int, int, int, int, int, int, int]:
    """
    Resolve padding and margin from a layer's style.

    Returns:
        (padding_top, padding_right, padding_bottom, padding_left,
         margin_top, margin_right, margin_bottom, margin_left)
    """
    style = layer.get("style", {}) or {}

    def _expand_spacing(value, default=0):
        if value is None:
            return [default, default, default, default]
        if isinstance(value, (int, float)):
            return [int(value)] * 4
        if isinstance(value, list):
            if len(value) == 1:
                return [int(value[0])] * 4
            elif len(value) == 2:
                return [int(value[0]), int(value[1]), int(value[0]), int(value[1])]
            elif len(value) == 4:
                return [int(v) for v in value]
        return [default] * 4

    padding = _expand_spacing(style.get("padding"))
    margin = _expand_spacing(style.get("margin"))

    return (padding[0], padding[1], padding[2], padding[3],
            margin[0], margin[1], margin[2], margin[3])


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def solve_layout(spec: dict, canvas_width: int, canvas_height: int) -> dict:
    """
    Recursively solve layout positions for all layers in a spec.

    Args:
        spec: The spec.json dict with layers.
        canvas_width: Canvas width in pixels.
        canvas_height: Canvas height in pixels.

    Returns:
        A *new* spec dict with absolute x, y, width, height added to
        each layer.  The original spec is not mutated.
    """
    result = deepcopy(spec)
    layers = result.get("layers", [])
    _solve_layers(layers, 0, 0, canvas_width, canvas_height, canvas_width, canvas_height)
    return result


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _solve_layers(
    layers: list[dict],
    parent_x: int,
    parent_y: int,
    parent_width: int,
    parent_height: int,
    canvas_width: int,
    canvas_height: int,
) -> None:
    """Resolve coordinates for a flat list of sibling layers."""
    for layer in layers:
        _resolve_layer(
            layer,
            parent_x,
            parent_y,
            parent_width,
            parent_height,
            canvas_width,
            canvas_height,
        )


def _resolve_layer(
    layer: dict,
    parent_x: int,
    parent_y: int,
    parent_width: int,
    parent_height: int,
    canvas_width: int,
    canvas_height: int,
) -> None:
    """Resolve a single layer's absolute coordinates and recurse into children."""

    position = layer.get("position", "")
    layout = layer.get("layout", "")

    # --- Absolute positioning (relative to parent) --------------------------
    if position == "absolute":
        _apply_absolute(layer, parent_x, parent_y, parent_width, parent_height)
        _recurse_children(layer, canvas_width, canvas_height)
        return

    # --- Flex layout --------------------------------------------------------
    if layout == "flex":
        _apply_flex(
            layer,
            parent_x,
            parent_y,
            parent_width,
            parent_height,
            canvas_width,
            canvas_height,
        )
        _recurse_children(layer, canvas_width, canvas_height)
        return

    # --- Already positioned by a flex parent --------------------------------
    # Flex distribution sets x, y, width, height relative to the container
    # and marks the layer with _flex_positioned.  If present, offset the
    # relative coordinates by the parent's absolute position and recurse
    # into grandchildren without re-applying positioning.
    if layer.get("_flex_positioned"):
        layer["x"] = parent_x + layer["x"]
        layer["y"] = parent_y + layer["y"]
        del layer["_flex_positioned"]
        _recurse_children(layer, canvas_width, canvas_height)
        return

    # --- Default: center-based coordinates ----------------------------------
    _apply_default(layer, parent_x, parent_y, parent_width, parent_height)
    _recurse_children(layer, canvas_width, canvas_height)


def _recurse_children(layer: dict, canvas_width: int, canvas_height: int) -> None:
    """Recurse into a layer's children, using the layer as the new parent context."""
    children = layer.get("children", [])
    if children:
        _solve_layers(
            children,
            layer["x"],
            layer["y"],
            layer["width"],
            layer["height"],
            canvas_width,
            canvas_height,
        )


# ---------------------------------------------------------------------------
# Positioning strategies
# ---------------------------------------------------------------------------


def _apply_absolute(
    layer: dict,
    parent_x: int,
    parent_y: int,
    parent_width: int,
    parent_height: int,
) -> None:
    """Calculate absolute coordinates from top/right/bottom/left offsets."""
    width = _get_dimension(layer, "width", _DEFAULT_LAYER_WIDTH)
    height = _get_dimension(layer, "height", _DEFAULT_LAYER_HEIGHT)

    left = layer.get("left")
    right = layer.get("right")
    top = layer.get("top")
    bottom = layer.get("bottom")

    # Resolve X
    if left is not None:
        x = parent_x + int(left)
    elif right is not None:
        x = parent_x + parent_width - int(right) - width
    else:
        x = parent_x  # fallback

    # Resolve Y
    if top is not None:
        y = parent_y + int(top)
    elif bottom is not None:
        y = parent_y + parent_height - int(bottom) - height
    else:
        y = parent_y  # fallback

    layer["x"] = x
    layer["y"] = y
    layer["width"] = width
    layer["height"] = height


def _apply_default(
    layer: dict,
    parent_x: int,
    parent_y: int,
    parent_width: int,
    parent_height: int,
) -> None:
    """
    Convert center-based coordinates to absolute top-left.

    spec.json stores x/y as offsets from the parent center:
        abs_x = center_x + x
        abs_y = center_y + y
    We then convert to top-left corner by subtracting half the dimension.
    """
    center_x = parent_x + parent_width / 2
    center_y = parent_y + parent_height / 2

    offset_x = layer.get("x", 0)
    offset_y = layer.get("y", 0)
    width = _get_dimension(layer, "width", _DEFAULT_LAYER_WIDTH)
    height = _get_dimension(layer, "height", _DEFAULT_LAYER_HEIGHT)

    layer["x"] = int(center_x + offset_x - width / 2)
    layer["y"] = int(center_y + offset_y - height / 2)
    layer["width"] = width
    layer["height"] = height


def _apply_flex(
    layer: dict,
    parent_x: int,
    parent_y: int,
    parent_width: int,
    parent_height: int,
    canvas_width: int,
    canvas_height: int,
) -> None:
    """
    Resolve flex container dimensions and distribute children along
    the main and cross axes, accounting for padding.
    """
    padding_top, padding_right, padding_bottom, padding_left, _, _, _, _ = _resolve_spacing(layer)
    padding_x = padding_left + padding_right
    padding_y = padding_top + padding_bottom

    # Container fills available space by default
    width = _get_dimension(layer, "width", parent_width)
    height = _get_dimension(layer, "height", parent_height)

    layer["x"] = parent_x
    layer["y"] = parent_y
    layer["width"] = width
    layer["height"] = height

    children = layer.get("children", [])
    if not children:
        return

    # Available space for children (subtract padding)
    available_width = max(0, width - padding_x)
    available_height = max(0, height - padding_y)

    direction = layer.get("direction", _DEFAULT_DIRECTION)
    gap = layer.get("gap", _DEFAULT_GAP)
    justify = layer.get("justifyContent", _DEFAULT_JUSTIFY)
    align = layer.get("alignItems", _DEFAULT_ALIGN)

    if direction == "row":
        _distribute_row(children, available_width, available_height, gap, justify, align, padding_left, padding_top)
    else:
        _distribute_column(children, available_width, available_height, gap, justify, align, padding_left, padding_top)


# ---------------------------------------------------------------------------
# Flex distribution
# ---------------------------------------------------------------------------


def _distribute_row(
    children: list[dict],
    container_width: int,
    container_height: int,
    gap: int,
    justify: str,
    align: str,
    padding_x: int = 0,
    padding_y: int = 0,
) -> None:
    """Distribute children horizontally (main axis = X), with padding offset."""
    if len(children) == 1:
        _size_single_child(children[0], container_width, container_height, align)
        children[0]["x"] = padding_x
        children[0]["y"] = padding_y + _align_cross(children[0]["height"], container_height, align)
        children[0]["_flex_positioned"] = True
        return

    # --- Determine widths ---------------------------------------------------
    flex_children: list[tuple[int, dict]] = []
    fixed_total: int = 0

    for i, child in enumerate(children):
        w = child.get("width")
        if w is not None:
            fixed_total += int(w)
        else:
            flex_children.append((i, child))

    remaining = max(0, container_width - fixed_total - gap * (len(children) - 1))
    flex_total = sum(_get_flex(child) for _, child in flex_children) or 1

    for _, child in flex_children:
        f = _get_flex(child)
        child["width"] = int(remaining * f / flex_total)

    for child in children:
        if "height" not in child:
            child["height"] = _DEFAULT_LAYER_HEIGHT

    offsets = _justify_positions(
        sizes=[c["width"] for c in children],
        gap=gap,
        total_size=container_width,
        justify=justify,
    )

    for i, child in enumerate(children):
        child["x"] = padding_x + offsets[i]
        child["y"] = padding_y + _align_cross(child["height"], container_height, align)
        child["_flex_positioned"] = True


def _distribute_column(
    children: list[dict],
    container_width: int,
    container_height: int,
    gap: int,
    justify: str,
    align: str,
    padding_x: int = 0,
    padding_y: int = 0,
) -> None:
    """Distribute children vertically (main axis = Y), with padding offset."""
    if len(children) == 1:
        _size_single_child(children[0], container_width, container_height, align)
        children[0]["y"] = padding_y
        children[0]["x"] = padding_x + _align_cross_horizontal(children[0]["width"], container_width, align)
        children[0]["_flex_positioned"] = True
        return

    flex_children: list[tuple[int, dict]] = []
    fixed_total: int = 0

    for i, child in enumerate(children):
        h = child.get("height")
        if h is not None:
            fixed_total += int(h)
        else:
            flex_children.append((i, child))

    remaining = max(0, container_height - fixed_total - gap * (len(children) - 1))
    flex_total = sum(_get_flex(child) for _, child in flex_children) or 1

    for _, child in flex_children:
        f = _get_flex(child)
        child["height"] = int(remaining * f / flex_total)

    # Ensure every child has a width
    for child in children:
        if "width" not in child:
            child["width"] = _DEFAULT_LAYER_WIDTH

    # --- Justify content (main axis) ----------------------------------------
    offsets = _justify_positions(
        sizes=[c["height"] for c in children],
        gap=gap,
        total_size=container_height,
        justify=justify,
    )

    # --- Position children --------------------------------------------------
    for i, child in enumerate(children):
        child["y"] = padding_y + offsets[i]
        child["x"] = padding_x + _align_cross_horizontal(child["width"], container_width, align)
        child["_flex_positioned"] = True


# ---------------------------------------------------------------------------
# Flex helpers
# ---------------------------------------------------------------------------


def _size_single_child(
    child: dict,
    container_width: int,
    container_height: int,
    align: str,
) -> None:
    """Size a single child to fill the container (stretch behavior)."""
    if "width" not in child:
        child["width"] = container_width
    if "height" not in child:
        child["height"] = container_height


def _get_flex(child: dict) -> float:
    """Return the flex factor for a child (default 1)."""
    f = child.get("flex")
    if f is None:
        return 1.0
    return float(f)


def _justify_positions(
    sizes: list[int],
    gap: int,
    total_size: int,
    justify: str,
) -> list[int]:
    """
    Calculate the starting position for each item along the main axis.

    Args:
        sizes: Width (row) or height (column) of each item.
        gap: Gap between items.
        total_size: Container dimension.
        justify: justify-content value.

    Returns:
        List of starting positions for each item.
    """
    count = len(sizes)
    if count == 0:
        return []

    used_size = sum(sizes) + gap * max(count - 1, 0)
    free_space = total_size - used_size

    # Calculate per-item spacing contribution based on justify mode
    if justify == "flex-start":
        spacing_per_item = [0] * count
    elif justify == "center":
        offset = free_space // 2
        spacing_per_item = [offset] * count
    elif justify == "space-between":
        if count <= 1:
            spacing_per_item = [0] * count
        else:
            step = free_space // (count - 1)
            spacing_per_item = [i * step for i in range(count)]
    elif justify == "space-around":
        unit = free_space // count
        spacing_per_item = [unit * i + unit // 2 for i in range(count)]
    elif justify == "space-evenly":
        unit = free_space // (count + 1)
        spacing_per_item = [unit * (i + 1) for i in range(count)]
    else:
        spacing_per_item = [0] * count

    # Build positions: cumulative sizes + gaps + justify spacing
    positions: list[int] = []
    cursor = 0
    for i in range(count):
        positions.append(cursor + spacing_per_item[i])
        cursor += sizes[i] + gap

    return positions


def _align_cross(child_size: int, container_size: int, align: str) -> int:
    """Align a child along the cross axis (vertical for row layout)."""
    if align == "center":
        return (container_size - child_size) // 2
    elif align == "stretch":
        return 0  # child will be sized to container separately
    # flex-start or unknown
    return 0


def _align_cross_horizontal(child_size: int, container_size: int, align: str) -> int:
    """Align a child along the cross axis (horizontal for column layout)."""
    if align == "center":
        return (container_size - child_size) // 2
    elif align == "stretch":
        return 0
    return 0


def _get_dimension(layer: dict, key: str, default: int) -> int:
    """Safely retrieve a dimension value, falling back to *default*."""
    val = layer.get(key)
    if val is None:
        return default
    return int(val)
