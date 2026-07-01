"""add plan, profile and onboarding fields to users

Revision ID: aa11bb22cc33
Revises: f1e2d3c4b5a6
Create Date: 2026-07-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'aa11bb22cc33'
down_revision: Union[str, None] = 'f1e2d3c4b5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Suscripción: 'free' | 'paid' (extensible a 'business' luego).
    op.add_column('users', sa.Column('plan', sa.String(length=20), nullable=False, server_default='free'))
    # Perfil OPCIONAL (recogido en onboarding): qué es, cómo se enteró, para qué usará la app.
    op.add_column('users', sa.Column('persona', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('referral_source', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('use_case', sa.Text(), nullable=True))
    # Onboarding: pantallas de bienvenida solo la primera vez.
    op.add_column('users', sa.Column('onboarding_completed', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('users', 'onboarding_completed')
    op.drop_column('users', 'use_case')
    op.drop_column('users', 'referral_source')
    op.drop_column('users', 'persona')
    op.drop_column('users', 'plan')
