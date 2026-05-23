import logging
import sys
import json
from datetime import datetime

class RedisLogHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        # Import lazily to avoid circular imports during app startup
        from app.core.config import settings
        from redis import Redis
        try:
            self.redis_conn = Redis.from_url(settings.REDIS_URL)
        except Exception:
            self.redis_conn = None

    def emit(self, record):
        if not self.redis_conn:
            return
        job_id = getattr(record, "job_id", None)
        if not job_id:
            return
        
        try:
            log_entry = {
                "timestamp": datetime.fromtimestamp(record.created).isoformat(),
                "level": record.levelname,
                "message": self.format(record),
                "logger_name": record.name
            }
            key = f"job:{job_id}:logs"
            self.redis_conn.rpush(key, json.dumps(log_entry))
            # Set TTL to 24 hours (86400 seconds)
            self.redis_conn.expire(key, 86400)
        except Exception:
            pass

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(f"animaflow.{name}")
    if not logger.handlers:
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(name)s] %(levelname)s: %(message)s",
            datefmt="%H:%M:%S"
        ))
        logger.addHandler(console_handler)
        
        # Redis handler for UI
        redis_handler = RedisLogHandler()
        redis_handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(redis_handler)
        
        logger.setLevel(logging.INFO)
    return logger
