"""add_pg_notify_and_index

Revision ID: 1abd9d703139
Revises: a1b2c3d4e5f6
Create Date: 2026-05-23 18:10:19.861962

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1abd9d703139'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE INDEX idx_jobs_status_created_pending ON jobs (status, created_at) WHERE status IN ('pending', 'segmented', 'queued_render');")
    op.execute("""
    CREATE OR REPLACE FUNCTION notify_job_status_change()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.status IN ('pending', 'segmented', 'queued_render') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
            PERFORM pg_notify('jobs', NEW.id::text);
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)
    op.execute("""
    CREATE TRIGGER trigger_job_status_change
    AFTER INSERT OR UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION notify_job_status_change();
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TRIGGER IF EXISTS trigger_job_status_change ON jobs;")
    op.execute("DROP FUNCTION IF EXISTS notify_job_status_change();")
    op.execute("DROP INDEX IF EXISTS idx_jobs_status_created_pending;")
