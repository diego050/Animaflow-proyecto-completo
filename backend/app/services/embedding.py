"""Component embedding service for semantic search using Gemini Embeddings."""
import hashlib
import math
import os
import random
import time
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import exc
from app.db.models import ComponentModel
from app.core.logging import get_logger

logger = get_logger("embedding")

GEMINI_EMBEDDING_MODEL = "gemini-embedding-2"


def generate_embedding(text: str, api_key: Optional[str] = None) -> Optional[list[float]]:
    """Generate Gemini embedding for component metadata.
    
    Uses gemini-embedding-2 with output_dimensionality=768 for compatibility
    with pgvector tables populated by all-mpnet-base-v2.
    """
    api_key = api_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set. Skipping embedding generation.")
        return None
    
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        # v7.2: reintento con backoff ante 429 (rate limit por ráfaga).
        last_err: Optional[Exception] = None
        for attempt in range(3):
            try:
                response = client.models.embed_content(
                    model=GEMINI_EMBEDDING_MODEL,
                    contents=text,
                    config=types.EmbedContentConfig(
                        # Compartida por queries y por scripts que pueblan docs;
                        # se mantiene RETRIEVAL_DOCUMENT para no desincronizar.
                        task_type="RETRIEVAL_DOCUMENT",
                        output_dimensionality=768,
                    ),
                )
                if response.embeddings:
                    return response.embeddings[0].values
                return None
            except Exception as e:  # noqa: BLE001
                last_err = e
                msg = str(e)
                if ("429" in msg or "RESOURCE_EXHAUSTED" in msg) and attempt < 2:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                break

        logger.error("Failed to generate Gemini embedding: %s", last_err)
        return None

    except Exception as e:
        logger.error("Failed to generate Gemini embedding: %s", e)
        return None


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if len(a) == 0 or len(b) == 0:
        return 0.0
    # Convert to list if numpy array
    if hasattr(a, 'tolist'):
        a = a.tolist()
    if hasattr(b, 'tolist'):
        b = b.tolist()
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _format_component(comp: ComponentModel) -> dict:
    """Format a component for the prompt, including props schema."""
    props_schema = comp.props_schema or {}

    # Build a concise props description for the LLM
    props_info = []
    for prop_name, prop_def in props_schema.items():
        if isinstance(prop_def, dict):
            prop_type = prop_def.get("type", "string")
            prop_default = prop_def.get("default", "")
            prop_enum = prop_def.get("enum", None)

            if prop_enum:
                props_info.append(f"{prop_name}: {prop_type} ({', '.join(str(v) for v in prop_enum)})")
            elif prop_default:
                props_info.append(f"{prop_name}: {prop_type} (default: {prop_default})")
            else:
                props_info.append(f"{prop_name}: {prop_type}")
        else:
            props_info.append(f"{prop_name}: {type(prop_def).__name__}")

    return {
        "name": comp.name,
        "role": comp.role,
        "category": comp.category,
        "description": comp.description,
        "props": ", ".join(props_info) if props_info else "none required",
    }


# Piso mínimo garantizado por rol (para que la IA SIEMPRE pueda componer) y tope
# por rol (para que ningún rol acapare el shortlist, ni siquiera en escenas sesgadas).
_ROLE_FLOORS = {"background": 1, "text": 2, "ui": 2, "decorative": 1, "dataviz": 0, "social": 0, "general": 0}
_ROLE_CAPS = {"background": 3, "text": 6, "ui": 12, "decorative": 6, "dataviz": 8, "social": 4, "general": 2}


def _mmr_select(scored, k, rng, lambda_=0.7, explore_pool=3):
    """Selección MMR (relevancia − redundancia) con exploración sembrada.

    `scored`: lista [(sim, comp)] desc por similitud. Evita elegir componentes casi
    idénticos entre sí (diversidad) y, entre los casi-empatados, elige con `rng`
    (semilla por video) para que no salgan SIEMPRE los mismos.
    """
    if k <= 0 or not scored:
        return []
    pool = list(scored[: max(k * 4, k + 12)])  # acotar para velocidad
    selected = []
    chosen_embs = []
    while len(selected) < k and pool:
        ranked = []
        for sim, comp in pool:
            if chosen_embs:
                redundancy = max(cosine_similarity(comp.embedding, e) for e in chosen_embs)
            else:
                redundancy = 0.0
            mmr = lambda_ * sim - (1.0 - lambda_) * redundancy
            ranked.append((mmr, comp))
        ranked.sort(key=lambda x: x[0], reverse=True)
        # Exploración: elegir entre los mejores `explore_pool` con la semilla.
        candidate_pool = ranked[:explore_pool]
        _, comp = rng.choice(candidate_pool)
        selected.append(comp)
        chosen_embs.append(comp.embedding)
        pool = [(s, c) for s, c in pool if c.id != comp.id]
    return selected


