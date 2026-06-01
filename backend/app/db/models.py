from sqlalchemy import Column, String, JSON, DateTime, Boolean, ForeignKey, Text, Integer, CheckConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.ext.mutable import MutableDict
from pgvector.sqlalchemy import Vector
from app.db.session import Base
from app.core.encryption import encrypt_value, decrypt_value
import uuid
import datetime


class User(Base):
    """
    User model for authentication and authorization.
    """

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('founder', 'agency', 'user', 'admin')",
            name="ck_user_role"
        ),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(
        String(50), nullable=False, default="user"
    )  # founder, agency, user, admin
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)

    # Password reset fields (replaces Redis-based reset tokens)
    reset_token_hash = Column(String(255), nullable=True, index=True)
    reset_token_expires_at = Column(DateTime, nullable=True)

    # LLM provider settings
    default_provider = Column(String(50), nullable=True, default="gemini")
    default_model = Column(String(100), nullable=True, default="gemini-2.0-flash")
    available_models = Column(JSON, nullable=True, default=list)

    # Relationships
    api_keys = relationship("ApiKey", back_populates="user", lazy="select")
    assets = relationship("Asset", back_populates="user", lazy="select")
    jobs = relationship("JobModel", back_populates="user", lazy="select")
    voices = relationship("Voice", back_populates="user", lazy="select")


class JobModel(Base):
    """
    Job model for the video pipeline.

    TODO: After migration period, make user_id non-nullable to enforce
    ownership for all new jobs.
    """

    __tablename__ = "jobs"

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'segmenting', 'segmented', 'visuals_generating', 'processing_scenes', "
            "'rendering_scenes', 'queued_render', 'rendering', 'completed', 'failed', 'queued_scene_regen')",
            name="ck_job_status"
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String, default="pending")
    error_message = Column(Text, nullable=True)
    script_text = Column(String, nullable=False)
    aspect_ratio = Column(String, default="9:16")
    result_spec = Column(MutableDict.as_mutable(JSON), nullable=True)
    video_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False
    )

    # Reformatting support
    parent_job_id = Column(String(36), ForeignKey("jobs.id"), nullable=True, index=True)
    tts_provider = Column(String(50), nullable=True, default="local_piper")
    tts_voice_id = Column(String(100), nullable=True, default="es_ES-carlfm-x_low")
    llm_model = Column(String(100), nullable=True)

    # Composition strategy version (v1 = legacy with primitives, v2 = components only)
    composition_version = Column(String(10), nullable=False, default="v2", server_default="v2")

    user = relationship("User", back_populates="jobs")


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
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    user = relationship("User", back_populates="voices")


class ApiKey(Base):
    """
    API key model for user-managed LLM provider keys.

    Each user can store their own API keys for different providers
    (gemini, openai, anthropic). One active key per provider per user.
    Keys are encrypted at rest using Fernet symmetric encryption.
    """

    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)  # gemini, openai, anthropic, grok
    _api_key_encrypted = Column("api_key", Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    # Relationships
    user = relationship("User", back_populates="api_keys")

    @property
    def api_key(self):
        return decrypt_value(self._api_key_encrypted)

    @property
    def api_key_last_four(self) -> str | None:
        key = self.api_key
        return key[-4:] if key else None

    @api_key.setter
    def api_key(self, value: str):
        self._api_key_encrypted = encrypt_value(value)


class Asset(Base):
    """
    Asset model for user-uploaded images (logos, product photos, etc.)
    """

    __tablename__ = "assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)  # stored filename (UUID + extension)
    original_name = Column(String(255), nullable=False)  # original upload name
    file_type = Column(String(50), nullable=False)  # image/png, image/jpeg, image/svg+xml
    file_size = Column(Integer, nullable=False)  # in bytes
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.datetime.now(datetime.timezone.utc))

    # Relationship
    user = relationship("User", back_populates="assets")


class DesignTemplate(Base):
    """
    Design template model for user-saved design.md prompts.
    """

    __tablename__ = "design_templates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    # Relationship
    user = relationship("User", backref="design_templates")




class ComponentModel(Base):
    """
    Component model for reusable animation components with semantic search support.

    Stores component metadata, TSX path, props schema, and OpenAI text embeddings
    for vector similarity search during scene generation.
    """

    __tablename__ = "components"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), unique=True, nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    role = Column(String(50), nullable=False, server_default="general", index=True)
    description = Column(Text, nullable=False)
    tags = Column(JSON, server_default="[]")
    tsx_path = Column(String(500), nullable=False)
    props_schema = Column(JSON, server_default="{}")
    embedding = Column(JSON, nullable=True)
    is_active = Column(Boolean, server_default="true")
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )


class ConversationHistory(Base):
    """
    Conversation history model for persistent chat context during scene editing.

    Stores chat messages linked to specific jobs, enabling the LLM to maintain
    context across multiple editing interactions within the same job.
    """

    __tablename__ = "conversation_history"
    __table_args__ = (
        # Composite index for fast retrieval by job and time
        Index("idx_chat_job_time", "job_id", "created_at"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSON, nullable=True)  # Stores intent, tokens, etc.
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))


class IconifyIcon(Base):
    """
    Iconify icon model with vector embeddings for semantic search.

    Stores icon metadata and Gemini-generated embeddings to enable
    cosine-similarity search for icon recommendations based on
    natural language queries.
    """

    __tablename__ = "iconify_icons"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prefix = Column(String(50), nullable=False, index=True)  # e.g. "mdi", "tabler"
    name = Column(String(200), nullable=False, index=True)  # e.g. "ecg-heart"
    full_id = Column(String(255), nullable=False, unique=True, index=True)  # e.g. "mdi:ecg-heart"
    tags = Column(JSON, nullable=True)  # ["ecg", "heart", "medical"]
    embedding = Column(Vector(768))  # Gemini embedding dimension
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
