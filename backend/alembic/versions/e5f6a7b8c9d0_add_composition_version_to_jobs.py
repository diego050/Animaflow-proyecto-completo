"""add composition_version column to jobs table

Revision ID: e5f6a7b8c9d0
Revises: d3e4f5a6b7c8
Create Date: 2026-05-30

"""
from alembic import op
import sqlalchemy as sa

revision = 'e5f6a7b8c9d0'
down_revision = 'd3e4f5a6b7c8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'jobs',
        sa.Column('composition_version', sa.String(10), nullable=False, server_default='v2')
    )


def downgrade() -> None:
    op.drop_column('jobs', 'composition_version')
