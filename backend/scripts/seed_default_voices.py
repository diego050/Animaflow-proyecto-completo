"""
Seed script to create default voices for users who don't have any.

Usage:
    cd backend
    python scripts/seed_default_voices.py
"""
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models import User, Voice
from sqlalchemy import func


def seed_default_voices():
    """Create default 'Carl' voice for users without any voices."""
    db = SessionLocal()
    try:
        # Find users who have no voices
        users_without_voices = (
            db.query(User)
            .outerjoin(Voice, User.id == Voice.user_id)
            .filter(Voice.id.is_(None))
            .all()
        )

        if not users_without_voices:
            print("All users already have voices. Nothing to seed.")
            return

        print(f"Found {len(users_without_voices)} users without voices. Creating default voices...")

        created = 0
        for user in users_without_voices:
            default_voice = Voice(
                user_id=user.id,
                name="Carl (Default)",
                gender="neutral",
                language="es",
                is_default=True,
            )
            db.add(default_voice)
            created += 1
            print(f"  Created default voice for user {user.email}")

        db.commit()
        print(f"\nSuccessfully created {created} default voices.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_default_voices()
