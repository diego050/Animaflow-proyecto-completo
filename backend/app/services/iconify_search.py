"""Iconify semantic search service using pgvector embeddings."""
import os
import re
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import IconifyIcon
from app.core.logging import get_logger

logger = get_logger("iconify_search")

# Patrones de íconos "basura" que la búsqueda semántica trae por coincidencia
# literal de caracteres (no de concepto): megapíxeles de cámara (10mp, 12mp),
# resoluciones (4k, 1080p, 16x9) y nombres puramente numéricos (counters). Son la
# causa de match absurdos tipo "diez minutos" → "10mp-outline".
_JUNK_ICON_NAME = re.compile(
    r"(^|[-_])(\d+mp|\d+k|\d+p|\d+x\d+|\d+)([-_]|$)",
    re.IGNORECASE,
)


def _is_junk_icon(name: str) -> bool:
    return bool(_JUNK_ICON_NAME.search(name or ""))


def generate_icon_embedding(text: str, api_key: Optional[str] = None) -> Optional[list[float]]:
    """Generate Gemini embedding for search query."""
    api_key = api_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set for icon search.")
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        response = client.models.embed_content(
            model="gemini-embedding-2",
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=768,
            ),
        )

        if response.embeddings:
            embedding = response.embeddings[0].values
            return embedding
        return None
    except Exception as e:
        logger.error("Failed to generate icon search embedding: %s", e)
        return None


def find_best_icons(
    db: Session,
    query_text: str,
    limit: int = 5,
    api_key: Optional[str] = None,
) -> list[dict]:
    """
    Find the most semantically relevant icons for a query.

    query_text: "un corazon latiendo en un monitor medico"
    returns: [
        {"full_id": "mdi:ecg-heart", "prefix": "mdi", "name": "ecg-heart", "score": 0.92},
        ...
    ]
    """
    if db is None:
        return []

    query_embedding = generate_icon_embedding(query_text, api_key=api_key)

    if query_embedding is None:
        # Fallback: return some default icons
        logger.warning("No embedding for icon search. Returning defaults.")
        return [
            {"full_id": "mdi:help-circle", "prefix": "mdi", "name": "help-circle", "score": 0.0},
        ]

    try:
        # v7.1: usar distancia COSENO (<=>), que es la métrica del índice HNSW
        # (vector_cosine_ops). Antes se usaba <-> (L2/euclidiana), que ni usa el
        # índice ni da el ranking correcto → scores negativos y resultados
        # irrelevantes (p.ej. "batería sin energía" → "wifi-cog").
        # Con coseno, score = 1 - distancia ∈ [~0, 1] (mayor = más relevante).
        from sqlalchemy import text

        # Convert embedding list to string for SQL
        embedding_str = f"[{','.join(str(v) for v in query_embedding)}]"

        # Sobre-pedimos para poder descartar candidatos basura y aun así devolver
        # `limit` íconos útiles.
        sql = text("""
            SELECT full_id, prefix, name,
                   1 - (embedding <=> CAST(:embedding AS vector)) as score
            FROM iconify_icons
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
        """)

        results = db.execute(sql, {"embedding": embedding_str, "limit": limit * 4}).fetchall()

        out: list[dict] = []
        for row in results:
            if _is_junk_icon(row.name):
                continue
            out.append({
                "full_id": row.full_id,
                "prefix": row.prefix,
                "name": row.name,
                "score": round(row.score, 3),
            })
            if len(out) >= limit:
                break
        return out
    except Exception as e:
        error_msg = str(e)
        if "different vector dimensions" in error_msg:
            logger.warning(
                "Icon embedding dimension mismatch (query: %d dims vs table: 768 dims). "
                "The iconify_icons table needs to be re-embedded with the current model.",
                len(query_embedding),
            )
        else:
            logger.error("Icon search failed: %s", e)
        try:
            db.rollback()
        except Exception:
            pass
        return []
