"""
Generate embeddings for Iconify icons using local sentence-transformers model.
Run this script locally (not in Docker) to populate the iconify_icons table.

Usage:
    pip install sentence-transformers sqlalchemy psycopg2-binary
    export DATABASE_URL="postgresql://user:pass@host/db"
    python scripts/generate_embeddings.py
"""

import os
import json
import time
from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer

# Configuración
MODEL_NAME = "all-mpnet-base-v2"  # 768d, high quality
INDEX_FILE = os.path.join(os.path.dirname(__file__), "iconify_index.json")
BATCH_SIZE = 100


def get_db_session():
    """Create a database session from DATABASE_URL environment variable."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")
    engine = create_engine(database_url)

    # Ensure the vector extension exists
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()

    return engine


def generate_description(name: str, prefix: str) -> str:
    """Generate a descriptive text for an icon to improve embedding quality."""
    parts = name.replace("-", " ").replace("_", " ")
    return f"{parts} icon symbol {prefix} collection"


def main():
    print(f"Loading model: {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)
    print("Model loaded successfully.")

    # Load index
    if not os.path.exists(INDEX_FILE):
        print(f"Error: {INDEX_FILE} not found. Run download_iconify_index.py first.")
        return

    with open(INDEX_FILE, "r") as f:
        index = json.load(f)

    # Count total icons
    total = sum(len(icons) for icons in index.values())
    print(f"Found {total} icons to process.")

    # Prepare texts and metadata
    texts = []
    icon_metadata = []

    for prefix, icons in index.items():
        for name in icons:
            full_id = f"{prefix}:{name}"
            desc = generate_description(name, prefix)
            texts.append(desc)
            icon_metadata.append({
                "full_id": full_id,
                "prefix": prefix,
                "name": name,
                "tags": name.split("-"),
            })

    # Generate embeddings in batches
    print(f"Generating embeddings in batches of {BATCH_SIZE}...")
    all_embeddings = model.encode(texts, batch_size=BATCH_SIZE, show_progress_bar=True)

    # Insert into database
    print("Connecting to database...")
    engine = get_db_session()

    inserted = 0
    skipped = 0

    with engine.connect() as conn:
        for i, (meta, embedding) in enumerate(zip(icon_metadata, all_embeddings)):
            try:
                # Check if exists (idempotent)
                existing = conn.execute(
                    text("SELECT id FROM iconify_icons WHERE full_id = :fid"),
                    {"fid": meta["full_id"]},
                ).fetchone()

                if existing:
                    skipped += 1
                    continue

                # Insert
                conn.execute(
                    text(
                        """
                        INSERT INTO iconify_icons (id, prefix, name, full_id, tags, embedding)
                        VALUES (gen_random_uuid(), :prefix, :name, :full_id, :tags, :embedding)
                        """
                    ),
                    {
                        "prefix": meta["prefix"],
                        "name": meta["name"],
                        "full_id": meta["full_id"],
                        "tags": json.dumps(meta["tags"]),
                        "embedding": embedding.tolist(),
                    },
                )
                inserted += 1

                if (i + 1) % 1000 == 0:
                    conn.commit()
                    print(f"Progress: {i + 1}/{total} icons processed.")

            except Exception as e:
                print(f"Error processing {meta['full_id']}: {e}")
                conn.rollback()

        conn.commit()

    print(f"Done! Inserted: {inserted}, Skipped (existing): {skipped}")


if __name__ == "__main__":
    main()
