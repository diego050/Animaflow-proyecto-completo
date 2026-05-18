"""
Seed script for AnimaFlow development - creates default pilot user.
"""
from app.db.session import SessionLocal
from app.db.models import User
from app.core.security import get_password_hash


def seed_default_user():
    """Create a default pilot user for development if it doesn't exist."""
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "pilot@animaflow.io").first()
        if not existing:
            user = User(
                email="pilot@animaflow.io",
                hashed_password=get_password_hash("pilot123"),
                name="Pilot User",
                role="pilot",
            )
            db.add(user)
            db.commit()
            print("Seeded pilot user: pilot@animaflow.io / pilot123")
        else:
            print("Pilot user already exists")
    finally:
        db.close()


if __name__ == "__main__":
    seed_default_user()
