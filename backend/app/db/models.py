from sqlalchemy import Column, String, JSON, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base
import uuid
import datetime


class User(Base):
    """
    User model for authentication and authorization.
    """

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(
        String(50), nullable=False, default="pilot"
    )  # founder, agency, pilot
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.datetime.utcnow()
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.utcnow(),
        onupdate=lambda: datetime.datetime.utcnow(),
    )

    # LLM provider settings
    default_provider = Column(String(50), nullable=True, default="gemini")
    default_model = Column(String(100), nullable=True, default="gemini-2.0-flash")
    available_models = Column(JSON, nullable=True, default=list)

    # Relationships
    api_keys = relationship("ApiKey", back_populates="user", lazy="select")


class JobModel(Base):
    """
    Job model for the video pipeline.

    TODO: After migration period, make user_id non-nullable to enforce
    ownership for all new jobs.
    """

    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String, default="pending")
    script_text = Column(String, nullable=False)
    aspect_ratio = Column(String, default="9:16")
    result_spec = Column(JSON, nullable=True)
    video_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Voice(Base):
    """
    Voice model for user-managed TTS voice profiles.

    Each user can create, clone, and manage their own voices.
    One default voice per user is enforced at the application layer.
    """

    __tablename__ = "voices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    voicebox_profile_id = Column(String(255), nullable=True)
    gender = Column(String(50), nullable=False, default="neutral")
    language = Column(String(10), nullable=False, default="es")
    is_default = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    audio_sample_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.datetime.utcnow())
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.utcnow(),
        onupdate=lambda: datetime.datetime.utcnow(),
    )


class ApiKey(Base):
    """
    API key model for user-managed LLM provider keys.

    Each user can store their own API keys for different providers
    (gemini, openai, anthropic, grok). One active key per provider per user.
    """

    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)  # gemini, openai, anthropic, grok
    api_key = Column(Text, nullable=False)  # encrypted in production
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.datetime.utcnow())

    # Relationships
    user = relationship("User", back_populates="api_keys")
