"""add aspect_ratio

Revision ID: 717efc8f1ad5
Revises: e234444509e7
Create Date: 2026-05-14 00:10:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '717efc8f1ad5'
down_revision: Union[str, Sequence[str], None] = 'e234444509e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('aspect_ratio', sa.String(), nullable=True, server_default='9:16'))


def downgrade() -> None:
    op.drop_column('jobs', 'aspect_ratio')
