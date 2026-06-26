"""merge heads: generated_animations + rendered_spec_hash

Resuelve los 2 heads en uno solo:
  - b3d5f7h9j1k2 (add generated_animations — flywheel/observabilidad)
  - c4d5e6f7a8b9 (add rendered_spec_hash)

No cambia el esquema; solo unifica el DAG para que `alembic upgrade head` funcione.

Revision ID: f1e2d3c4b5a6
Revises: b3d5f7h9j1k2, c4d5e6f7a8b9
"""
from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401

# revision identifiers, used by Alembic.
revision = 'f1e2d3c4b5a6'
down_revision = ('b3d5f7h9j1k2', 'c4d5e6f7a8b9')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
