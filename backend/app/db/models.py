from sqlalchemy import Column, String, JSON, DateTime, Boolean, ForeignKey, Text, Integer, CheckConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.ext.mutable import MutableDict
from pgvector.sqlalchemy import Vector
from app.db.session import Base
from app.core.encryption import encrypt_value, decrypt_value
import uuid
from datetime import datetime, timezone


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
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
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
    design_templates = relationship("DesignTemplate", back_populates="user", lazy="select")
    audit_logs = relationship("AuditLog", back_populates="user", lazy="select")
    token_blacklist = relationship("TokenBlacklist", back_populates="user", lazy="select")


class JobModel(Base):
    """
    Job model for the video pipeline.
    """

    __tablename__ = "jobs"

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'segmenting', 'segmented', 'visuals_generating', 'processing_scenes', "
            "'rendering_scenes', 'queued_render', 'rendering', 'completed', 'failed', 'queued_scene_regen')",
            name="ck_job_status"
        ),
        Index("idx_job_status", "status"),
        Index("idx_job_updated_at", "updated_at"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, default="pending")
    error_message = Column(Text, nullable=True)
    script_text = Column(String(11000), nullable=False)
    aspect_ratio = Column(String, default="9:16")
    result_spec = Column(MutableDict.as_mutable(JSON), nullable=True)
    video_url = Column(String, nullable=True)
    # Hash of the spec (scenes + aspect_ratio) that produced the current video_url.
    # Used to skip re-rendering when nothing render-relevant has changed.
    rendered_spec_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)

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
    gender = Column(String(50), nullable=False, default="neutral")
    language = Column(String(10), nullable=False, default="es")
    is_default = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    audio_sample_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
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

    __table_args__ = (
        Index("idx_apikey_provider", "provider"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)  # gemini, openai, anthropic, grok
    _api_key_encrypted = Column("api_key", Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="api_keys")

    @property
    def api_key(self):
        if not hasattr(self, '_cached_api_key'):
            self._cached_api_key = decrypt_value(self._api_key_encrypted)
        return self._cached_api_key

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
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

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
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationship
    user = relationship("User", back_populates="design_templates")




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
    embedding = Column(Vector(768), nullable=True)  # Gemini embedding dimension
    is_active = Column(Boolean, server_default="true")
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class GeneratedAnimation(Base):
    """Cada animación code-gen generada (escena del pipeline, prototipo admin, edición o
    regeneración). Sirve a DOS cosas:

    - **Observabilidad:** tokens, modelo, validez, estado por generación → métricas por video.
    - **Flywheel:** `code` + `prompt_text` + `embedding`; solo las `approved` alimentan el few-shot
      (RAG de buenos ejemplos). El embedding se llena cuando se aprueba/cura (proceso aparte).
    """

    __tablename__ = "generated_animations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), nullable=True, index=True)       # null = prototipo admin
    scene_index = Column(Integer, nullable=True)
    user_id = Column(String(36), nullable=True, index=True)
    source = Column(String(30), nullable=False, server_default="pipeline")  # pipeline|prototype|edit|regenerate
    prompt_text = Column(Text, nullable=True)                    # texto de la escena o prompt del usuario
    art_direction = Column(Text, nullable=True)                  # media_query / dirección de arte
    code = Column(Text, nullable=False)
    model = Column(String(100), nullable=True)
    valid = Column(Boolean, server_default="true")
    status = Column(String(30), nullable=True)                   # passed|fallback|edited
    tokens_in = Column(Integer, nullable=True)
    tokens_out = Column(Integer, nullable=True)
    tokens_total = Column(Integer, nullable=True)
    duration_frames = Column(Integer, nullable=True)
    aspect_ratio = Column(String(10), nullable=True)
    approved = Column(Boolean, server_default="false", index=True)  # curación: solo aprobadas → few-shot
    rating = Column(Integer, nullable=True)
    embedding = Column(Vector(768), nullable=True)              # flywheel RAG (se llena al curar)
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True
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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    """
    Audit log for tracking security-relevant events.

    Records login, logout, password changes, role changes, and other
    admin actions for compliance and debugging.
    """

    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # login, logout, password_reset, role_change, etc.
    ip_address = Column(String(45), nullable=True)  # IPv6 max length
    user_agent = Column(String(500), nullable=True)
    details = Column(JSON, nullable=True)  # Additional context
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationship
    user = relationship("User", back_populates="audit_logs", lazy="select")


class AdminSettings(Base):
    """
    Admin-configurable system settings.

    Stores settings as key-value pairs in the database, allowing
    administrators to modify system behavior without code changes.
    """

    __tablename__ = "admin_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(JSON, nullable=True)  # Flexible JSON value
    description = Column(String(500), nullable=True)
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class TokenBlacklist(Base):
    """
    Blacklisted JWT tokens for logout functionality.

    When a user logs out, their current token's JTI (JWT ID) is stored here
    to prevent reuse until the token's natural expiration.
    """

    __tablename__ = "token_blacklist"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    jti = Column(String(255), unique=True, nullable=False, index=True)  # JWT ID
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)  # When the token naturally expires
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationship
    user = relationship("User", back_populates="token_blacklist", lazy="select")
