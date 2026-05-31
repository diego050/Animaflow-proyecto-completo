"""add iconify_icons table with pgvector embeddings

Revision ID: k3l4m5n6o7p8
Revises: e5f6a7b8c9d0
Create Date: 2026-05-30

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = 'k3l4m5n6o7p8'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create vector extension if it doesn't exist
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Create iconify_icons table
    op.create_table(
        'iconify_icons',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('prefix', sa.String(50), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('full_id', sa.String(255), nullable=False, unique=True),
        sa.Column('tags', sa.JSON, nullable=True),
        sa.Column('embedding', Vector(768)),
        sa.Column('created_at', sa.DateTime, nullable=True),
    )

    # Create indexes
    op.create_index('ix_iconify_icons_prefix', 'iconify_icons', ['prefix'])
    op.create_index('ix_iconify_icons_name', 'iconify_icons', ['name'])
    op.create_index('ix_iconify_icons_full_id', 'iconify_icons', ['full_id'], unique=True)

    # Create HNSW index for cosine similarity search
    op.execute(
        "CREATE INDEX idx_iconify_embedding ON iconify_icons "
        "USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    # Drop HNSW index
    op.execute("DROP INDEX IF EXISTS idx_iconify_embedding")

    # Drop table indexes
    op.drop_index('ix_iconify_icons_full_id', table_name='iconify_icons')
    op.drop_index('ix_iconify_icons_name', table_name='iconify_icons')
    op.drop_index('ix_iconify_icons_prefix', table_name='iconify_icons')

    # Drop table
    op.drop_table('iconify_icons')

    # Optionally drop vector extension (commented out to avoid breaking
    # other tables that may depend on it, like components with JSON embeddings)
    # op.execute("DROP EXTENSION IF EXISTS vector")
