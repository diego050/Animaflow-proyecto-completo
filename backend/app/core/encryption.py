from cryptography.fernet import Fernet
from app.core.config import settings


def get_cipher():
    if not settings.ENCRYPTION_KEY:
        raise ValueError("ENCRYPTION_KEY not configured")
    return Fernet(settings.ENCRYPTION_KEY.encode())


def encrypt_value(value: str) -> str:
    cipher = get_cipher()
    return cipher.encrypt(value.encode()).decode()


def decrypt_value(encrypted: str) -> str:
    cipher = get_cipher()
    return cipher.decrypt(encrypted.encode()).decode()
