"""Component manifest loader — single source of truth for component metadata.

Reads component_manifest.json and provides helper functions for the backend
to query component names, props, roles, and categories.

This module bridges the frontend manifest (TypeScript) with the Python backend.
If the manifest and AVAILABLE_COMPONENTS diverge, the manifest wins.
"""
import json
import os
from typing import Optional

_MANIFEST_PATH = os.path.join(os.path.dirname(__file__), "component_manifest.json")
_manifest_cache: Optional[dict] = None


def _load_manifest() -> dict:
    """Load and cache the component manifest JSON."""
    global _manifest_cache
    if _manifest_cache is None:
        with open(_MANIFEST_PATH, "r", encoding="utf-8") as f:
            _manifest_cache = json.load(f)
    return _manifest_cache


def get_component_names() -> list[str]:
    """Return list of all valid component names from the manifest."""
    return [c["name"] for c in _load_manifest()["components"]]


def get_component(name: str) -> Optional[dict]:
    """Get manifest entry for a component by name.

    Returns None if the component is not found.
    """
    for c in _load_manifest()["components"]:
        if c["name"] == name:
            return c
    return None


def get_props_schema(name: str) -> dict:
    """Get the props schema for a component.

    Returns a dict of {prop_name: prop_definition} or empty dict if not found.
    """
    comp = get_component(name)
    return comp.get("props", {}) if comp else {}


def get_components_by_role(role: str) -> list[dict]:
    """Get all components with a specific role."""
    return [c for c in _load_manifest()["components"] if c.get("role") == role]


def get_components_by_category(category: str) -> list[dict]:
    """Get all components in a specific category."""
    return [c for c in _load_manifest()["components"] if c.get("category") == category]


def get_all_categories() -> list[str]:
    """Return sorted list of unique categories."""
    return sorted({c.get("category", "Unknown") for c in _load_manifest()["components"]})


def get_all_roles() -> list[str]:
    """Return sorted list of unique roles."""
    return sorted({c.get("role", "unknown") for c in _load_manifest()["components"]})


def count_components() -> int:
    """Return total number of components in the manifest."""
    return len(_load_manifest()["components"])
