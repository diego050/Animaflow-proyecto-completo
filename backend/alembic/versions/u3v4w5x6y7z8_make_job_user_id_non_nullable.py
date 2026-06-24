"""make job user_id non-nullable and clean up orphaned jobs

Revision ID: u3v4w5x6y7z8
Revises: p8q9r0s1t2u3
Create Date: 2026-06-01

"""
from alembic import op
import sqlalchemy as sa

revision = 'u3v4w5x6y7z8'
down_revision = 'p8q9r0s1t2u3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: Find or create a system user for orphaned jobs
    conn = op.get_bind()
    
    # Check if there are any orphaned jobs
    result = conn.execute(sa.text("SELECT COUNT(*) FROM jobs WHERE user_id IS NULL"))
    orphan_count = result.scalar()
    
    if orphan_count > 0:
        # Try to find an existing admin user
        result = conn.execute(sa.text("SELECT id FROM users WHERE role = 'admin' LIMIT 1"))
        admin_user = result.scalar()
        
        if not admin_user:
            # If no admin exists, use the first user
            result = conn.execute(sa.text("SELECT id FROM users LIMIT 1"))
            admin_user = result.scalar()
        
        if admin_user:
            # Assign orphaned jobs to the admin/first user
            conn.execute(
                sa.text("UPDATE jobs SET user_id = :admin_id WHERE user_id IS NULL"),
                {"admin_id": admin_user}
            )
        else:
            # If no users exist at all, delete orphaned jobs
            conn.execute(sa.text("DELETE FROM jobs WHERE user_id IS NULL"))
    
    # Step 2: Make user_id non-nullable
    op.alter_column('jobs', 'user_id', nullable=False)


def downgrade() -> None:
    op.alter_column('jobs', 'user_id', nullable=True)
