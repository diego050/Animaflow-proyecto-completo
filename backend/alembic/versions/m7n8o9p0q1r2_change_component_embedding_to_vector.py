"""change component embedding from JSON to Vector(768)

Revision ID: m7n8o9p0q1r2
Revises: k3l4m5n6o7p8
Create Date: 2026-06-01

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = 'm7n8o9p0q1r2'
down_revision = 'k3l4m5n6o7p8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the existing JSON embedding column (data is derived, will be regenerated)
    op.drop_column('components', 'embedding')

    # Add new Vector(768) column for pgvector cosine similarity search
    op.add_column('components', sa.Column('embedding', Vector(768), nullable=True))

    # Create HNSW index for cosine similarity search
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_components_embedding ON components "
        "USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    # Drop HNSW index
    op.execute("DROP INDEX IF EXISTS idx_components_embedding")

    # Drop Vector column
    op.drop_column('components', 'embedding')

    # Restore JSON column
    op.add_column('components', sa.Column('embedding', sa.JSON, nullable=True))
