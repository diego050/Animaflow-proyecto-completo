# Sprint 7 Report: Backend Modularization + Production Hardening

> **Fecha:** 18 de Mayo de 2026 | **Status:** ✅ Completado
> **Enfoque:** Refactor del backend de monolito a monolito modular + hardening para producción

---

## Goals

1. Modularizar el backend: de 7 archivos monolíticos a dominios aislados
2. Reducir complejidad: ningún archivo > 250 líneas
3. Agregar tests de integración con snapshot protection
4. Reemplazar `print()` con logging estructurado
5. Corregir manejo de excepciones (eliminar `except Exception` silenciosos)
6. Implementar encriptación de API keys en base de datos
7. Validar JWT secret en startup
8. Segregar colas de workers (default vs render)
9. Crear Docker Compose para producción
10. Limpiar archivos legacy y temporales

---

## What Was Completed

### Phase 1: Parsers Modularization (Low Risk)

**Before:** `services/svg_parser.py` (614 líneas), `services/tsx_enriched_analyzer.py` (730 líneas), `services/tsx_animation_parser.py` (392 líneas)

**After:** 11 archivos especializados en `modules/parsers/`

| Module | Files | Responsibility |
|---|---|---|
| `modules/parsers/svg/` | 6 files | SVG extraction, shape parsing, gradients, paths |
| `modules/parsers/tsx/` | 5 files | TSX analysis, transforms, animations, elements |

**Key result:** All pure functions with no side effects. Easy to test.

### Phase 2: AE Export Modularization (Medium Risk)

**Before:** `services/ae_export.py` (1,057 líneas), `services/ae_deterministic_generator.py` (844 líneas)

**After:** 10 archivos en `modules/ae_export/`

| Module | Files | Responsibility |
|---|---|---|
| `ae_export/deterministic/` | 6 files | Deterministic script generation |
| `ae_export/shape_renderers/` | 7 files | Registry pattern for shape types |
| `ae_export/script_builder.py` | 1 file | Script assembly |
| `ae_export/zip_exporter.py` | 1 file | ZIP creation, audio download |
| `ae_export/worker.py` | 1 file | RQ entry point |

**Key result:** Registry pattern — adding a new shape renderer = 1 file + 1 line in dictionary.

### Phase 3: Pipeline Decomposition (High Risk)

**Before:** `services/pipeline.py` — **1,967 líneas** (god module)

**After:** 24 archivos en 4 dominios

| Domain | Files | Key Functions |
|---|---|---|
| `modules/tts/` | 2 files | `generate_tts_with_voicebox()` |
| `modules/segmentation/` | 2 files | `split_text_into_chunks()` |
| `modules/llm/` | 10 files | LLM client, script generation, visual spec, AE metadata |
| `modules/remotion/` | 6 files | Component generation, rendering, index writing |
| `modules/pipeline/` | 4 files | Orchestrator, scene manager, persistence |

**Key result:** Orchestrator reduced from 1,967 líneas to **127 líneas** (-93%).

### Phase 4: Cleanup & Documentation

- ✅ Updated API routers to import from `app.modules.*` directly
- ✅ Removed legacy shim files from `services/`
- ✅ Created `modules/README.md` with dependency rules and migration table
- ✅ Created backward compatibility re-exports during transition

---

## P0 — Critical Hardening

### Structured Logging

**Created:** `backend/app/core/logging.py`

**Replaced:** ~45 `print()` statements across 17 files

```python
# Before
print(f"[{job_id}] Generating AE script for scene {i}...")

# After
from app.core.logging import get_logger
logger = get_logger("ae_export")
logger.info("Generating AE script for scene %d", i, extra={"job_id": job_id})
```

### Specific Exception Handling

**Refactored:** 31 occurrences of bare `except Exception`

- Retry loops: Keep broad catch but log with `logger.exception()` before re-raise
- Recoverable fallbacks: Narrowed to specific exceptions (`httpx.HTTPError`, `OSError`, `json.JSONDecodeError`, `ValueError`)
- Documented fallback paths with explicit comments

