"""Seed script to populate components table with existing components and generate embeddings."""
import re
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models import ComponentModel
from app.modules.llm.component_strategy import AVAILABLE_COMPONENTS
from app.services.embedding import generate_embedding
from app.core.logging import get_logger

logger = get_logger("seed")


def slugify(name: str) -> str:
    """Convert CamelCase to kebab-case."""
    # Insert hyphen before uppercase letters
    s1 = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1-\2', name)
    s2 = re.sub(r'([a-z\d])([A-Z])', r'\1-\2', s1)
    return s2.lower()


def infer_category(name: str) -> str:
    """Infer category from component name."""
    name_lower = name.lower()
    
    category_map = {
        "chart": "data-viz",
        "graph": "data-viz",
        "bar": "data-viz",
        "pie": "data-viz",
        "funnel": "data-viz",
        "radar": "data-viz",
        "trend": "data-viz",
        "counter": "data-viz",
        "scoreboard": "data-viz",
        "percentage": "data-viz",
        
        "text": "text",
        "typewriter": "text",
        "reveal": "text",
        "split": "text",
        "glitch": "text",
        "swap": "text",
        "underline": "text",
        "highlight": "text",
        "strike": "text",
        
        "social": "social",
        "instagram": "social",
        "tiktok": "social",
        "tweet": "social",
        "youtube": "social",
        "subscribe": "social",
        "follower": "social",
        "share": "social",
        
        "notification": "ui",
        "toast": "ui",
        "loading": "ui",
        "spinner": "ui",
        "progress": "ui",
        "timer": "ui",
        "countdown": "ui",
        "badge": "ui",
        "pill": "ui",
        "button": "ui",
        "selector": "ui",
        "browser": "ui",
        "phone": "ui",
        "terminal": "ui",
        "code": "ui",
        "calendar": "ui",
        "search": "ui",
        "message": "ui",
        "bubble": "ui",
        "lower": "ui",
        "third": "ui",
        "promo": "ui",
        "banner": "ui",
        "flash": "ui",
        "sale": "ui",
        "pricing": "ui",
        "table": "ui",
        "feature": "ui",
        "unlock": "ui",
        "checklist": "ui",
        "size": "ui",
        "app": "ui",
        "store": "ui",
        "music": "ui",
        "player": "ui",
        "podcast": "ui",
        "guest": "ui",
        "card": "ui",
        "testimonial": "ui",
        "review": "ui",
        "quote": "ui",
        "breaking": "ui",
        "news": "ui",
        "ticker": "ui",
        "alert": "ui",
        "cursor": "ui",
        "click": "ui",
        "emoji": "ui",
        "float": "ui",
        "floating": "ui",
        "tinder": "ui",
        "swipe": "ui",
        "product": "ui",
        "shopping": "ui",
        "cart": "ui",
        "git": "ui",
        "commit": "ui",
        
        "transition": "transition",
        "wipe": "transition",
        "light": "transition",
        "leak": "transition",
        "zoom": "transition",
        "blur": "transition",
        "mask": "transition",
        "versus": "transition",
        "split": "transition",
        "screen": "transition",
        
        "background": "background",
        "wave": "background",
        "kinetic": "background",
        "gradient": "background",
        "particle": "background",
        "blob": "background",
        "grid": "background",
        "rays": "background",
        "abstract": "background",
        "global": "background",
        "vfx": "background",
        
        "audio": "audio",
        "sound": "audio",
        "waveform": "audio",
        "spectrum": "audio",
        "circle": "audio",
        
        "arrow": "shapes",
        "line": "shapes",
        "shape": "shapes",
        "icon": "shapes",
        "animated": "shapes",
        "ripple": "shapes",
        "network": "shapes",
        "nodes": "shapes",
        
        "api": "developer",
        "request": "developer",
        "flow": "developer",
        "lottie": "developer",
        "animation": "developer",
        "media": "developer",
        "frame": "developer",
        "image": "developer",
        "photo": "developer",
        "mask": "developer",
    }
    
    for keyword, category in category_map.items():
        if keyword in name_lower:
            return category
    
    return "general"


def generate_description(name: str, category: str) -> str:
    """Generate a basic description for a component."""
    return f"Remotion component: {name}. Category: {category}. Animated video component for social media content."


def generate_tags(name: str, category: str) -> list[str]:
    """Generate basic tags for a component."""
    slug = slugify(name)
    return [slug, category, name.lower()]


def main():
    db = SessionLocal()
    total = len(AVAILABLE_COMPONENTS)
    success = 0
    failed = 0
    skipped = 0
    
    print(f"🌱 Seeding {total} components...")
    
    for i, name in enumerate(AVAILABLE_COMPONENTS, 1):
        slug = slugify(name)
        category = infer_category(name)
        description = generate_description(name, category)
        tags = generate_tags(name, category)
        tsx_path = f"components/{name}.tsx"
        
        # Check if already exists
        existing = db.query(ComponentModel).filter(
            ComponentModel.slug == slug
        ).first()
        
        if existing:
            print(f"  ⏭️  [{i}/{total}] {name} (already exists)")
            skipped += 1
            continue
        
        # Generate embedding
        embedding_text = f"{name}. {description}. Tags: {', '.join(tags)}"
        embedding = generate_embedding(embedding_text)
        
        if embedding is None:
            print(f"  ⚠️  [{i}/{total}] {name} (embedding failed, saving without)")
        
        # Create component
        component = ComponentModel(
            name=name,
            slug=slug,
            category=category,
            description=description,
            tags=tags,
            tsx_path=tsx_path,
            props_schema={},
            embedding=embedding,
            is_active=True,
        )
        
        db.add(component)
        db.commit()
        
        status = "✅" if embedding else "⚠️"
        print(f"  {status} [{i}/{total}] {name} (category: {category}, embedding: {'yes' if embedding else 'no'})")
        success += 1
    
    print(f"\n📊 Summary: {success} created, {skipped} skipped, {failed} failed")
    db.close()


if __name__ == "__main__":
    main()
