"""Audit logging helper for tracking security-relevant events."""
from sqlalchemy.orm import Session
from app.core.logging import get_logger

logger = get_logger("audit")


def log_audit_event(db: Session, user_id: str, action: str, ip_address: str = None, user_agent: str = None, details: dict = None):
    """
    Record an audit event in the database.

    Args:
        db: SQLAlchemy session
        user_id: User ID (can be None for anonymous events)
        action: Event type (login, logout, password_reset, role_change, etc.)
        ip_address: Client IP address
        user_agent: Client user agent string
        details: Additional context as a dict
    """
    from app.db.models import AuditLog

    try:
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details or {},
        )
        db.add(audit_entry)
        db.commit()
        logger.info("Audit: %s by user %s", action, user_id)
    except Exception:
        # Audit logging should never break the main flow
        logger.exception("Failed to write audit log for action: %s", action)
        db.rollback()
