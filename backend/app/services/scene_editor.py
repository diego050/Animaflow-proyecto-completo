"""
Scene Editor Service — Manual and conversational editing of scene specs.

Supports:
- Manual: Direct field path modifications via dot notation
- Conversational: LLM parses natural language prompts into field changes
"""

from __future__ import annotations

import json
from typing import Any

from app.core.logging import get_logger

logger = get_logger("scene_editor")


class FieldChange:
    """Represents a single field modification."""

    def __init__(self, field_path: str, old_value: Any, new_value: Any) -> None:
        self.field_path = field_path
        self.old_value = old_value
        self.new_value = new_value

    def to_dict(self) -> dict[str, Any]:
        return {
            "field_path": self.field_path,
            "old_value": self.old_value,
            "new_value": self.new_value,
        }


def _get_nested_value(obj: dict[str, Any], path: str) -> Any:
    """Get a value from a nested dict using dot notation.

    Args:
        obj: The root dictionary to traverse.
        path: Dot-separated path (e.g., "anima_composer.layers.0.x").

    Returns:
        The value at the specified path.

    Raises:
        KeyError: If a dict key is not found.
        IndexError: If a list index is out of range.
        ValueError: If traversal is not possible.
    """
    keys = path.split(".")
    current: Any = obj
    for key in keys:
        if isinstance(current, dict):
            if key not in current:
                raise KeyError(f"Key '{key}' not found in path '{path}'")
            current = current[key]
        elif isinstance(current, list):
            idx = int(key)
            if idx < 0 or idx >= len(current):
                raise IndexError(f"Index {idx} out of range in path '{path}'")
            current = current[idx]
        else:
            raise ValueError(f"Cannot traverse '{key}' in path '{path}'")
    return current


def _set_nested_value(obj: dict[str, Any], path: str, value: Any) -> Any:
    """Set a value in a nested dict using dot notation.

    Args:
        obj: The root dictionary to modify.
        path: Dot-separated path (e.g., "anima_composer.layers.0.x").
        value: The new value to set.

    Returns:
        The old value that was replaced.

    Raises:
        KeyError: If a dict key is not found.
        IndexError: If a list index is out of range.
        ValueError: If traversal is not possible.
    """
    keys = path.split(".")
    current: Any = obj
    for key in keys[:-1]:
        if isinstance(current, dict):
            if key not in current:
                raise KeyError(f"Key '{key}' not found in path '{path}'")
            current = current[key]
        elif isinstance(current, list):
            idx = int(key)
            if idx < 0 or idx >= len(current):
                raise IndexError(f"Index {idx} out of range in path '{path}'")
            current = current[idx]
        else:
            raise ValueError(f"Cannot traverse '{key}' in path '{path}'")

    final_key = keys[-1]
    if isinstance(current, dict):
        old_value = current.get(final_key)
        current[final_key] = value
        return old_value
    elif isinstance(current, list):
        idx = int(final_key)
        old_value = current[idx]
        current[idx] = value
        return old_value
    else:
        raise ValueError(f"Cannot set value at path '{path}'")


def apply_manual_changes(
    scene_spec: dict[str, Any],
    changes: list[dict[str, Any]],
) -> dict[str, Any]:
    """Apply manual field changes to a scene spec.

    Args:
        scene_spec: The current scene spec dictionary.
        changes: List of {"field_path": str, "value": Any}.

    Returns:
        Updated scene spec dict (mutated in place).

    Raises:
        KeyError: If a field path key is not found.
        IndexError: If a list index is out of range.
        ValueError: If a path cannot be traversed.
    """
    applied: list[FieldChange] = []
    for change in changes:
        field_path = change["field_path"]
        new_value = change["value"]
        try:
            old_value = _set_nested_value(scene_spec, field_path, new_value)
            applied.append(FieldChange(field_path, old_value, new_value))
        except (KeyError, IndexError, ValueError) as e:
            logger.warning("Failed to apply change at '%s': %s", field_path, e)
            raise

    logger.info("Applied %d manual changes to scene", len(applied))
    return scene_spec


