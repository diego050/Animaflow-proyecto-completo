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


_DEDUP_DEFAULT = 0.06  # distancia coseno mínima a la más cercana aprobada (menor = más parecida)


def _nearest_distance(db, emb) -> Optional[float]:
    """Distancia coseno al ejemplo APROBADO más cercano (None si el pool está vacío)."""
    return (
        db.query(GeneratedAnimation.embedding.cosine_distance(emb))
        .filter(GeneratedAnimation.approved.is_(True), GeneratedAnimation.embedding.isnot(None))
        .order_by(GeneratedAnimation.embedding.cosine_distance(emb))
        .limit(1)
        .scalar()
    )


def add_to_flywheel(
    code: str, prompt_text: str, user_id: Optional[str] = None, aspect_ratio: Optional[str] = None,
) -> dict:
    """Curación MANUAL (botón ⭐ "marcar como buena"): guarda la animación como ejemplo aprobado +
    embebido del flywheel, con GUARD DE DIVERSIDAD — si ya hay una aprobada muy parecida, NO la
    agrega (evita el pool repetitivo / el espiral de lo mismo). Devuelve {added, reason}."""
    from app.services.settings_store import get_setting

    if not code or not (prompt_text or "").strip():
        return {"added": False, "reason": "falta código o descripción para curar"}
    api_key = _resolve_gemini_key(user_id)
    emb = generate_embedding(prompt_text, api_key=api_key)
    if not emb:
        return {"added": False, "reason": "no se pudo generar el embedding (revisa la API key de Gemini)"}
    dedup = float(get_setting("flywheel.dedup_distance", _DEDUP_DEFAULT))
    try:
        with get_db_context() as db:
            d = _nearest_distance(db, emb)
            if d is not None and d < dedup:
                return {"added": False, "reason": "ya hay una muy parecida en el flywheel (diversidad)"}
            db.add(GeneratedAnimation(
                user_id=user_id, source="curated", prompt_text=prompt_text[:5000] or None,
                code=code, model=None, valid=True, status="curated", approved=True,
                embedding=emb, aspect_ratio=aspect_ratio,
            ))
            db.commit()
        logger.info("Flywheel: animación curada manualmente (⭐) agregada.")
        return {"added": True, "reason": "Guardada en el flywheel ⭐"}
    except Exception as e:  # noqa: BLE001
        logger.warning("add_to_flywheel falló: %s", e)
        return {"added": False, "reason": "error guardando en el flywheel"}


def approve_and_embed_job(job_id: str, scenes: list, user_id: Optional[str] = None) -> None:
    """El video se renderizó → aprobar + embeber sus escenas code-gen (no los fallbacks)."""
    try:
        from app.services.settings_store import get_setting
        dedup = float(get_setting("flywheel.dedup_distance", _DEDUP_DEFAULT))
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
                        d = _nearest_distance(db, emb)
                        if d is None or d >= dedup:  # solo embeber si aporta diversidad
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
        # RETRIEVAL apagado por defecto: el flywheel RECOLECTA/CURA ahora, pero NO alimenta a la IA
        # hasta que se active `flywheel.retrieval_enabled` (cuando haya cantidad/calidad suficiente).
        if not get_setting("flywheel.retrieval_enabled", False):
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