### Parser Unit Tests

**Created:**
- `tests/test_parsers_svg.py` — 9 tests
- `tests/test_parsers_tsx.py` — 3 tests
- `tests/test_parsers_idempotency.py` — 1 test

**Total:** 13 new unit tests (pure functions, no mocking needed)

---

## P1 — Important Hardening

### JWT Secret Validation

**Modified:** `backend/app/core/config.py`

```python
@validator("SECRET_KEY")
def validate_secret_key(cls, v, values):
    if values.get("ENV") == "production" and v == "dev-secret-key-change-in-production":
        raise ValueError("SECRET_KEY must be set in production")
    return v
```

**Added:** Startup assertion in `main.py` that fails fast if secrets not configured.

### API Key Encryption

**Created:** `backend/app/core/encryption.py`

- Uses `cryptography.fernet.Fernet` for symmetric encryption
- Transparent encrypt/decrypt via property getter/setter on `ApiKey` model
- Database column remains `api_key` for schema compatibility

### Worker Queue Segregation

**Created:** `backend/worker.py` with `--queues` argument

**Queue topology:**
- `default`: TTS, LLM, scene generation (fast tasks)
- `render`: Remotion MP4 render, AE export (heavy, long-running)

**Deployment:**
```bash
python -m worker --queues default    # 2 replicas
python -m worker --queues render      # 1 replica
```

### Docker Compose Production

**Created:** `docker-compose.prod.yml`

Services: `api`, `worker-default` (2 replicas), `worker-render`, `postgres`, `redis`

**Updated:** `docker-compose.yml` (dev) — aligned Postgres credentials, added volume

---

## P2 — Cleanup

### Removed Legacy Shims

Deleted 7 shim files from `backend/app/services/`. Zero imports from `app.services.*` remain.

### Cleaned Root Files

Deleted temporary files:
- `fix_all_matchnames.py`
- `search_logs.py`
- `test_deterministic.py`
- `test_enriched.py`
- `test_output.txt`
- `verify_fix.py`

Updated `.gitignore` with `*.egg`, `*.egg-info/`, `*.log`

---

## Test Results

```bash
$ pytest tests/ -v

============================= test session starts =============================
collected 16 items

tests/test_parsers_idempotency.py::test_parse_svg_is_idempotent PASSED
tests/test_parsers_svg.py::test_parse_simple_rect PASSED
tests/test_parsers_svg.py::test_parse_circle PASSED
tests/test_parsers_svg.py::test_parse_multiple_shapes PASSED
tests/test_parsers_svg.py::test_parse_empty_svg PASSED
tests/test_parsers_svg.py::test_parse_with_gradient PASSED
tests/test_parsers_svg.py::test_parse_paths PASSED
tests/test_parsers_svg.py::test_parse_rects_private PASSED
tests/test_parsers_svg.py::test_parse_circles_private PASSED
tests/test_parsers_svg.py::test_parse_gradients_private PASSED
tests/test_parsers_tsx.py::test_analyze_simple_tsx PASSED
tests/test_parsers_tsx.py::test_analyze_empty_tsx PASSED
tests/test_parsers_tsx.py::test_extract_group_transforms PASSED
tests/test_pipeline_integration.py::TestPipelineSnapshot::test_pipeline_produces_valid_spec PASSED
tests/test_pipeline_integration.py::TestPipelineSnapshot::test_pipeline_spec_snapshot PASSED
tests/test_pipeline_integration.py::TestPipelineIdempotency::test_rerun_pipeline_same_output PASSED

============================== 16 passed in 113.07s ==========================
```

**16/16 tests passing** — 0 regressions.

---

## Metrics

