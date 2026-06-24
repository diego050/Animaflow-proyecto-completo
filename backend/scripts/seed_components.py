"""Seed script to populate components table from the component manifest.

This script reads component_manifest.json and creates/updates ComponentModel
records in the database. It is idempotent — running it multiple times updates
existing components without creating duplicates.

Usage:
    python scripts/seed_components.py          # seed all components
    python scripts/seed_components.py --embed  # seed + generate embeddings
"""
import re
import sys
import os
import argparse

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models import ComponentModel
from app.services.manifest import _load_manifest, get_component_names
from app.services.embedding import generate_embedding
from app.core.logging import get_logger

logger = get_logger("seed")


def slugify(name: str) -> str:
    """Convert CamelCase to kebab-case."""
    s1 = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1-\2', name)
    s2 = re.sub(r'([a-z\d])([A-Z])', r'\1-\2', s1)
    return s2.lower()


def build_embedding_text(comp: dict) -> str:
    """Build a rich text description for embedding generation."""
    name = comp["name"]
    role = comp.get("role", "general")
    category = comp.get("category", "General")
    description = comp.get("description", "")
    props = comp.get("props", {})

    # Build props summary for embedding context
    prop_names = list(props.keys())
    prop_summary = f"Props: {', '.join(prop_names)}" if prop_names else "No special props"

    return f"{name}. {description} Role: {role}. Category: {category}. {prop_summary}."


def main():
    parser = argparse.ArgumentParser(description="Seed components from manifest")
    parser.add_argument("--embed", action="store_true", help="Generate embeddings for new components")
    args = parser.parse_args()

    manifest = _load_manifest()
    components = manifest["components"]
    db = SessionLocal()

    total = len(components)
    created = 0
    updated = 0
    skipped = 0
    embed_success = 0
    embed_failed = 0

    print(f"🌱 Seeding {total} components from manifest...")
    if args.embed:
        print("   Embeddings: ENABLED (will call Gemini API)")
    else:
        print("   Embeddings: DISABLED (use --embed to generate)")
    print()

    for i, comp in enumerate(components, 1):
        name = comp["name"]
        slug = slugify(name)
        role = comp.get("role", "general")
        category = comp.get("category", "General")
        description = comp.get("description", "")
        props = comp.get("props", {})
        tsx_path = f"components/{name}.tsx"

        # Build tags from name, role, category
        tags = [slug, role, category.lower(), name.lower()]

        existing = db.query(ComponentModel).filter(
            ComponentModel.slug == slug
        ).first()

        if existing:
            # Update existing component with manifest data (idempotent)
            changed = False
            if existing.name != name:
                existing.name = name
                changed = True
            if existing.role != role:
                existing.role = role
                changed = True
            if existing.category != category:
                existing.category = category
                changed = True
            if existing.description != description:
                existing.description = description
                changed = True
            if existing.props_schema != props:
                existing.props_schema = props
                changed = True
            if existing.tsx_path != tsx_path:
                existing.tsx_path = tsx_path
                changed = True

            if changed:
                db.commit()
                print(f"  🔄 [{i}/{total}] {name} (updated)")
                updated += 1
            else:
                print(f"  ⏭️  [{i}/{total}] {name} (already up-to-date)")
                skipped += 1

            # Generate embedding if requested and missing
            if args.embed and existing.embedding is None:
                embed_text = build_embedding_text(comp)
                embedding = generate_embedding(embed_text)
                if embedding:
                    existing.embedding = embedding
                    db.commit()
                    embed_success += 1
                    print(f"     ✅ Embedding generated")
                else:
                    embed_failed += 1
                    print(f"     ⚠️  Embedding failed")
            continue

        # Generate embedding for new component if requested
        embedding = None
        if args.embed:
            embed_text = build_embedding_text(comp)
            embedding = generate_embedding(embed_text)
            if embedding:
                embed_success += 1
            else:
                embed_failed += 1

        # Create new component
        component = ComponentModel(
            name=name,
            slug=slug,
            role=role,
            category=category,
            description=description,
            tags=tags,
            tsx_path=tsx_path,
            props_schema=props,
            embedding=embedding,
            is_active=True,
        )

        db.add(component)
        db.commit()

        status = "✅" if embedding else ("⚠️" if args.embed else "📝")
        print(f"  {status} [{i}/{total}] {name} [role: {role}, category: {category}]")
        created += 1

    print()
    print(f"📊 Summary:")
    print(f"   Created:  {created}")
    print(f"   Updated:  {updated}")
    print(f"   Skipped:  {skipped}")
    if args.embed:
        print(f"   Embeddings: {embed_success} success, {embed_failed} failed")

    db.close()


if __name__ == "__main__":
    main()
