"""add llm_model to jobs

Revision ID: 4def2g036362
Revises: 3cde1f925251
Create Date: 2026-05-23 21:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4def2g036362'
down_revision: Union[str, Sequence[str], None] = '3cde1f925251'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'jobs',
        sa.Column(
            'llm_model',
            sa.String(length=100),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column('jobs', 'llm_model')
