# Session Report: Backend Round 2 — Low Priority Fixes — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Code Style + Build Reproducibility + Consistency
**Agente:** Orchestrator + Backend Agent

## Resumen

Tras la segunda auditoría de refactoring, se abordaron 7 issues de prioridad baja. 3 issues adicionales fueron verificados y mantenidos (health check hardcoded es intencional para MVP, sqlalchemy_database_uri es necesario para Alembic, admin.py inline imports ya fueron arreglados).

## Round 2 Low: Fixes (7 fixes)

### L.1 — schemas/__init__.py exports

**Archivo editado:** `app/schemas/__init__.py`

**Problema:**
Archivo vacío (0 líneas). No había exports de conveniencia para los schemas.

**Fix:**
Agregados exports para todos los schemas Pydantic:
```python
from .auth import UserCreate, UserLogin, Token, UserResponse, ...
from .job import JobCreate, JobResponse, JobListResponse, ...
from .voice import VoiceCreate, VoiceUpdate, VoiceResponse, ...
from .api_keys import ApiKeyCreate, ApiKeyResponse
from .design_template import DesignTemplateCreate, DesignTemplateResponse, ...
from .admin import AdminUserResponse, AdminJobResponse, ...
```

### L.2 — zip_exporter.py finally: pass

**Archivo editado:** `app/modules/ae_export/zip_exporter.py`

**Problema:**
Bloque `finally: pass` innecesario al final de la función.

**Fix:**
Eliminado el bloque `finally: pass` vacío.

### L.3 — config.py sqlalchemy_database_uri

**Archivo editado:** `app/core/config.py`

**Verificación:**
La propiedad `sqlalchemy_database_uri` SÍ se usa en:
- `alembic/env.py` línea 32
- `app/db/session.py` línea 9

**Decisión:** Mantener la propiedad con un comentario explicando por qué es necesaria.

### L.4 — jobs_crud.py List style

**Archivo editado:** `app/api/jobs_crud.py`

**Problema:**
`List[JobListResponse]` (estilo Python 3.8 con `from typing import List`) vs `list[...]` (estilo Python 3.9+) usado en el resto del proyecto.

**Fix:**
```python
# ANTES
from typing import List
@router.get("", response_model=List[JobListResponse])

# DESPUÉS
@router.get("", response_model=list[JobListResponse])
```

Eliminado también `from typing import List` (ya no necesario).

### L.5 — llm/resolver.py inline imports

**Archivo editado:** `app/modules/llm/resolver.py`

**Problema:**
Imports dentro de `resolve_llm_credentials()`:
```python
from app.db.models import ApiKey
from app.db.session import get_db_context
from app.core.config import settings
```

**Fix:**
Movidos al top del archivo. Eliminados del cuerpo de la función.

### L.6 — Dockerfile Python version pin

**Archivo editado:** `backend/Dockerfile`

**Problema:**
`FROM python:3.11-slim` sin versión patch específica — builds no reproducibles.

**Fix:**
```dockerfile
# ANTES
FROM python:3.11-slim

# DESPUÉS
FROM python:3.11.9-slim
```

### L.7 — requirements.txt bcrypt version

**Archivo editado:** `backend/requirements.txt`

**Problema:**
`bcrypt==3.2.0` — versión vieja con posibles vulnerabilidades de seguridad.

**Fix:**
```
# ANTES
bcrypt==3.2.0

# DESPUÉS
bcrypt>=4.0.0
```

Compatible con `passlib[bcrypt]==1.7.4`.

## Issues Verificados y Mantenidos

| Issue | Archivo | Razón |
|-------|---------|-------|
| Health check hardcoded | `admin.py:499-503` | Intencional para MVP — Redis y workers no integrados aún |
| sqlalchemy_database_uri | `config.py:22-24` | Necesario para Alembic (usado en env.py y session.py) |
| admin.py inline imports | `admin.py` | Ya fueron arreglados en fases anteriores |

## Métricas de Round 2 Low

| Métrica | Valor |
|---------|-------|
| Fixes aplicados | 7 |
| Issues verificados y mantenidos | 3 |
| Archivos editados | 6 |
| Schema exports agregados | 20+ |
| Imports inline movidos al top | 3 |
| Dead code eliminado | 1 (`finally: pass`) |
| Versiones pinned | 2 (Python 3.11.9, bcrypt>=4.0.0) |
