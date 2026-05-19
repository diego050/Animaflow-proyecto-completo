#!/usr/bin/env python
"""
Standalone script to create an admin user.
Run this on the VPS after deployment to create the first admin account.

Usage:
    cd backend
    python scripts/create_admin.py
    
Or with arguments:
    python scripts/create_admin.py --email admin@example.com --password SecurePass123 --name "Admin User"
"""
import argparse
import sys
import os

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models import User
from app.core.security import get_password_hash
from app.core.logging import get_logger

logger = get_logger("scripts.create_admin")


def create_admin_user(email: str, password: str, name: str = "Admin"):
    """Create an admin user."""
    db = SessionLocal()
    
    try:
        # Check if user already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            if existing.role == "admin":
                logger.info("Admin user already exists: %s", email)
                print(f"Admin user already exists: {email}")
                return existing
            else:
                # Promote to admin
                existing.role = "admin"
                db.commit()
                logger.info("User promoted to admin: %s", email)
                print(f"User promoted to admin: {email}")
                return existing
        
        # Create new admin user
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            name=name,
            role="admin",
            is_active=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        logger.info("Admin user created: %s (ID: %s)", email, user.id)
        print(f"Admin user created successfully!")
        print(f"   Email: {email}")
        print(f"   Name: {name}")
        print(f"   Role: admin")
        print(f"   ID: {user.id}")
        print()
        print("You can now log in at /login with these credentials.")
        
        return user
        
    except Exception as e:
        logger.error("Failed to create admin user: %s", e)
        print(f"Failed to create admin user: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Create an admin user for AnimaFlow")
    parser.add_argument("--email", default="admin@animaflow.com", help="Admin email")
    parser.add_argument("--password", help="Admin password (will prompt if not provided)")
    parser.add_argument("--name", default="Admin", help="Admin display name")
    
    args = parser.parse_args()
    
    # Prompt for password if not provided (safer)
    if not args.password:
        import getpass
        password = getpass.getpass("Enter admin password: ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("Passwords do not match!")
            sys.exit(1)
        if len(password) < 8:
            print("Password must be at least 8 characters!")
            sys.exit(1)
    else:
        password = args.password
    
    create_admin_user(args.email, password, args.name)


if __name__ == "__main__":
    main()
