"""Config tuneable desde la DB (tabla `admin_settings`, key-value JSON).

Permite cambiar parámetros NO-secretos en runtime sin redeploy (modelo de code-gen,
temperatura, reintentos, toggle del flywheel, precios…). Los secretos/infra (DB_URL,
claves de cifrado, API keys de proveedor) SIGUEN en env — no se mueven a la DB.

`get_setting` cachea 60s para no consultar la DB en cada llamada. Si la DB falla o la key
no existe, devuelve el `default` (el código siempre funciona aunque la tabla esté vacía).
"""
import time
from typing import Any

from app.db.session import get_db_context
from app.db.models import AdminSettings
from app.core.logging import get_logger

logger = get_logger("settings_store")

_cache: dict[str, tuple[Any, float]] = {}
_CACHE_TTL = 60.0  # segundos


def get_setting(key: str, default: Any = None) -> Any:
    """Valor de `key` desde admin_settings (cache 60s); `default` si no existe o la DB falla."""
    now = time.time()
    hit = _cache.get(key)
    if hit and hit[1] > now:
        return hit[0]
    value = default
    try:
        with get_db_context() as db:
            row = db.query(AdminSettings).filter(AdminSettings.key == key).first()
            if row is not None and row.value is not None:
                value = row.value
    except Exception as e:  # noqa: BLE001 — nunca romper por settings
        logger.warning("get_setting(%s) falló → uso default: %s", key, e)
        return default
    _cache[key] = (value, now + _CACHE_TTL)
    return value


def set_setting(key: str, value: Any, description: str | None = None) -> None:
    """Upsert de un setting. Invalida el cache."""
    with get_db_context() as db:
        row = db.query(AdminSettings).filter(AdminSettings.key == key).first()
        if row:
            row.value = value
            if description:
                row.description = description
        else:
            db.add(AdminSettings(key=key, value=value, description=description))
        db.commit()
    _cache.pop(key, None)
