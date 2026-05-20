#!/usr/bin/env python3
"""
Setup script for SonarQube database.

Creates the 'sonar' database and user in the existing PostgreSQL instance.
Run this before starting the SonarQube container for the first time.

Usage:
    python scripts/setup_sonarqube.py
"""
import os
import sys

# Add backend to path so we can import config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError
from app.core.config import settings


def setup_sonarqube_db():
    """Create SonarQube database and user in PostgreSQL."""
    print("🔧 Setting up SonarQube database...")
    
    engine = create_engine(settings.sqlalchemy_database_uri)
    
    with engine.connect() as conn:
        conn.execute(text("COMMIT"))  # Close any open transaction
        
        # Check if database exists
        result = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname='sonar'")
        )
        if result.fetchone():
            print("✅ Database 'sonar' already exists")
        else:
            conn.execute(text("CREATE DATABASE sonar"))
            print("✅ Database 'sonar' created")
        
        conn.execute(text("COMMIT"))
        
        # Check if user exists
        result = conn.execute(
            text("SELECT 1 FROM pg_roles WHERE rolname='sonar'")
        )
        if result.fetchone():
            print("✅ User 'sonar' already exists")
        else:
            # Create user with password
            conn.execute(text("CREATE USER sonar WITH PASSWORD 'sonar'"))
            print("✅ User 'sonar' created")
        
        conn.execute(text("COMMIT"))
        
        # Grant privileges
        conn.execute(text("GRANT ALL PRIVILEGES ON DATABASE sonar TO sonar"))
        print("✅ Privileges granted to 'sonar' on database 'sonar'")
    
    print("\n🎉 SonarQube database setup complete!")
    print("   Database: sonar")
    print("   User: sonar")
    print("   Password: sonar")
    print("\n   You can now start SonarQube with:")
    print("   docker compose --profile security up sonarqube -d")


if __name__ == "__main__":
    try:
        setup_sonarqube_db()
    except Exception as e:
        print(f"\n❌ Error setting up SonarQube database: {e}")
        sys.exit(1)
