from pydantic_settings import BaseSettings
from pydantic import validator
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

    # SQLAlchemy compatibility
    @property
    def sqlalchemy_database_uri(self) -> str:
        return self.DATABASE_URL

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # LLM - Google Gemini API (Free Tier)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.1-flash"
    GEMINI_FALLBACK_MODEL: str = "gemini-3.1-flash-lite-preview"

    # Voicebox (TTS)
    VOICEBOX_URL: str = "http://127.0.0.1:17493"

    # Storage
    STORAGE_PATH: str = "./storage"

    # Auth / JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")
    )  # 7 days

    # CORS origins (comma-separated)
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
    )

    # Encryption
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

    @validator("SECRET_KEY")
    def validate_secret_key(cls, v, values):
        env = values.get("ENV", "development")
        if env == "production" and v == "dev-secret-key-change-in-production":
            raise ValueError("SECRET_KEY must be set in production. Do not use the default value.")
        return v

    @validator("ENCRYPTION_KEY")
    def validate_encryption_key(cls, v, values):
        env = values.get("ENV", "development")
        if env == "production" and not v:
            raise ValueError("ENCRYPTION_KEY must be set in production")
        return v

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


# Instancia global de configuración
settings = Settings()
