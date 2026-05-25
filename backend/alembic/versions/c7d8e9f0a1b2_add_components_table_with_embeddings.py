"""Add Component model with embedding support

Revision ID: c7d8e9f0a1b2
Revises: 4def2g036362
Create Date: 2026-05-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB


# revision identifiers, used by Alembic.
revision = 'c7d8e9f0a1b2'
down_revision = '4def2g036362'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'components',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='general'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('tags', ARRAY(sa.String(length=100)), server_default='{}'),
        sa.Column('tsx_path', sa.String(length=500), nullable=False),
        sa.Column('props_schema', JSONB, server_default='{}'),
        sa.Column('embedding', JSONB, nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_components_name'), 'components', ['name'], unique=True)
    op.create_index(op.f('ix_components_slug'), 'components', ['slug'], unique=True)
    op.create_index(op.f('ix_components_category'), 'components', ['category'], unique=False)
    op.create_index(op.f('ix_components_role'), 'components', ['role'], unique=False)
    op.create_index(op.f('ix_components_is_active'), 'components', ['is_active'], unique=False)
    op.execute('CREATE INDEX idx_components_tags ON components USING GIN (tags)')


def downgrade():
    op.drop_index(op.f('ix_components_is_active'), table_name='components')
    op.drop_index(op.f('ix_components_role'), table_name='components')
    op.drop_index(op.f('ix_components_category'), table_name='components')
    op.drop_index(op.f('ix_components_slug'), table_name='components')
    op.drop_index(op.f('ix_components_name'), table_name='components')
    op.execute('DROP INDEX IF EXISTS idx_components_tags')
    op.drop_table('components')
