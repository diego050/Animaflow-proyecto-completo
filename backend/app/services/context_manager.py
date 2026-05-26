"""
Context Manager — Handles persistent conversation history for scene editing.
Stores and retrieves chat messages linked to specific jobs.
"""

import logging
from typing import Any

from sqlalchemy.orm import Session
from app.db.models import ConversationHistory

logger = logging.getLogger(__name__)


async def get_history(db: Session, job_id: str, limit: int = 15) -> list[dict[str, Any]]:
    """
    Retrieve the latest N messages for a specific job.
    Returns list of dicts: [{"role": "...", "content": "...", "metadata": {...}}, ...]
    Ordered by created_at DESC (newest first), then reversed for chronological order.
    """
    try:
        # Query latest messages
        messages = (
            db.query(ConversationHistory)
            .filter(ConversationHistory.job_id == job_id)
            .order_by(ConversationHistory.created_at.desc())
            .limit(limit)
            .all()
        )

        # Reverse to get chronological order (oldest to newest)
        messages.reverse()

        return [
            {
                "role": msg.role,
                "content": msg.content,
                "metadata": msg.metadata_ or {},
            }
            for msg in messages
        ]
    except Exception as e:
        logger.error(f"Failed to retrieve history for job {job_id}: {e}")
        return []


async def save_message(
    db: Session,
    job_id: str,
    user_id: str,
    role: str,
    content: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    """
    Save a message to the conversation history.
    """
    try:
        new_msg = ConversationHistory(
            job_id=job_id,
            user_id=user_id,
            role=role,
            content=content,
            metadata_=metadata,
        )
        db.add(new_msg)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save message for job {job_id}: {e}")
        raise
