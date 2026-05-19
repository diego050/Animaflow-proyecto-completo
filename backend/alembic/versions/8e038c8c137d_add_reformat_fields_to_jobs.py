"""add reformat fields to jobs

Revision ID: 8e038c8c137d
Revises: g4h8i9j0k1l2
Create Date: 2026-05-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e038c8c137d'
down_revision: Union[str, Sequence[str], None] = 'g4h8i9j0k1l2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add parent_job_id, tts_provider, and tts_voice_id to jobs table."""
    op.add_column(
        'jobs',
        sa.Column(
            'parent_job_id',
            sa.String(36),
            sa.ForeignKey('jobs.id'),
            nullable=True,
            index=True,
        ),
    )
    op.add_column(
        'jobs',
        sa.Column(
            'tts_provider',
            sa.String(50),
            nullable=True,
        ),
    )
    op.add_column(
        'jobs',
        sa.Column(
            'tts_voice_id',
            sa.String(100),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove reformat columns from jobs table."""
    op.drop_column('jobs', 'tts_voice_id')
    op.drop_column('jobs', 'tts_provider')
    op.drop_column('jobs', 'parent_job_id')
