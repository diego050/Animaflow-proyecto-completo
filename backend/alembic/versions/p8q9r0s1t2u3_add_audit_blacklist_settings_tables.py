"""add audit_logs, token_blacklist, and admin_settings tables

Revision ID: p8q9r0s1t2u3
Revises: m7n8o9p0q1r2
Create Date: 2026-06-01

"""
from alembic import op
import sqlalchemy as sa

revision = 'p8q9r0s1t2u3'
down_revision = 'm7n8o9p0q1r2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Audit logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('action', sa.String(100), nullable=False, index=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('details', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, index=True),
    )

    # Token blacklist table
    op.create_table(
        'token_blacklist',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('jti', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )

    # Admin settings table
    op.create_table(
        'admin_settings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('key', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('value', sa.JSON, nullable=True),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table('admin_settings')
    op.drop_table('token_blacklist')
    op.drop_table('audit_logs')
