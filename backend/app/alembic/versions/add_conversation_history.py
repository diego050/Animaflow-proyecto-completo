"""add conversation history table

Revision ID: add_conversation_history
Revises: 
Create Date: 2026-05-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_conversation_history'
down_revision = None  # Update this to the latest revision in your alembic/versions folder
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'conversation_history',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('job_id', sa.String(36), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    
    # Create composite index for fast retrieval by job and time
    op.create_index(
        'idx_chat_job_time',
        'conversation_history',
        ['job_id', 'created_at'],
        postgresql_ops={'created_at': 'DESC'}
    )


def downgrade() -> None:
    op.drop_index('idx_chat_job_time', table_name='conversation_history')
    op.drop_table('conversation_history')
