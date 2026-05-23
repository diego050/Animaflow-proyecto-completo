"""Add DesignTemplate model

Revision ID: h5i9j0k1l2m3
Revises: 6276e582bac8
Create Date: 2026-05-23 01:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h5i9j0k1l2m3'
down_revision = '6276e582bac8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'design_templates',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_design_templates_user_id'), 'design_templates', ['user_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_design_templates_user_id'), table_name='design_templates')
    op.drop_table('design_templates')
