from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional
import os


class Settings(BaseSettings):
    """Configuración del proyecto AnimaFlow."""

    # Project info
    PROJECT_NAME: str = "AnimaFlow"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Environment
    ENV: str = os.getenv("ENV", "development")

    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/animaflow"

    # SQLAlchemy compatibility — used by alembic/env.py and app/db/session.py
    @property
    def sqlalchemy_database_uri(self) -> str:
        return self.DATABASE_URL
    # LLM - Google Gemini API (Free Tier)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.1-flash"
    GEMINI_FALLBACK_MODEL: str = "gemini-3.1-flash-lite-preview"

    # Motor de generación de escenas: "orchestration" (catálogo de componentes) o
    # "codegen" (la IA escribe el componente Remotion con código). Flag para A/B.
    SCENE_ENGINE: str = os.getenv("SCENE_ENGINE", "orchestration")

    # Resend (contact form emails)
    RESEND_API_KEY: Optional[str] = None
    RESEND_TO_EMAIL: Optional[str] = None

    # Storage
    STORAGE_PATH: str = "./storage"

    # Storage base directory (used in Docker as /app)
    STORAGE_BASE_DIR: Optional[str] = None

    # Frontend path (for Remotion component generation)
    FRONTEND_DIR: Optional[str] = None

    # Auth / JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")
    )  # 7 days

    # CORS origins (comma-separated)
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
    )

    # Render Server
    RENDER_MODE: str = os.getenv("RENDER_MODE", "local")
    RENDER_SERVER_URL: str = os.getenv("RENDER_SERVER_URL", "http://render-server:3001")

    # Encryption
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

    # Gmail SMTP (for password reset emails)
    GMAIL_EMAIL: Optional[str] = None
    GMAIL_APP_PASSWORD: Optional[str] = None

    # Frontend URL (for password reset links, CORS, etc.)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    @model_validator(mode="after")
    def validate_secrets(self):
        if self.ENV == "production":
            if self.SECRET_KEY == "dev-secret-key-change-in-production":
                raise ValueError("SECRET_KEY must be set in production. Do not use the default value.")
            if not self.ENCRYPTION_KEY:
                raise ValueError("ENCRYPTION_KEY must be set in production")
        return self

    @property
    def frontend_path(self) -> str:
        """Resolve absolute path to the frontend directory.
        
        Priority:
        1. FRONTEND_DIR environment variable
        2. Auto-detection from this file's location
        """
        if self.FRONTEND_DIR:
            path = os.path.abspath(self.FRONTEND_DIR)
            if os.path.isdir(path):
                return path
            raise ValueError(f"FRONTEND_DIR points to non-existent directory: {path}")
        
        core_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Local dev: backend/app/core -> backend -> repo root -> frontend
        local_candidate = os.path.abspath(os.path.join(core_dir, "..", "..", "..", "frontend"))
        if os.path.isdir(os.path.join(local_candidate, "src")):
            return local_candidate
        
        # Docker fallback: backend copied to /app, frontend mounted at /app/frontend
        docker_candidate = os.path.abspath(os.path.join(core_dir, "..", "..", "frontend"))
        if os.path.isdir(docker_candidate):
            return docker_candidate
        
        raise RuntimeError(
            "Cannot resolve frontend directory. "
            f"Tried: {local_candidate} and {docker_candidate}. "
            "Set FRONTEND_DIR environment variable."
        )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


# Instancia global de configuración
settings = Settings()
