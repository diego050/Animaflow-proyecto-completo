"""Re-embed all existing components from 3072 to 768 dimensions.

This script updates the embedding column for all active components
to use the new gemini-embedding-2 model with output_dimensionality=768.

Usage:
    cd backend
    python scripts/reembed_components.py
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models import ComponentModel
from app.services.embedding import generate_embedding
from app.core.logging import get_logger

logger = get_logger("reembed")


def main():
    db = SessionLocal()
    
    components = db.query(ComponentModel).filter(
        ComponentModel.is_active.is_(True),
    ).all()
    
    total = len(components)
    success = 0
    failed = 0
    
    print(f"🔄 Re-embedding {total} components to 768 dimensions...")
    print(f"   Model: gemini-embedding-2 (output_dimensionality=768)")
    print()
    
    for i, comp in enumerate(components, 1):
        # Build the same embedding text used during seeding
        tags = comp.tags or []
        embedding_text = (
            f"{comp.name}. Role: {comp.role}. Category: {comp.category}. "
            f"{comp.description}. Tags: {', '.join(tags)}"
        )
        
        embedding = generate_embedding(embedding_text)
        
        if embedding is None:
            print(f"  ⚠️  [{i}/{total}] {comp.name} (embedding failed)")
            failed += 1
            continue
        
        comp.embedding = embedding
        success += 1
        
        # Commit every 10 components
        if i % 10 == 0:
            db.commit()
            print(f"  ✅ [{i}/{total}] Committed batch of 10")
        else:
            print(f"  ✅ [{i}/{total}] {comp.name}")
    
    # Final commit
    db.commit()
    
    print()
    print(f"📊 Summary: {success} re-embedded, {failed} failed, {total} total")
    print("✅ All components now use 768-dimensional embeddings.")
    
    db.close()


if __name__ == "__main__":
    main()
