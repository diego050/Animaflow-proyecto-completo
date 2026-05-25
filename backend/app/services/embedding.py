"""Component embedding service for semantic search using Gemini Embeddings."""
import os
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import ComponentModel
from app.core.logging import get_logger

logger = get_logger("embedding")

GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"


def generate_embedding(text: str, api_key: Optional[str] = None) -> Optional[list[float]]:
    """Generate Gemini embedding for component metadata.
    
    Uses gemini-embedding-001 which is free and supports text embeddings.
    """
    api_key = api_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set. Skipping embedding generation.")
        return None
    
    try:
        from google import genai
        from google.genai import types
        
        client = genai.Client(api_key=api_key)
        response = client.models.embed_content(
            model=GEMINI_EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
            ),
        )
        
        if response.embeddings:
            return response.embeddings[0].values
        return None
        
    except Exception as e:
        logger.error("Failed to generate Gemini embedding: %s", e)
        return None


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    import math
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _format_component(comp: ComponentModel) -> dict:
    """Format a component for the prompt."""
    return {
        "name": comp.name,
        "role": comp.role,
        "category": comp.category,
        "description": comp.description,
    }


def get_relevant_components(
    db: Session,
    scene_text: str,
    media_query: str,
    top_k: int = 10,
    category_filter: Optional[str] = None,
) -> list[dict]:
    """Find components with role diversity and return structured data."""
    query_text = f"{scene_text}. Visual context: {media_query}"
    query_embedding = generate_embedding(query_text)

    if query_embedding is None:
        # Fallback: return random active components
        logger.warning("No embedding available. Falling back to random selection.")
        query = db.query(ComponentModel).filter(ComponentModel.is_active == True)
        if category_filter:
            query = query.filter(ComponentModel.category == category_filter)
        components = query.limit(top_k).all()
        return [_format_component(c) for c in components]

    # Define diversity quotas
    quotas = {
        "background": 2,
        "text": 2,
        "decorative": 2,
        "dataviz": 1,
        "social": 1,
        "ui": 1,
        "transition": 1,
    }

    selected = []
    seen_ids = set()

    # 1. Fill quotas per role
    for role, count in quotas.items():
        if len(selected) >= top_k:
            break

        # Query components for this role with embeddings
        role_query = db.query(ComponentModel).filter(
            ComponentModel.is_active == True,
            ComponentModel.role == role,
            ComponentModel.embedding.isnot(None),
        )
        if category_filter:
            role_query = role_query.filter(ComponentModel.category == category_filter)

        role_components = role_query.all()

        # Score and sort
        scored = []
        for comp in role_components:
            if comp.id in seen_ids:
                continue
            sim = cosine_similarity(query_embedding, comp.embedding)
            scored.append((sim, comp))

        scored.sort(key=lambda x: x[0], reverse=True)

        # Take top 'count' for this role
        for sim, comp in scored[:count]:
            if len(selected) >= top_k:
                break
            selected.append(_format_component(comp))
            seen_ids.add(comp.id)

    # 2. Fill remaining slots with general best matches
    if len(selected) < top_k:
        remaining = top_k - len(selected)

        general_query = db.query(ComponentModel).filter(
            ComponentModel.is_active == True,
            ComponentModel.embedding.isnot(None),
        )
        if seen_ids:
            general_query = general_query.filter(~ComponentModel.id.in_(seen_ids))
        if category_filter:
            general_query = general_query.filter(ComponentModel.category == category_filter)

        all_components = general_query.all()

        scored = []
        for comp in all_components:
            sim = cosine_similarity(query_embedding, comp.embedding)
            scored.append((sim, comp))

        scored.sort(key=lambda x: x[0], reverse=True)

        for sim, comp in scored[:remaining]:
            selected.append(_format_component(comp))
            seen_ids.add(comp.id)

    return selected
