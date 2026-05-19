"""add voices table

Revision ID: c2d55e8f9a01
Revises: b1c44d7e8f90
Create Date: 2026-05-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d55e8f9a01'
down_revision: Union[str, Sequence[str], None] = 'b1c44d7e8f90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the voices table for user-managed TTS voice profiles."""
    op.create_table(
        'voices',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('voicebox_profile_id', sa.String(255), nullable=True),
        sa.Column('gender', sa.String(50), nullable=False, server_default='neutral'),
        sa.Column('language', sa.String(10), nullable=False, server_default='es'),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('audio_sample_path', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    """Drop the voices table."""
    op.drop_table('voices')
