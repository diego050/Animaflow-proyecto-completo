"""add generated_animations table (flywheel + observabilidad)

Mergea los 2 heads previos (a1b2c3d4e5f6, u3v4w5x6y7z8) y crea la tabla de animaciones
generadas por code-gen: tokens/estado (observabilidad) + code/prompt/embedding (flywheel).

Revision ID: b3d5f7h9j1k2
Revises: a1b2c3d4e5f6, u3v4w5x6y7z8
"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = 'b3d5f7h9j1k2'
down_revision = ('a1b2c3d4e5f6', 'u3v4w5x6y7z8')
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        'generated_animations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('job_id', sa.String(length=36), nullable=True),
        sa.Column('scene_index', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('source', sa.String(length=30), nullable=False, server_default='pipeline'),
        sa.Column('prompt_text', sa.Text(), nullable=True),
        sa.Column('art_direction', sa.Text(), nullable=True),
        sa.Column('code', sa.Text(), nullable=False),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('valid', sa.Boolean(), server_default='true'),
        sa.Column('status', sa.String(length=30), nullable=True),
        sa.Column('tokens_in', sa.Integer(), nullable=True),
        sa.Column('tokens_out', sa.Integer(), nullable=True),
        sa.Column('tokens_total', sa.Integer(), nullable=True),
        sa.Column('duration_frames', sa.Integer(), nullable=True),
        sa.Column('aspect_ratio', sa.String(length=10), nullable=True),
        sa.Column('approved', sa.Boolean(), server_default='false'),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('embedding', Vector(768), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_generated_animations_job_id', 'generated_animations', ['job_id'])
    op.create_index('ix_generated_animations_user_id', 'generated_animations', ['user_id'])
    op.create_index('ix_generated_animations_approved', 'generated_animations', ['approved'])
    op.create_index('ix_generated_animations_created_at', 'generated_animations', ['created_at'])
    # Índice HNSW para búsqueda por similitud coseno (flywheel RAG).
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_generated_animations_embedding "
        "ON generated_animations USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.drop_index('ix_generated_animations_embedding', table_name='generated_animations')
    op.drop_index('ix_generated_animations_created_at', table_name='generated_animations')
    op.drop_index('ix_generated_animations_approved', table_name='generated_animations')
    op.drop_index('ix_generated_animations_user_id', table_name='generated_animations')
    op.drop_index('ix_generated_animations_job_id', table_name='generated_animations')
    op.drop_table('generated_animations')
