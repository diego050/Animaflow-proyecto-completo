"""Component embedding service for semantic search using Gemini Embeddings."""
import math
import os
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
        response = client.models.embed_content(
            model=GEMINI_EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=768,
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
        query = db.query(ComponentModel).filter(ComponentModel.is_active.is_(True))
        if category_filter:
            query = query.filter(ComponentModel.category == category_filter)
        components = query.limit(top_k).all()
        return [_format_component(c) for c in components]

    # Define diversity quotas
    quotas = {
        "background": 2,
        "text": 3,
        "ui": 4,
        "decorative": 3,
        "dataviz": 2,
        "social": 1,
    }
    # transition removed — transitions are decided by scene continuity, not semantic search
    # ui increased from 1 to 4 — buttons/cards/badges are the most versatile components
    # text increased from 2 to 3 — allows title + subtitle + body/caption hierarchy

    selected = []
    seen_ids = set()

    # 1. Fill quotas per role
    for role, count in quotas.items():
        if len(selected) >= top_k:
            break

        # Query components for this role with embeddings
        role_query = db.query(ComponentModel).filter(
            ComponentModel.is_active.is_(True),
            ComponentModel.role == role,
            ComponentModel.embedding.isnot(None),
        )
        if category_filter:
            role_query = role_query.filter(ComponentModel.category == category_filter)

        try:
            role_components = role_query.all()
        except exc.InternalError:
            logger.warning("Transaction aborted, rolling back and skipping role: %s", role)
            db.rollback()
            continue

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

    # 2. Fill remaining slots — prioritize UI (most versatile components)
    if len(selected) < top_k:
        remaining = top_k - len(selected)

        # Phase 1: Try UI components first (buttons, cards, badges are highly reusable)
        ui_query = db.query(ComponentModel).filter(
            ComponentModel.is_active.is_(True),
            ComponentModel.role == "ui",
            ComponentModel.embedding.isnot(None),
        )
        if seen_ids:
            ui_query = ui_query.filter(~ComponentModel.id.in_(seen_ids))
        if category_filter:
            ui_query = ui_query.filter(ComponentModel.category == category_filter)

        try:
            ui_components = ui_query.all()
        except exc.InternalError:
            logger.warning("Transaction aborted during UI component query, rolling back.")
            db.rollback()
            ui_components = []

        ui_scored = []
        for comp in ui_components:
            sim = cosine_similarity(query_embedding, comp.embedding)
            ui_scored.append((sim, comp))

        ui_scored.sort(key=lambda x: x[0], reverse=True)

        for sim, comp in ui_scored[:remaining]:
            selected.append(_format_component(comp))
            seen_ids.add(comp.id)

        # Phase 2: If still slots remaining, fill with any best matches
        still_remaining = top_k - len(selected)
        if still_remaining > 0:
            general_query = db.query(ComponentModel).filter(
                ComponentModel.is_active.is_(True),
                ComponentModel.embedding.isnot(None),
            )
            if seen_ids:
                general_query = general_query.filter(~ComponentModel.id.in_(seen_ids))
            if category_filter:
                general_query = general_query.filter(ComponentModel.category == category_filter)

            try:
                all_components = general_query.all()
            except exc.InternalError:
                logger.warning("Transaction aborted during general component query, rolling back.")
                db.rollback()
                return selected

            scored = []
            for comp in all_components:
                sim = cosine_similarity(query_embedding, comp.embedding)
                scored.append((sim, comp))

            scored.sort(key=lambda x: x[0], reverse=True)

            for sim, comp in scored[:still_remaining]:
                selected.append(_format_component(comp))
                seen_ids.add(comp.id)

    return selected
