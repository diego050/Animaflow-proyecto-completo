"""
Pytest configuration and shared fixtures for backend tests.
"""
import pytest
from unittest.mock import patch
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker

from app.db.session import Base


@pytest.fixture
def db_session():
    """
    Create a fresh in-memory SQLite database for each test.
    Patches SessionLocal in pipeline.py so run_pipeline uses the test DB.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestSessionLocal = sessionmaker(bind=engine)

    session = TestSessionLocal()

    # Patch SessionLocal in the orchestrator so that run_pipeline's internal
    # db = SessionLocal() uses the same in-memory SQLite engine.
    with patch("app.modules.pipeline.orchestrator.SessionLocal", TestSessionLocal):
        yield session

    session.close()
    Base.metadata.drop_all(bind=engine)
