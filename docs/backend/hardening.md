# Backend Hardening Checklist

> **Last updated:** 2026-05-31 | **Status:** P0-P2 Complete + Critical Fixes

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

### Critical Fixes — Mayo 2026 ✅

| # | Task | Status | Files |
|---|------|--------|-------|
| 1 | Alembic import all models | ✅ | `alembic/env.py` |
| 2 | Remove DoS protection bypass | ✅ | `app/main.py` |
| 3 | Remove marketplace (not MVP) | ✅ | `app/api/components.py` (deleted), `app/db/models.py` |
| 4 | Async HTTP (requests → httpx) | ✅ | `app/api/contact.py`, `app/modules/llm/model_fetcher.py`, `app/api/api_keys.py` |
| 5 | Scheduler task monitoring | ✅ | `app/core/scheduler.py` |
| 6 | DB session leak fix | ✅ | `app/modules/pipeline/orchestrator.py` |
| 7 | Entrypoint.sh in Dockerfile | ✅ | `Dockerfile` |

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

## Remaining Tasks (Sección 2 — 19 fixes pendientes)

| Priority | Task | Effort |
|----------|------|--------|
| P1 | Eliminar código muerto (4 archivos) | ~15min |
| P1 | Dedicar `get_job_or_404` a deps.py | ~10min |
| P1 | Extraer job cleanup a servicio | ~20min |
| P1 | Unificar audio search | ~20min |
| P1 | Crear `__init__.py` faltantes (6 dirs) | ~5min |
| P1 | Pydantic v2 consistency | ~10min |
| P1 | Boolean comparisons SQLAlchemy | ~10min |
| P1 | datetime.utcnow() → now(timezone.utc) | ~10min |
| P1 | Eliminar get_current_active_user redundante | ~20min |
| P1 | Eliminar torch del Dockerfile | ~2min |
| P2 | Split jobs.py (778 líneas) | ~1hr |
| P2 | Fix N+1 queries en admin | ~30min |
| P2 | Admin con response_model | ~30min |
| P2 | Paginación en admin lists | ~20min |
| P2 | Temp file leak en export | ~10min |
| P2 | GET con side-effects en list_voices | ~20min |
| P2 | SSE polling → LISTEN/NOTIFY | ~1hr |
| P2 | Cachear ApiKey decrypt | ~10min |
| P2 | Embedding como Vector column | ~30min |
