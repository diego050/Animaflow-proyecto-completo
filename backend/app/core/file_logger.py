import os
import json
from datetime import datetime, timezone
from app.core.config import settings

MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024  # 10MB
MAX_LOG_FILES = 3

LOG_DIR = os.path.join(settings.STORAGE_PATH, "logs")
os.makedirs(LOG_DIR, exist_ok=True)


def _rotate_log(filepath: str):
    """Rotate log file: .log → .log.1 → .log.2, delete .log.2 if exists."""
    for i in range(MAX_LOG_FILES - 1, 0, -1):
        old = f"{filepath}.{i}"
        new = f"{filepath}.{i + 1}"
        if os.path.exists(old):
            if i + 1 >= MAX_LOG_FILES:
                os.remove(old)  # Delete oldest
            else:
                os.rename(old, new)
    if os.path.exists(filepath):
        os.rename(filepath, f"{filepath}.1")


class JobFileLogger:
    """Simple file-based logger for job progress."""

    @staticmethod
    def log(job_id: str, level: str, message: str):
        log_file = os.path.join(LOG_DIR, f"{job_id}.log")
        if os.path.exists(log_file) and os.path.getsize(log_file) > MAX_LOG_SIZE_BYTES:
            _rotate_log(log_file)
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "message": message,
        }
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")

    @staticmethod
    def get_logs(job_id: str) -> list[dict]:
        log_file = os.path.join(LOG_DIR, f"{job_id}.log")
        if not os.path.exists(log_file):
            return []
        logs = []
        with open(log_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        logs.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        return logs
