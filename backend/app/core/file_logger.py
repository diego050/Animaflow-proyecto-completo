import os
import json
from datetime import datetime, timezone
from app.core.config import settings

LOG_DIR = os.path.join(settings.STORAGE_PATH, "logs")
os.makedirs(LOG_DIR, exist_ok=True)


class JobFileLogger:
    """Simple file-based logger for job progress."""

    @staticmethod
    def log(job_id: str, level: str, message: str):
        log_file = os.path.join(LOG_DIR, f"{job_id}.log")
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
