"""add rendered_spec_hash and merge heads

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f6a7, 717efc8f1ad5
Create Date: 2026-06-14 20:40:00

Merges the two open heads (completed_at branch and aspect_ratio branch)
and adds jobs.rendered_spec_hash, used to skip redundant re-renders.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = ('b2c3d4e5f6a7', '717efc8f1ad5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('jobs', sa.Column('rendered_spec_hash', sa.String(length=64), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('jobs', 'rendered_spec_hash')
