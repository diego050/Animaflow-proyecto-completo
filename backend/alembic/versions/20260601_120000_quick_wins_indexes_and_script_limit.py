"""quick wins: indexes and script_text limit

Revision ID: f9a8b7c6d5e4
Revises: u3v4w5x6y7z8
Create Date: 2026-06-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f9a8b7c6d5e4'
down_revision: Union[str, None] = 'u3v4w5x6y7z8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Limit script_text to 11,000 characters
    op.alter_column(
        'jobs',
        'script_text',
        existing_type=sa.Text(),
        type_=sa.String(11000),
        existing_nullable=True,
    )

    # 2. Add indexes for high-query columns
    op.create_index('idx_job_status', 'jobs', ['status'])
    op.create_index('idx_job_updated_at', 'jobs', ['updated_at'])
    op.create_index('idx_apikey_provider', 'api_keys', ['provider'])


def downgrade() -> None:
    # Reverse indexes
    op.drop_index('idx_apikey_provider', table_name='api_keys')
    op.drop_index('idx_job_updated_at', table_name='jobs')
    op.drop_index('idx_job_status', table_name='jobs')

    # Reverse script_text limit back to TEXT
    op.alter_column(
        'jobs',
        'script_text',
        existing_type=sa.String(11000),
        type_=sa.Text(),
        existing_nullable=True,
    )
