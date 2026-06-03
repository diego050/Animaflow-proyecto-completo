"""
spec_validator.py — Post-generation validator for AnimaComposerSpec.

Validates visual correctness of generated specs BEFORE sending to the frontend.
Returns a list of warnings and applies auto-fixes where possible.

This is the last line of defense against visually broken specs.
"""
from typing import Any
from app.core.logging import get_logger

logger = get_logger("llm.spec_validator")

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
TEXT_COMPONENTS = {"Typewriter", "TextReveal", "StyleTextBlock", "StyleScrambleText"}


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

        # ── Check 2: Text must fit in viewport ──
        text = layer.get("text", "")
        font_size = layer.get("fontSize")
        if text and isinstance(font_size, (int, float)):
            char_width = font_size * 0.6
            estimated_width = len(text) * char_width
            if estimated_width > max_text_width:
                msg = (
                    f"Layer {i}: text overflows "
                    f"({len(text)} chars × {char_width:.0f}px = {estimated_width:.0f}px "
                    f"> {max_text_width:.0f}px max)"
                )
                warnings.append(msg)
                if auto_fix:
                    scale = max_text_width / estimated_width
                    new_size = max(28, int(font_size * scale))
                    layer["fontSize"] = new_size
                    logger.warning(
                        "Auto-fixed fontSize %d → %d: %s",
                        font_size, new_size, msg,
                    )

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
    VALID_COMPONENTS = {
        "APIRequestFlow", "AbstractWave", "AnimatedArrow", "AnimatedIcon", "AnimatedLine",
        "AnimatedShape", "AppStoreButtons", "AudioSpectrumBars", "BarChartReveal",
        "BreakingNewsAlert", "BreakingNewsTicker", "BrowserWindow", "CalendarDatePop",
        "CodeBlockHighlight", "CountdownTimer", "CounterNumber", "CursorClick",
        "EmojiFloat", "EmojiReaction", "FeatureChecklist", "FloatingBlobs",
        "GlitchTitle", "GlitchTransition", "GlobalVFX", "GridPerspective",
        "HighlightText", "KineticBackground", "LightLeakTransition", "LowerThird",
        "MusicPlayerUI", "NetworkNodes", "NotificationToast", "ParticleField",
        "PercentageRing", "PhoneMockup", "ProductCardReveal", "QuoteBlock",
        "RaysOfLight", "SearchEngineTyping", "ShoppingCartBadge", "SocialProgressBar",
        "SplitScreenGrid", "StatCard", "StepByStepGuide", "StyleAnimateNumber",
        "StyleAvatar", "StyleBadge", "StyleButton", "StyleCard", "StyleChip",
        "StyleDivider", "StyleProgressBar", "StyleScrambleText", "StyleTextBlock",
        "SubscribeButton", "TerminalHacker", "TestimonialReview", "TextBubble",
        "TextReveal", "TinderSwipeCard", "TrendLine", "Typewriter", "WipeTransition",
        "ZoomBlurTransition", "IconifyIcon",
    }

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
