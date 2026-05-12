from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Configuración del proyecto AnimaFlow."""
    
    # Project info
    PROJECT_NAME: str = "AnimaFlow"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
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
    GEMINI_MODEL: str = "gemma-4-31b-it"
    GEMINI_FALLBACK_MODEL: str = "gemma-4-26b-a4b-it"
    
    # Voicebox (TTS)
    VOICEBOX_URL: str = "http://127.0.0.1:17493"
    
    # Storage
    STORAGE_PATH: str = "./storage"
    
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


# Instancia global de configuración
settings = Settings()
