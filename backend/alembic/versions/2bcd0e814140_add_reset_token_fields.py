"""add reset token fields to users

Revision ID: 2bcd0e814140
Revises: 1abd9d703139
Create Date: 2026-05-23 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2bcd0e814140'
down_revision: Union[str, Sequence[str], None] = '1abd9d703139'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add reset token columns to users table."""
    op.add_column(
        'users',
        sa.Column(
            'reset_token_hash',
            sa.String(length=255),
            nullable=True,
        ),
    )
    op.add_column(
        'users',
        sa.Column(
            'reset_token_expires_at',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove reset token columns from users table."""
    op.drop_column('users', 'reset_token_expires_at')
    op.drop_column('users', 'reset_token_hash')