def get_relevant_components(
    db: Session,
    scene_text: str,
    media_query: str,
    top_k: int = 10,
    category_filter: Optional[str] = None,
    api_key: Optional[str] = None,
    seed: Optional[str] = None,
) -> list[dict]:
    """Find components with role diversity and return structured data.

    Estrategia (escala a cientos/miles sin repetir siempre "los mejores"):
      1. Cupos BLANDOS adaptativos: los slots se reparten proporcional a qué tan
         relevante es cada rol para ESTA escena (no un split fijo), con un piso
         mínimo por rol esencial y un tope por rol.
      2. MMR: dentro de cada rol se evita elegir componentes casi idénticos.
      3. Exploración: `seed` (p.ej. job_id) → determinista dentro de un video pero
         distinto entre videos, para que roten los componentes buenos.
    """
    # Query enriquecido: enmarca la escena hacia el dominio de los componentes
    # (las descripciones describen QUÉ es y para qué sirve cada componente, así que
    # el query debe describir QUÉ necesita la escena), mejorando el match.
    query_text = (
        f"Scene narration: {scene_text}. "
        f"Visual idea: {media_query}. "
        f"On-screen components, visuals and animations that fit this scene."
    )
    query_embedding = generate_embedding(query_text, api_key=api_key)

    if query_embedding is None:
        # v7.2: fallback CURADO (no aleatorio). Si el embedding falla (cuota 429,
        # sin API key, etc.) devolvemos una paleta coherente y usable en vez de
        # componentes al azar que producen composiciones absurdas
        # (p.ej. HighlightText en un párrafo). Se loguea fuerte para detectarlo.
        logger.warning(
            "No embedding available (quota/error). Using CURATED fallback set "
            "instead of random selection — check GEMINI quota / API key."
        )
        CURATED = [
            "StyleTextBlock", "IconifyIcon", "KineticBackground", "ParticleField",
            "StyleBadge", "StyleButton", "StyleCard", "StyleDivider",
        ]
        query = db.query(ComponentModel).filter(
            ComponentModel.is_active.is_(True),
            ComponentModel.name.in_(CURATED),
        )
        components = query.all()
        if not components:
            # Último recurso: lo que haya, para no romper el pipeline.
            components = db.query(ComponentModel).filter(
                ComponentModel.is_active.is_(True)
            ).limit(top_k).all()
        return [_format_component(c) for c in components]

    # ── Carga única de candidatos (activos, con embedding), agrupados por rol.
    base_query = db.query(ComponentModel).filter(
        ComponentModel.is_active.is_(True),
        ComponentModel.embedding.isnot(None),
    )
    if category_filter:
        base_query = base_query.filter(ComponentModel.category == category_filter)
    try:
        all_components = base_query.all()
    except exc.InternalError:
        logger.warning("Transaction aborted during component query, rolling back.")
        db.rollback()
        return []
    if not all_components:
        return []

    by_role: dict[str, list] = {}
    for comp in all_components:
        sim = cosine_similarity(query_embedding, comp.embedding)
        by_role.setdefault(comp.role or "general", []).append((sim, comp))
    for role in by_role:
        by_role[role].sort(key=lambda x: x[0], reverse=True)

    # Relevancia de cada rol para ESTA escena = media de sus 3 mejores similitudes.
    # Al cuadrado para acentuar los roles realmente pertinentes.
    def _role_relevance(scored):
        top = [s for s, _ in scored[:3]]
        return (sum(top) / len(top)) if top else 0.0
    weights = {r: max(0.0, _role_relevance(s)) ** 2 for r, s in by_role.items()}

    # ── Asignación BLANDA: piso mínimo + reparto proporcional greedy (respeta tope
    # por rol y stock disponible). Adapta el shortlist a lo que pide la escena.
    alloc = {r: min(_ROLE_FLOORS.get(r, 0), len(by_role[r])) for r in by_role}
    remaining = max(0, top_k - sum(alloc.values()))
    while remaining > 0:
        best_role, best_score = None, -1.0
        for r in by_role:
            cap = min(_ROLE_CAPS.get(r, top_k), len(by_role[r]))
            if alloc[r] >= cap:
                continue
            score = weights[r] / (alloc[r] + 1)  # favorece relevantes y sub-asignados
            if score > best_score:
                best_score, best_role = score, r
        if best_role is None:
            break
        alloc[best_role] += 1
        remaining -= 1

    # Semilla por video: determinista dentro del video, distinta entre videos.
    effective_seed = seed if seed is not None else f"{scene_text}|{media_query}"
    rng = random.Random(int(hashlib.md5(str(effective_seed).encode("utf-8")).hexdigest(), 16) % (2 ** 32))

    # ── Selección MMR por rol (diversidad + exploración sembrada).
    selected_comps = []
    seen_ids = set()
    role_order = ["background", "text", "ui", "decorative", "dataviz", "social", "general"]
    for role in role_order + [r for r in by_role if r not in role_order]:
        if alloc.get(role, 0) <= 0:
            continue
        for comp in _mmr_select(by_role[role], alloc[role], rng):
            if comp.id not in seen_ids:
                selected_comps.append(comp)
                seen_ids.add(comp.id)

    # Relleno final si quedaron slots libres (por topes/stock): mejores globales.
    if len(selected_comps) < top_k:
        leftover = [(s, c) for scored in by_role.values() for (s, c) in scored if c.id not in seen_ids]
        leftover.sort(key=lambda x: x[0], reverse=True)
        for comp in _mmr_select(leftover, top_k - len(selected_comps), rng):
            if comp.id not in seen_ids:
                selected_comps.append(comp)
                seen_ids.add(comp.id)

    logger.info(
        "Retriever: %d componentes (alloc=%s, seed=%s)",
        len(selected_comps),
        {r: a for r, a in alloc.items() if a},
        "video" if seed is not None else "prompt",
    )
    return [_format_component(c) for c in selected_comps]
