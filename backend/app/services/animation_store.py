"""Persistencia de animaciones code-gen generadas (flywheel + observabilidad).

Guarda cada generación en `generated_animations`. Best-effort: NUNCA rompe la generación
si el guardado falla. El embedding (para el flywheel RAG) se llena en un paso de curación
aparte; aquí solo se guarda el código + metadata + tokens.
"""
from typing import Optional

from app.db.session import get_db_context
from app.db.models import GeneratedAnimation
from app.core.logging import get_logger

logger = get_logger("animation_store")


def save_generated_animation(
    *,
    code: str,
    source: str,                       # pipeline | prototype | edit | regenerate
    job_id: Optional[str] = None,
    scene_index: Optional[int] = None,
    user_id: Optional[str] = None,
    prompt_text: Optional[str] = None,
    art_direction: Optional[str] = None,
    model: Optional[str] = None,
    valid: bool = True,
    status: Optional[str] = None,       # passed | fallback | edited
    tokens: Optional[dict] = None,
    duration_frames: Optional[int] = None,
    aspect_ratio: Optional[str] = None,
) -> None:
    if not code:
        return
    tokens = tokens or {}
    try:
        with get_db_context() as db:
            db.add(GeneratedAnimation(
                job_id=job_id,
                scene_index=scene_index,
                user_id=user_id,
                source=source,
                prompt_text=(prompt_text or "")[:5000] or None,
                art_direction=(art_direction or "")[:5000] or None,
                code=code,
                model=model,
                valid=valid,
                status=status,
                tokens_in=tokens.get("in"),
                tokens_out=tokens.get("out"),
                tokens_total=tokens.get("total"),
                duration_frames=duration_frames,
                aspect_ratio=aspect_ratio,
            ))
            db.commit()
    except Exception as e:  # noqa: BLE001 — best-effort, no romper la generación
        logger.warning("No se pudo guardar la generación (best-effort): %s", e)