| Metric | Before | After |
|---|---|---|
| Largest file | `pipeline.py` — 1,967 líneas | `llm/ae_metadata.py` — 217 líneas |
| Average file size | ~783 líneas | ~105 líneas |
| Files in `services/` | 7 monoliths | 0 (shims removed) |
| Domain modules | 0 | 7 |
| Python files in `modules/` | 0 | 52 |
| No file exceeds 250 lines | ❌ | ✅ |
| Tests | 0 | 16 |
| Prints for logging | ~45 | 0 |
| Bare `except Exception` | 31 | 0 (all narrowed or documented) |
| API key encryption | Plaintext | Fernet encrypted |
| Worker queues | 1 (`default`) | 2 (`default`, `render`) |
| Docker production | ❌ | ✅ |

---

## Configuration Changes

### New Required Environment Variables

```bash
# Production only
ENV=production
SECRET_KEY=<strong-random-string>
ENCRYPTION_KEY=<fernet-key>

# Generate Fernet key:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Docker Compose

```bash
# Development
docker-compose up -d postgres redis

# Production
docker-compose -f docker-compose.prod.yml up -d
```

---

## Files Created/Modified

### Created (Backend)

| File | Description |
|---|---|
| `app/core/logging.py` | Structured logging with `get_logger()` |
| `app/core/encryption.py` | Fernet encryption for API keys |
| `app/modules/` (52 files) | 7 domain modules |
| `app/modules/README.md` | Module documentation and migration guide |
| `tests/test_parsers_svg.py` | 9 SVG parser unit tests |
| `tests/test_parsers_tsx.py` | 3 TSX parser unit tests |
| `tests/test_parsers_idempotency.py` | Parser idempotency test |
| `worker.py` | RQ worker with queue support |
| `docker-compose.prod.yml` | Production Docker stack |
| `.env.example` | Updated with new env vars |

### Modified (Backend)

| File | Change |
|---|---|
| `app/core/config.py` | Added ENV, SECRET_KEY validator, ENCRYPTION_KEY |
| `app/main.py` | Startup assertions for production secrets |
| `app/db/models.py` | ApiKey encryption via property |
| `app/api/jobs.py` | Queue-aware job enqueueing |
| `app/api/exports.py` | Queue-aware export enqueueing |
| `requirements.txt` | Added `cryptography` |

### Deleted (Backend)

| File | Reason |
|---|---|
| `app/services/pipeline.py` | Migrated to `modules/pipeline/` |
| `app/services/ae_export.py` | Migrated to `modules/ae_export/` |
| `app/services/ae_deterministic_generator.py` | Migrated to `modules/ae_export/deterministic/` |
| `app/services/svg_parser.py` | Migrated to `modules/parsers/svg/` |
| `app/services/tsx_enriched_analyzer.py` | Migrated to `modules/parsers/tsx/` |
| `app/services/tsx_animation_parser.py` | Migrated to `modules/parsers/tsx/` |
| `app/services/llm_resolver.py` | Migrated to `modules/llm/` |

### Root Files Deleted

- `fix_all_matchnames.py`
- `search_logs.py`
- `test_deterministic.py`
- `test_enriched.py`
- `test_output.txt`
- `verify_fix.py`

---

## Architecture Decision: Monolith Modular

**Score de revisión:** 9/10

**Principios aplicados:**
- Cada módulo = un dominio de negocio
- Dependencias fluyen hacia adentro (Clean Architecture)
- API pública via `__init__.py`
- Funciones puras (parsers) vs funciones con side-effects (services)

**Veredicto:** La modularización está muy bien ejecutada. Las observaciones menores (funciones `_private` exportadas, `requests` síncrono en async, consolidar postprocess) fueron corregidas durante el hardening.

---

## Next Steps

1. **Frontend:** Volver a features de usuario (editor, UX móvil)
2. **P1 follow-up:** Address remaining `datetime.utcnow()` deprecation warnings
3. **P1 follow-up:** API key leak in response (line 144 of `api/api_keys.py`)
4. **P2 follow-up:** CORS restrict in production
5. **Future:** Migrate to Pydantic v2 `@field_validator` (deprecation warnings)
