"""
spec_validator.py — Post-generation validator for AnimaComposerSpec.

Validates visual correctness of generated specs BEFORE sending to the frontend.
Returns a list of warnings and applies auto-fixes where possible.

This is the last line of defense against visually broken specs.
"""
from typing import Any
from app.core.logging import get_logger

logger = get_logger("llm.spec_validator")


# ── Contrast helpers (WCAG 2.1) ──────────────────────────────────────────────

def _relative_luminance(hex_color: str) -> float:
    """Calculate relative luminance from a hex color (#RRGGBB)."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) != 6:
        return 0.0
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    def linearize(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)


def _contrast_ratio(color1: str, color2: str) -> float:
    """Calculate WCAG contrast ratio between two hex colors."""
    l1 = _relative_luminance(color1)
    l2 = _relative_luminance(color2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

# Canvas dimensions by aspect ratio
CANVAS_DIMENSIONS = {
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
    "1:1": (1080, 1080),
    "4:5": (1080, 1350),
    "4:3": (1440, 1080),
    "3:4": (1080, 1440),
}

# Components that render text
TEXT_COMPONENTS = {"Typewriter", "TextReveal", "StyleTextBlock", "StyleScrambleText", "WordHighlight"}


def validate_composer_spec(
    spec: dict[str, Any],
    aspect_ratio: str = "9:16",
    auto_fix: bool = True,
) -> list[str]:
    """
    Validate a composer spec and return list of warnings.

    If auto_fix=True, applies corrections directly to the spec dict.

    Args:
        spec: The raw spec dict from LLM post-processing
        aspect_ratio: Canvas aspect ratio string
        auto_fix: Whether to auto-fix issues in-place

    Returns:
        List of warning messages (empty = spec is clean)
    """
    warnings: list[str] = []
    canvas_w, canvas_h = CANVAS_DIMENSIONS.get(aspect_ratio, (1080, 1920))
    max_text_width = canvas_w * 0.85

    layers = spec.get("layers", [])

    for i, layer in enumerate(layers):
        layer_type = layer.get("type", "")
        comp_name = layer.get("componentName", "")

        # ── Check 1: Groups must have 'children' (not 'items') ──
        if layer_type == "group":
            if "items" in layer and "children" not in layer:
                msg = f"Layer {i}: group has 'items' instead of 'children'"
                warnings.append(msg)
                if auto_fix:
                    layer["children"] = layer.pop("items")
                    logger.warning("Auto-fixed: %s", msg)
            if not layer.get("children"):
                msg = f"Layer {i}: group has no children (will render empty)"
                warnings.append(msg)

        # ── Check 2: ELIMINADO (v7.1) ──
        # Estimaba el ancho del texto como UNA sola línea
        # (len(text) × fontSize×0.6) y encogía cualquier texto largo de forma
        # brutal (p.ej. 95→28), peleándose con el auto-fit MULTILÍNEA de
        # component_strategy (_auto_fit_layer_text), que es el sistema correcto.
        # El ajuste de tamaño ahora lo hace exclusivamente ese auto-fit; aquí
        # solo queda el piso de fontSize (Check 10).

        # ── Check 3: No type/componentName conflicts ──
        if layer_type == "text" and comp_name:
            msg = (
                f"Layer {i}: type='text' with componentName='{comp_name}' "
                f"(componentName will be ignored)"
            )
            warnings.append(msg)
            if auto_fix:
                layer["type"] = "component"
                logger.warning("Auto-fixed type → 'component': %s", msg)

        # ── Check 4: No string numbers (except semantic sizes) ──
        SEMANTIC_SIZE_VALUES = {"xs", "sm", "md", "lg", "xl", "2xl", "3xl"}
        for key in ("width", "height", "fontSize", "strokeWidth"):
            val = layer.get(key)
            if isinstance(val, str):
                msg = f"Layer {i}: {key} is string '{val}' (should be number)"
                warnings.append(msg)
                if auto_fix:
                    try:
                        layer[key] = float(val) if "." in val else int(val)
                    except (ValueError, TypeError):
                        pass

        # Separate check for size field — handle semantic sizes
        size_val = layer.get("size")
        if isinstance(size_val, str) and size_val not in SEMANTIC_SIZE_VALUES:
            try:
                numeric = float(size_val) if "." in size_val else int(size_val)
                layer["size"] = str(numeric)
            except (ValueError, TypeError):
                pass  # Keep as string if not parseable

        # ── Check 5: Component width must be explicit ──
        if comp_name in TEXT_COMPONENTS and "width" not in layer:
            msg = f"Layer {i}: {comp_name} has no explicit width"
            warnings.append(msg)
            if auto_fix:
                layer["width"] = int(canvas_w * 0.85)
                logger.warning("Auto-fixed width for %s: %s", comp_name, msg)

        # ── Check 6: Validate children recursively ──
        children = layer.get("children", [])
        if children:
            child_spec = {"layers": children}
            child_warnings = validate_composer_spec(
                child_spec, aspect_ratio, auto_fix
            )
            for cw in child_warnings:
                warnings.append(f"  (child of layer {i}) {cw}")

    # ── Check 7: No duplicate text across layers ──
    seen_texts: set[str] = set()
    for i, layer in enumerate(layers):
        text = layer.get("text", "")
        if text and len(text) > 10:
            normalized = text.strip().lower()
            if normalized in seen_texts:
                msg = f"Layer {i}: duplicate text '{text[:50]}...'"
                warnings.append(msg)
            else:
                seen_texts.add(normalized)

    # ── Check 8: Layer count sanity ──
    if len(layers) > 15:
        msg = f"Spec has {len(layers)} layers (may be too complex for 7s scene)"
        warnings.append(msg)

    # ── Check 9: Component name must be in registry ──
    # Reutiliza la ÚNICA fuente de verdad para evitar que esta lista derive de
    # la del strategy (que es la que de verdad borra componentes). v7.
    from app.modules.llm.component_strategy import AVAILABLE_COMPONENTS
    VALID_COMPONENTS = set(AVAILABLE_COMPONENTS)

    for i, layer in enumerate(layers):
        comp_name = layer.get("componentName", "")
        if comp_name and comp_name not in VALID_COMPONENTS:
            msg = f"Layer {i}: unknown component '{comp_name}'"
            warnings.append(msg)
            if auto_fix:
                layer["_unknown_component"] = True
                logger.warning("Flagged unknown component: %s", msg)

    # ── Check 10: fontSize must be >= 48 for text components ──
    for i, layer in enumerate(layers):
        comp_name = layer.get("componentName", "")
        layer_type = layer.get("type", "")
        font_size = layer.get("fontSize")
        if comp_name in TEXT_COMPONENTS or layer_type == "text":
            if isinstance(font_size, (int, float)) and font_size < 48:
                msg = f"Layer {i}: fontSize {font_size} too small for mobile video (min 48)"
                warnings.append(msg)
                if auto_fix:
                    layer["fontSize"] = 48
                    logger.warning("Auto-fixed fontSize to 48: %s", msg)

    # ── Check 11: Contrast guard — ensure text is readable on background ──
    bg_colors = spec.get("background", {}).get("colors", [])
    if bg_colors and isinstance(bg_colors, list) and len(bg_colors) > 0:
        bg_color = bg_colors[0]  # first/darkest color
        bg_luminance = _relative_luminance(bg_color)

        def _check_and_fix_text_color(layer: dict, layer_idx: int, parent_path: str = "") -> None:
            comp_name = layer.get("componentName", "")
            layer_type = layer.get("type", "")
            if comp_name not in TEXT_COMPONENTS and layer_type != "text":
                return
            # Extract text color from layer
            text_color = layer.get("color") or layer.get("textColor") or "#ffffff"
            if not isinstance(text_color, str) or not text_color.startswith("#"):
                return
            ratio = _contrast_ratio(text_color, bg_color)
            if ratio < 4.5:
                label = f"{parent_path}layer {layer_idx}" if parent_path else f"Layer {layer_idx}"
                msg = f"{label}: text color {text_color} on bg {bg_color} has contrast ratio {ratio:.2f} (< 4.5)"
                warnings.append(msg)
                if auto_fix:
                    if bg_luminance < 0.2:
                        layer["color"] = "#ffffff"
                        if "textColor" in layer:
                            layer["textColor"] = "#ffffff"
                    elif bg_luminance > 0.8:
                        layer["color"] = "#000000"
                        if "textColor" in layer:
                            layer["textColor"] = "#000000"
                    else:
                        # Mid-range background: pick whichever gives more contrast
                        ratio_white = _contrast_ratio("#ffffff", bg_color)
                        ratio_black = _contrast_ratio("#000000", bg_color)
                        chosen = "#ffffff" if ratio_white > ratio_black else "#000000"
                        layer["color"] = chosen
                        if "textColor" in layer:
                            layer["textColor"] = chosen
                    logger.warning("Auto-fixed text color for readability: %s", msg)

        for i, layer in enumerate(layers):
            _check_and_fix_text_color(layer, i)
            # Check children recursively
            children = layer.get("children", [])
            if isinstance(children, list):
                for j, child in enumerate(children):
                    _check_and_fix_text_color(child, j, parent_path=f"(child of layer {i}) ")

    # Also validate spec-level textColor if present (from visual spec)
    spec_text_color = spec.get("textColor")
    if spec_text_color and isinstance(spec_text_color, str) and bg_colors:
        bg_color = bg_colors[0]
        ratio = _contrast_ratio(spec_text_color, bg_color)
        if ratio < 4.5:
            msg = f"Spec-level textColor {spec_text_color} on bg {bg_color} has contrast ratio {ratio:.2f} (< 4.5)"
            warnings.append(msg)
            if auto_fix:
                bg_luminance = _relative_luminance(bg_color)
                spec["textColor"] = "#ffffff" if bg_luminance < 0.5 else "#000000"
                logger.warning("Auto-fixed spec-level textColor: %s", msg)

    return warnings


def validate_and_fix(spec: dict[str, Any], aspect_ratio: str = "9:16") -> dict[str, Any]:
    """
    Convenience wrapper: validate, auto-fix, and return the spec.
    Logs all warnings. Use this in the pipeline.
    """
    warnings = validate_composer_spec(spec, aspect_ratio, auto_fix=True)
    if warnings:
        logger.warning(
            "Spec validation: %d warnings for aspect_ratio=%s:\n  %s",
            len(warnings),
            aspect_ratio,
            "\n  ".join(warnings),
        )
    else:
        logger.info("Spec validation: clean (no warnings)")
    return spec
