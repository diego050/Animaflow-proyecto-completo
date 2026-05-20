"""
Pytest configuration and shared fixtures for backend tests.
"""
import pytest
from unittest.mock import patch
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager

from app.db.session import Base


@pytest.fixture
def db_session():
    """
    Create a fresh in-memory SQLite database for each test.
    Patches get_db_context in orchestrator so run_pipeline uses the test session.
    """
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestSessionLocal = sessionmaker(bind=engine)

    session = TestSessionLocal()

    # Create a mock get_db_context that yields the SAME test session.
    # This ensures run_pipeline sees jobs created in the test fixture.
    @contextmanager
    def mock_get_db_context():
        yield session

    with patch("app.modules.pipeline.orchestrator.get_db_context", mock_get_db_context):
        yield session

    session.close()
    Base.metadata.drop_all(bind=engine)
