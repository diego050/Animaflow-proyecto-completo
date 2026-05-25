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


def infer_role(name: str) -> str:
    """Infer the role of a component from its name."""
    name_lower = name.lower()
    
    # Transitions
    if any(kw in name_lower for kw in ["transition", "wipe", "reveal"]):
        if "text" in name_lower:
            return "text"
        return "transition"
    
    # Text components
    if any(kw in name_lower for kw in ["text", "typewriter", "title", "quote", "split", "glitch", "underline", "highlight", "strike", "swap"]):
        return "text"
    
    # Background components
    if any(kw in name_lower for kw in ["background", "wave", "kinetic", "gradient", "particle", "blob", "grid", "rays", "abstract", "vfx", "overlay"]):
        return "background"
    
    # Data visualization
    if any(kw in name_lower for kw in ["chart", "graph", "bar", "pie", "funnel", "radar", "trend", "counter", "scoreboard", "percentage", "progress"]):
        return "dataviz"
    
    # Social media
    if any(kw in name_lower for kw in ["tiktok", "tweet", "instagram", "youtube", "social", "follower", "subscribe"]):
        return "social"
    
    # UI elements
    if any(kw in name_lower for kw in ["notification", "toast", "loading", "spinner", "timer", "countdown", "badge", "pill", "button", "selector", "browser", "phone", "terminal", "code", "calendar", "search", "message", "bubble", "lower", "third", "promo", "banner", "flash", "sale", "pricing", "table", "feature", "unlock", "checklist", "size", "app", "store", "music", "player", "podcast", "guest", "card", "testimonial", "review", "breaking", "news", "ticker", "alert", "cursor", "click", "emoji", "float", "floating", "tinder", "swipe", "product", "shopping", "cart", "git", "commit", "frame", "media", "lottie", "api", "request", "flow"]):
        return "ui"
    
    # Decorative effects
    if any(kw in name_lower for kw in ["ripple", "cursor", "emoji", "network", "nodes", "arrow", "line", "shape", "icon", "animated", "sound", "waveform", "spectrum", "audio"]):
        return "decorative"
    
    return "general"


def infer_category(name: str, role: str) -> str:
    """Infer a more specific category within the role."""
    name_lower = name.lower()
    
    if role == "background":
        if "kinetic" in name_lower: return "kinetic"
        if "blob" in name_lower: return "organic"
        if "particle" in name_lower: return "particles"
        if "wave" in name_lower: return "wave"
        if "gradient" in name_lower or "overlay" in name_lower: return "gradient"
        if "grid" in name_lower: return "grid"
        if "rays" in name_lower: return "light"
        return "general"
    
    if role == "text":
        if "reveal" in name_lower: return "reveal"
        if "type" in name_lower: return "typewriter"
        if "split" in name_lower: return "split"
        if "glitch" in name_lower: return "glitch"
        if "swap" in name_lower: return "swap"
        return "general"
    
    if role == "transition":
        if "wipe" in name_lower: return "wipe"
        if "blur" in name_lower: return "blur"
        if "light" in name_lower: return "light"
        if "glitch" in name_lower: return "glitch"
        return "general"
    
    if role == "dataviz":
        if "bar" in name_lower: return "bar"
        if "pie" in name_lower: return "pie"
        if "funnel" in name_lower: return "funnel"
        if "radar" in name_lower: return "radar"
        if "trend" in name_lower: return "trend"
        if "counter" in name_lower: return "counter"
        return "general"
    
    if role == "social":
        if "tiktok" in name_lower: return "tiktok"
        if "tweet" in name_lower: return "twitter"
        if "instagram" in name_lower: return "instagram"
        if "youtube" in name_lower: return "youtube"
        if "subscribe" in name_lower: return "subscribe"
        return "general"
    
    if role == "ui":
        if "button" in name_lower: return "button"
        if "notification" in name_lower or "toast" in name_lower: return "notification"
        if "loading" in name_lower or "spinner" in name_lower: return "loading"
        if "timer" in name_lower or "countdown" in name_lower: return "timer"
        if "browser" in name_lower: return "browser"
        if "phone" in name_lower: return "phone"
        if "terminal" in name_lower: return "terminal"
        if "card" in name_lower: return "card"
        if "badge" in name_lower: return "badge"
        return "general"
    
    if role == "decorative":
        if "ripple" in name_lower: return "ripple"
        if "cursor" in name_lower: return "cursor"
        if "emoji" in name_lower: return "emoji"
        if "network" in name_lower: return "network"
        if "arrow" in name_lower: return "arrow"
        return "general"
    
    return "general"


def generate_description(name: str, role: str, category: str) -> str:
    """Generate a basic description for a component."""
    return f"Remotion component: {name}. Role: {role}. Category: {category}. Animated video component for social media content."


def generate_tags(name: str, role: str, category: str) -> list[str]:
    """Generate basic tags for a component."""
    slug = slugify(name)
    return [slug, role, category, name.lower()]


def main():
    db = SessionLocal()
    total = len(AVAILABLE_COMPONENTS)
    success = 0
    skipped = 0
    
    print(f"🌱 Seeding {total} components...")
    
    for i, name in enumerate(AVAILABLE_COMPONENTS, 1):
        slug = slugify(name)
        role = infer_role(name)
        category = infer_category(name, role)
        description = generate_description(name, role, category)
        tags = generate_tags(name, role, category)
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
        embedding_text = f"{name}. Role: {role}. Category: {category}. {description}. Tags: {', '.join(tags)}"
        embedding = generate_embedding(embedding_text)
        
        if embedding is None:
            print(f"  ⚠️  [{i}/{total}] {name} (embedding failed, saving without)")
        
        # Create component
        component = ComponentModel(
            name=name,
            slug=slug,
            role=role,
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
        print(f"  {status} [{i}/{total}] {name} [role: {role}, category: {category}]")
        success += 1
    
    print(f"\n📊 Summary: {success} created, {skipped} skipped")
    db.close()


if __name__ == "__main__":
    main()