async def apply_conversational_changes(
    scene_spec: dict[str, Any],
    prompt: str,
    llm_client: Any = None,  # noqa: ANN401
) -> tuple[dict[str, Any], str]:
    """Use LLM to parse natural language prompt and apply changes to scene spec.

    Args:
        scene_spec: The current scene spec dictionary.
        prompt: User's natural language request.
        llm_client: Optional LLM client (uses default if not provided).

    Returns:
        Tuple of (updated scene spec dict, explanation string).

    Raises:
        RuntimeError: If the LLM service is not available.
        ValueError: If the LLM response is malformed.
    """
    system_prompt = (
        "You are a JSON editor for video animation scenes. "
        "Given a user prompt and the current scene spec, return ONLY the field "
        "paths and new values to apply.\n\n"
        "Rules:\n"
        "- Only modify fields that exist in the current spec\n"
        "- Return valid JSON with 'changes' array and 'explanation' string\n"
        '- field_path uses dot notation: "anima_composer.layers.0.x"\n'
        "- For colors, use hex format (#RRGGBB)\n"
        "- For positions, use pixel values (0-1920 for x, 0-1080 for y in 1080p)\n"
        "- For scale, use 0.1-3.0\n"
        "- For rotation, use degrees (0-360)\n"
        "- For entry/exit animations, use exact enum values from the spec\n"
        "- For fontSize, use 24-120\n"
        "- For opacity, use 0.0-1.0\n"
        "- For entryDelay/exitDelay, use seconds (0-10)\n"
        "- For entryDuration/exitDuration, use frames (10-90)\n\n"
        "Editable fields in anima_composer.layers[N]:\n"
        "- x, y, scale, rotation, opacity\n"
        "- fill, stroke, strokeWidth\n"
        "- entry, exit, entryDelay, entryDuration, exitDuration\n"
        "- fontSize, fontWeight, letterSpacing\n"
        "- width, height, borderRadius\n"
        "- r (for circles)\n\n"
        "Response format (JSON only):\n"
        "{\n"
        '  "changes": [\n'
        '    {"field_path": "anima_composer.layers.0.x", "value": 650}\n'
        "  ],\n"
        '  "explanation": "Brief explanation in Spanish of what was changed"\n'
        "}"
    )

    user_message = (
        f"Current scene spec:\n{json.dumps(scene_spec, indent=2)}\n\n"
        f'User request: "{prompt}"\n\n'
        "Return ONLY valid JSON with the changes to apply."
    )

    try:
        from app.services.llm_service import generate_json

        llm_response = await generate_json(
            system_prompt=system_prompt,
            user_message=user_message,
            temperature=0.1,
        )

        if not llm_response or "changes" not in llm_response:
            raise ValueError("LLM response missing 'changes' field")

        changes: list[dict[str, Any]] = llm_response["changes"]
        explanation: str = llm_response.get("explanation", "")

        applied_count = 0
        for change in changes:
            field_path = change["field_path"]
            new_value = change["value"]
            try:
                _set_nested_value(scene_spec, field_path, new_value)
                applied_count += 1
            except (KeyError, IndexError, ValueError) as e:
                logger.warning(
                    "LLM suggested invalid path '%s': %s", field_path, e
                )
                continue

        logger.info(
            "Applied %d conversational changes: %s", applied_count, explanation
        )
        return scene_spec, explanation

    except ImportError:
        logger.error("LLM service not available for conversational editing")
        raise RuntimeError(
            "LLM service not configured. Use manual editing mode instead."
        )
    except Exception as e:
        logger.error("Conversational editing failed: %s", e)
        raise


_VALID_ENTRY_ANIMATIONS: list[str | None] = [
    "fade-in",
    "slide-up",
    "slide-down",
    "slide-left",
    "slide-right",
    "scale-in",
    "spring-in",
    "bounce-in",
    None,
]

_VALID_EXIT_ANIMATIONS: list[str | None] = [
    "fade-out",
    "slide-up-out",
    "slide-down-out",
    "slide-left-out",
    "slide-right-out",
    "scale-out",
    "spring-out",
    "bounce-out",
    None,
]


def validate_scene_spec(scene_spec: dict[str, Any]) -> list[str]:
    """Basic validation of scene spec after edits.

    Args:
        scene_spec: The scene spec dictionary to validate.

    Returns:
        List of warning strings (empty if valid).
    """
    warnings: list[str] = []

    if "anima_composer" not in scene_spec:
        return warnings

    composer = scene_spec["anima_composer"]

    if "layers" not in composer:
        return warnings

    for i, layer in enumerate(composer["layers"]):
        entry = layer.get("entry")
        if entry not in _VALID_ENTRY_ANIMATIONS:
            warnings.append(f"Layer {i}: invalid entry animation '{entry}'")

        exit_anim = layer.get("exit")
        if exit_anim not in _VALID_EXIT_ANIMATIONS:
            warnings.append(f"Layer {i}: invalid exit animation '{exit_anim}'")

        scale = layer.get("scale")
        if scale is not None and (scale < 0.1 or scale > 3.0):
            warnings.append(f"Layer {i}: scale {scale} out of range [0.1, 3.0]")

        rotation = layer.get("rotation")
        if rotation is not None and (rotation < 0 or rotation > 360):
            warnings.append(
                f"Layer {i}: rotation {rotation} out of range [0, 360]"
            )

        opacity = layer.get("opacity")
        if opacity is not None and (opacity < 0.0 or opacity > 1.0):
            warnings.append(
                f"Layer {i}: opacity {opacity} out of range [0.0, 1.0]"
            )

    return warnings
