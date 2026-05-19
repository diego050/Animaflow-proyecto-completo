# Backend Hardening Checklist

> **Last updated:** 2026-05-18 | **Status:** P0-P2 Complete

---

## Hardening Categories

### P0 — Critical (Production Blockers) ✅

| # | Task | Status | Files |
|---|------|--------|-------|
| 1 | Structured logging | ✅ | `core/logging.py`, 17 modules |
| 2 | Specific exception handling | ✅ | 31 occurrences refactored |
| 3 | Parser unit tests | ✅ | `tests/test_parsers_*.py` (13 tests) |
| 4 | Async I/O fix (`requests` → `httpx`) | ✅ | `pipeline/orchestrator.py` |
| 5 | Remove `_private` exports | ✅ | `ae_export/`, `llm/` `__init__.py` |

### P1 — Important (Scaling Blockers) ✅

| # | Task | Status | Files |
|---|------|--------|-------|
| 6 | JWT secret validation | ✅ | `core/config.py`, `main.py` |
| 7 | API key encryption | ✅ | `core/encryption.py`, `db/models.py` |
| 8 | Worker queue segregation | ✅ | `worker.py`, `api/jobs.py` |
| 9 | Docker Compose production | ✅ | `docker-compose.prod.yml` |

### P2 — Nice to Have ✅

| # | Task | Status | Files |
|---|------|--------|-------|
| 10 | Remove legacy shims | ✅ | Deleted 7 files |
| 11 | Clean root temp files | ✅ | Deleted 7 files |
| 12 | Update `.gitignore` | ✅ | Added patterns |

## Structured Logging

### Usage

```python
from app.core.logging import get_logger

logger = get_logger("module_name")

logger.info("Processing job %s", job_id)
logger.warning("Retry attempt %d failed", attempt)
logger.error("Export failed: %s", error_msg)
logger.debug("Detailed state: %r", state)
```

### Log Format

```
14:32:15 [animaflow.ae_export] INFO: Generating AE script for scene 3
14:32:16 [animaflow.pipeline] ERROR: TTS generation failed: Connection timeout
```

## Exception Handling Patterns

### ❌ Don't

```python
try:
    response = requests.get(url)
except Exception as e:
    print(f"Error: {e}")
    return None
```

### ✅ Do

```python
import httpx

logger = get_logger("tts")

try:
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=30)
        response.raise_for_status()
except httpx.HTTPStatusError as e:
    logger.error("HTTP %d from %s", e.response.status_code, url)
    raise
except httpx.RequestError as e:
    logger.error("Request failed: %s", e)
    raise
except Exception:
    logger.exception("Unexpected error in TTS generation")
    raise
```

## Security Configuration

### Required Environment Variables (Production)

```bash
ENV=production
SECRET_KEY=<32+ char random string>
ENCRYPTION_KEY=<Fernet key>
```

### Generate Fernet Key

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Startup Validation

The app will fail to start in production if:
- `SECRET_KEY` is not set or uses default value
- `ENCRYPTION_KEY` is not set

## Worker Queues

### Queue Topology

| Queue | Tasks | Workers |
|-------|-------|---------|
| `default` | TTS, LLM, scene generation | 2 replicas |
| `render` | MP4 render, AE export | 1 replica |

### Deployment

```bash
# Fast workers
python -m worker --queues default

# Heavy workers
python -m worker --queues render

# Both (development)
python -m worker --queues default render
```

## Docker Compose

### Development

```bash
docker-compose up -d postgres redis
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Services

| Service | Replicas | Purpose |
|---------|----------|---------|
| `api` | 1 | FastAPI application |
| `worker-default` | 2 | Fast task workers |
| `worker-render` | 1 | Heavy task workers |
| `postgres` | 1 | Database |
| `redis` | 1 | Queue broker |

## Remaining Tasks

| Priority | Task | Effort |
|----------|------|--------|
| P1 | Fix `datetime.utcnow()` deprecation warnings | ~30min |
| P1 | Restrict CORS in production | ~10min |
| P1 | Fix API key leak in response | ~30min |
| P2 | Migrate to Pydantic v2 `@field_validator` | ~1h |
