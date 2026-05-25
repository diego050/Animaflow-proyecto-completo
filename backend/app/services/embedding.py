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


def get_relevant_components(
    db: Session,
    scene_text: str,
    media_query: str,
    top_k: int = 10,
    category_filter: Optional[str] = None,
) -> list[ComponentModel]:
    """Find components most relevant to a scene using embedding similarity."""
    query_text = f"{scene_text}. Visual context: {media_query}"
    query_embedding = generate_embedding(query_text)
    
    if query_embedding is None:
        logger.warning("No embedding available. Falling back to category filter.")
        query = db.query(ComponentModel).filter(ComponentModel.is_active == True)
        if category_filter:
            query = query.filter(ComponentModel.category == category_filter)
        return query.limit(top_k).all()
    
    # Load all active components with embeddings
    query = db.query(ComponentModel).filter(
        ComponentModel.is_active == True,
        ComponentModel.embedding.isnot(None),
    )
    if category_filter:
        query = query.filter(ComponentModel.category == category_filter)
    
    components = query.all()
    
    if not components:
        return db.query(ComponentModel).filter(
            ComponentModel.is_active == True
        ).limit(top_k).all()
    
    # Compute similarity in Python (fine for <1000 components)
    scored = []
    for comp in components:
        sim = cosine_similarity(query_embedding, comp.embedding)
        scored.append((sim, comp))
    
    scored.sort(key=lambda x: x[0], reverse=True)
    return [comp for _, comp in scored[:top_k]]
