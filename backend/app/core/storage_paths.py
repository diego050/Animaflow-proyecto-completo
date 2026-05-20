"""
Robust storage path resolution for AnimaFlow.

Usage:
    from app.core.storage_paths import get_storage_dir

    audio_dir = get_storage_dir("audio")
    assets_dir = get_storage_dir("assets")
    videos_dir = get_storage_dir("videos")

Environment:
    STORAGE_BASE_DIR -- overrides auto-detection (set to /app in Docker)
"""
import os


def _resolve_storage_base() -> str:
    """Find the project root directory containing the storage/ folder."""
    if base := os.environ.get("STORAGE_BASE_DIR"):
        return os.path.abspath(base)

    # Anchor from this file (app/core/storage_paths.py)
    core_dir = os.path.dirname(os.path.abspath(__file__))

    # Local dev: backend/app/core -> backend -> repo root (3 levels)
    candidate = os.path.abspath(os.path.join(core_dir, "..", "..", ".."))
    if os.path.isdir(os.path.join(candidate, "backend")) and os.path.isdir(
        os.path.join(candidate, "frontend")
    ):
        return candidate

    # Docker fallback without env var: /app/app/core -> /app (2 levels)
    candidate = os.path.abspath(os.path.join(core_dir, "..", ".."))
    if os.path.isdir(os.path.join(candidate, "app")):
        return candidate

    raise RuntimeError(
        "Cannot determine storage base directory. "
        "Please set STORAGE_BASE_DIR environment variable."
    )


STORAGE_BASE = _resolve_storage_base()


def get_storage_dir(subdir: str = "") -> str:
    """Return absolute path to a storage subdirectory, creating it if needed."""
    path = os.path.join(STORAGE_BASE, "storage", subdir)
    os.makedirs(path, exist_ok=True)
    return path
