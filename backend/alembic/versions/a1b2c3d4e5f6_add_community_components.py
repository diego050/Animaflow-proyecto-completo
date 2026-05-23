"""Add CommunityComponent model for Marketplace

Revision ID: a1b2c3d4e5f6
Revises: h5i9j0k1l2m3
Create Date: 2026-05-23

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'h5i9j0k1l2m3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'community_components',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('author_id', sa.String(length=36), nullable=False),
        sa.Column('format', sa.String(length=20), nullable=False, server_default='json'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True, server_default='uncategorized'),
        sa.Column('preview_url', sa.String(length=500), nullable=True),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('reviewer_id', sa.String(length=36), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('downloads', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('likes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.CheckConstraint("format IN ('json', 'tsx')", name='ck_community_component_format'),
        sa.CheckConstraint("status IN ('pending', 'approved', 'rejected')", name='ck_community_component_status'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_community_components_author_id'), 'community_components', ['author_id'], unique=False)
    op.create_index(op.f('ix_community_components_name'), 'community_components', ['name'], unique=True)
    op.create_index(op.f('ix_community_components_reviewer_id'), 'community_components', ['reviewer_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_community_components_reviewer_id'), table_name='community_components')
    op.drop_index(op.f('ix_community_components_name'), table_name='community_components')
    op.drop_index(op.f('ix_community_components_author_id'), table_name='community_components')
    op.drop_table('community_components')
