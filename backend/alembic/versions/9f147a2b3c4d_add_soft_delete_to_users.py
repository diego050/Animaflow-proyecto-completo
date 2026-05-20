"""add soft delete to users

Revision ID: 9f147a2b3c4d
Revises: 8e038c8c137d
Create Date: 2026-05-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f147a2b3c4d'
down_revision: Union[str, Sequence[str], None] = '8e038c8c137d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add soft delete columns to users table."""
    op.add_column(
        'users',
        sa.Column(
            'is_deleted',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        'users',
        sa.Column(
            'deleted_at',
            sa.DateTime(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove soft delete columns from users table."""
    op.drop_column('users', 'deleted_at')
    op.drop_column('users', 'is_deleted')
