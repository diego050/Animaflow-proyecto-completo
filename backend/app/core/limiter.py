from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiting en memoria para 1 sola instancia de FastAPI.
# Si en el futuro escalas a 2+ réplicas, migrar a Redis o store compartido.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
)
