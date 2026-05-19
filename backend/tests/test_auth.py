"""
Auth/JWT tests for AnimaFlow.

Tests registration, login, token validation, and protected routes.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import Base, get_db
from app.db.models import User
from app.core.security import get_password_hash, create_access_token
from datetime import timedelta


# Create a fresh in-memory SQLite database for auth tests using StaticPool
# so all connections share the same database instance.
TEST_DATABASE_URL = "sqlite://"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override get_db to use the test database."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="function")
def db():
    """Create fresh tables for each test and tear them down after."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(db):
    """Create a test user in the database."""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpass123"),
        name="Test User",
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestAuth:
    def test_register_success(self, db):
        """User can register with valid data."""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "newpass123",
                "name": "New User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "newuser@example.com"

    def test_register_duplicate_email(self, test_user):
        """Cannot register with duplicate email."""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",  # same as test_user
                "password": "testpass123",
                "name": "Test User",
            },
        )
        assert response.status_code == 400

    def test_login_success(self, test_user):
        """User can login with correct credentials."""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "testpass123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@example.com"

    def test_login_wrong_password(self, test_user):
        """Login fails with wrong password."""
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401

    def test_login_inactive_user(self, db, test_user):
        """Login fails for inactive user."""
        test_user.is_active = False
        db.commit()

        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "testpass123"},
        )
        assert response.status_code == 400  # Auth router returns 400 for inactive

    def test_protected_route_without_token(self):
        """Accessing protected route without token returns 401."""
        response = client.get("/api/jobs")
        assert response.status_code == 401

    def test_protected_route_with_invalid_token(self):
        """Accessing protected route with invalid token returns 401."""
        response = client.get(
            "/api/jobs", headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401

    def test_protected_route_with_expired_token(self):
        """Accessing protected route with expired token returns 401."""
        expired_token = create_access_token(
            data={"sub": "test@example.com"},
            expires_delta=timedelta(seconds=-1),  # Already expired
        )

        response = client.get(
            "/api/jobs",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401

    def test_me_endpoint(self, test_user):
        """Authenticated user can get their profile."""
        # Login first
        login_response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "testpass123"},
        )
        token = login_response.json()["access_token"]

        # Get profile
        response = client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["name"] == "Test User"
