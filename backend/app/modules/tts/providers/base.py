from abc import ABC, abstractmethod
from typing import Optional

class TTSProvider(ABC):
    """Abstract base class for TTS providers."""

    @abstractmethod
    async def generate_audio(self, text: str, voice_id: str = "default", api_key: Optional[str] = None) -> str:
        """Generate audio file from text. Returns path to audio file."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name."""
        pass

    @property
    @abstractmethod
    def requires_api_key(self) -> bool:
        """Whether this provider requires an API key."""
        pass
