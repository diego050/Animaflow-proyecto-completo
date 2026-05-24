"""add updated_at to jobs

Revision ID: 3cde1f925251
Revises: 2bcd0e814140
Create Date: 2026-05-23 20:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3cde1f925251'
down_revision: Union[str, Sequence[str], None] = '2bcd0e814140'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Añadimos la columna permitiendo nulos temporalmente
    op.add_column(
        'jobs',
        sa.Column(
            'updated_at',
            sa.DateTime(),
            nullable=True,
        ),
    )
    
    # 2. Copiamos el valor de created_at a updated_at para los registros existentes
    op.execute("UPDATE jobs SET updated_at = created_at WHERE updated_at IS NULL")
    
    # 3. Hacemos la columna NOT NULL
    op.alter_column('jobs', 'updated_at', nullable=False)


def downgrade() -> None:
    op.drop_column('jobs', 'updated_at')
