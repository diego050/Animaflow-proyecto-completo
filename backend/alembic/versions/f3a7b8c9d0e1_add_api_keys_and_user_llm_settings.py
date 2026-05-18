"""add api_keys table and user LLM settings columns

Revision ID: f3a7b8c9d0e1
Revises: c2d55e8f9a01
Create Date: 2026-05-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'c2d55e8f9a01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add api_keys table and LLM settings columns to users table."""
    # Add columns to users table
    op.add_column('users', sa.Column('default_provider', sa.String(50), nullable=True, server_default='gemini'))
    op.add_column('users', sa.Column('default_model', sa.String(100), nullable=True, server_default='gemini-2.0-flash'))
    op.add_column('users', sa.Column('available_models', sa.JSON(), nullable=True, server_default='[]'))

    # Create api_keys table
    op.create_table(
        'api_keys',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('api_key', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    """Remove api_keys table and LLM settings columns from users table."""
    op.drop_table('api_keys')
    op.drop_column('users', 'available_models')
    op.drop_column('users', 'default_model')
    op.drop_column('users', 'default_provider')
