"""Flywheel de ejemplos code-gen.

- **Curación + embedding:** cuando un video se RENDERIZA (el usuario lo aceptó), sus escenas
  code-gen se marcan `approved` y se embeben → entran al pool de few-shot.
- **Retrieval:** al generar una escena nueva, se recuperan 2-3 ejemplos aprobados PARECIDOS
  (cosine sobre el embedding) y se inyectan como few-shot. Mejora la calidad con el tiempo,
  incluso con modelos baratos. Todo best-effort: nunca rompe la generación ni el render.
"""
from typing import Optional

from app.db.session import get_db_context
from app.db.models import GeneratedAnimation
from app.services.embedding import generate_embedding
from app.core.logging import get_logger

logger = get_logger("flywheel")


def _resolve_gemini_key(user_id: Optional[str]) -> Optional[str]:
    """Key de Gemini para embeddings (del usuario, o None → el SDK usa GEMINI_API_KEY del env)."""
    try:
        from app.modules.llm.resolver import resolve_llm_credentials
        creds = resolve_llm_credentials(user_id, provider_override="gemini")
        return creds.api_key
    except Exception:  # noqa: BLE001
        return None


def _text_for(prompt_text: Optional[str], art_direction: Optional[str]) -> str:
    return " ".join(p for p in [prompt_text, art_direction] if p).strip()


def approve_and_embed_job(job_id: str, scenes: list, user_id: Optional[str] = None) -> None:
    """El video se renderizó → aprobar + embeber sus escenas code-gen (no los fallbacks)."""
    try:
        api_key = _resolve_gemini_key(user_id)
        with get_db_context() as db:
            approved = 0
            for i, scene in enumerate(scenes or []):
                if not scene.get("custom_code"):
                    continue
                rec = (
                    db.query(GeneratedAnimation)
                    .filter(
                        GeneratedAnimation.job_id == job_id,
                        GeneratedAnimation.scene_index == i,
                    )
                    .order_by(GeneratedAnimation.created_at.desc())
                    .first()
                )
                if not rec or rec.status == "fallback":
                    continue  # no aprobar fallbacks (no son buenos ejemplos)
                rec.approved = True
                if rec.embedding is None:
                    text = _text_for(rec.prompt_text, rec.art_direction)
                    emb = generate_embedding(text, api_key=api_key) if text else None
                    if emb:
                        rec.embedding = emb
                approved += 1
            db.commit()
        logger.info("Flywheel: %d escenas aprobadas+embebidas del job %s", approved, job_id)
    except Exception as e:  # noqa: BLE001
        logger.warning("Flywheel approve/embed falló (best-effort) job %s: %s", job_id, e)


def get_flywheel_examples(
    prompt_text: Optional[str],
    art_direction: Optional[str] = None,
    k: int = 2,
    api_key: Optional[str] = None,
) -> list[str]:
    """Hasta k ejemplos APROBADOS parecidos (su código TSX), por cercanía coseno. Best-effort."""
    try:
        from app.services.settings_store import get_setting
        if not get_setting("flywheel.enabled", True):
            return []
        text = _text_for(prompt_text, art_direction)
        if not text:
            return []
        # Guard barato: si el pool de aprobados está vacío, NO gastar la llamada de embedding.
        with get_db_context() as db:
            has_any = (
                db.query(GeneratedAnimation.id)
                .filter(
                    GeneratedAnimation.approved.is_(True),
                    GeneratedAnimation.embedding.isnot(None),
                )
                .first()
            )
        if not has_any:
            return []
        q = generate_embedding(text, api_key=api_key)
        if not q:
            return []
        with get_db_context() as db:
            rows = (
                db.query(GeneratedAnimation)
                .filter(
                    GeneratedAnimation.approved.is_(True),
                    GeneratedAnimation.embedding.isnot(None),
                )
                .order_by(GeneratedAnimation.embedding.cosine_distance(q))
                .limit(k)
                .all()
            )
            return [r.code for r in rows if r.code]
    except Exception as e:  # noqa: BLE001
        logger.warning("Flywheel retrieval falló (best-effort): %s", e)
        return []
