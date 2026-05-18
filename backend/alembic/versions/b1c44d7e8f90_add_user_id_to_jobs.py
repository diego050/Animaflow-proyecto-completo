"""add user_id to jobs

Revision ID: b1c44d7e8f90
Revises: 2904660d90f3
Create Date: 2026-05-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c44d7e8f90'
down_revision: Union[str, Sequence[str], None] = '2904660d90f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add user_id FK to jobs table for per-user scoping.

    Kept nullable for backward compatibility with existing jobs
    created before this migration.
    """
    op.add_column(
        'jobs',
        sa.Column(
            'user_id',
            sa.String(36),
            sa.ForeignKey('users.id'),
            nullable=True,
            index=True,
        ),
    )


def downgrade() -> None:
    """Remove user_id column from jobs table."""
    op.drop_column('jobs', 'user_id')
