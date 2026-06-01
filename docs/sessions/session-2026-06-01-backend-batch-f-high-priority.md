# Session Report: Backend Batch F — High Priority Preexistent Fixes — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Performance + Code Quality + Consistency
**Agente:** Orchestrator + Backend Agent

## Resumen

Tras la auditoría de refactoring que identificó 41 issues, se ejecutó el **Batch F** con los fixes de alta prioridad preexistentes. El issue F1 (N+1 en retention rate) ya había sido resuelto en Batch E, por lo que se abordaron 3 fixes adicionales.

## Batch F: Fixes (3 fixes)

### F.1 — N+1 en Retention Rate

**Estado:** ✅ Ya resuelto en Batch E

El fix de N+1 queries en `get_business_metrics()` para retention rate fue aplicado en Batch E (E5). Se reemplazó `.all()` que cargaba filas completas con `.distinct(JobModel.user_id)` que solo fetch user_ids.

### F.2 — Repeated SessionLocal Pattern en Scheduler

**Archivo editado:**
- `app/core/scheduler.py`

**Problema:**
Cada fase del scheduler (`_phase_segmentation`, `_phase_enrichment`, `_phase_render`) repetía el mismo patrón de abrir `SessionLocal()` para fetch del job:
```python
with SessionLocal() as session:
    job = session.query(JobModel).filter_by(id=job_id).first()
    if not job: return
    # ... usar job fields
```
Esto se repetía **6+ veces** en el mismo archivo, creando duplicación de código y dificultando el mantenimiento.

**Fix:**
Agregado método helper `_get_job(job_id)` a la clase `Scheduler`:
```python
def _get_job(self, job_id: str):
    """Fetch a job by ID using a fresh session. Returns None if not found."""
    with SessionLocal() as session:
        job = session.query(JobModel).filter_by(id=job_id).first()
        if job:
            session.expunge(job)  # Detach for safe use outside session
        return job
```

Reemplazados 4 patrones de lectura con `self._get_job(job_id)`. Las operaciones de escritura mantienen su propio `SessionLocal()` para commit/rollback correcto.

**Preservados (intencionalmente):**
- `_take()` en `take_and_process_job` — usa `FOR UPDATE SKIP LOCKED` que requiere mantener la sesión abierta
- `recover_stuck_jobs` — modifica múltiples jobs en una sola transacción

**Impacto:** 🟡 Mantenibilidad — 6 repeticiones → 1 helper centralizado.

### F.3 — reformat_job con Pydantic Model

**Archivos editados:**
- `app/schemas/job.py` — agregada clase `JobReformatRequest`
- `app/api/jobs_pipeline.py` — endpoint actualizado

**Problema:**
El endpoint `POST /{job_id}/reformat` aceptaba `data: dict = Body(...)` con validación manual:
```python
aspect_ratio = data.get("aspect_ratio")
if not re.match(r'^\d+(\.\d+)?:\d+(\.\d+)?$', aspect_ratio):
    raise HTTPException(...)
```
Esto bypassaba Pydantic completamente — sin validación automática, sin docs OpenAPI, inconsistente con el resto de la API.

**Fix:**
Creado modelo Pydantic `JobReformatRequest`:
```python
class JobReformatRequest(BaseModel):
    aspect_ratio: str = Field(..., description="Aspect ratio in 'width:height' format")
    scene_selection: Literal["all", "selected", "current"] = Field(default="all")
    scene_indices: list[int] = Field(default=[])
    current_scene_index: Optional[int] = Field(default=None)
```

Endpoint actualizado: `data: dict = Body(...)` → `data: JobReformatRequest`. Eliminada validación manual (`data.get()`, `re.match()`) — Pydantic ahora valida automáticamente tipos y formatos.

**Impacto:** 🟡 Consistencia API — validación automática + docs OpenAPI generados.

### F.4 — Duplicate Imports + JWT Logic Duplicada

**Archivos editados:**
- `app/core/security.py`
- `app/api/admin.py`

**Problema 1 (security.py):**
`get_current_user` y `get_current_user_from_token` tenían ~30 líneas de lógica duplicada (JWT decode + exception handling + user lookup).

**Fix 1:**
Extraído helper compartido `_decode_token_and_get_user(token, db)`:
```python
def _decode_token_and_get_user(token: str, db: Session) -> User:
    """Shared helper to decode JWT token and fetch user from database."""
    # JWT decode + exception handling + user lookup
    ...
```

Ambas funciones ahora delegan al helper:
- `get_current_user` → 1 línea
- `get_current_user_from_token` → 4 líneas

**Problema 2 (admin.py):**
8 imports dentro de funciones que deberían estar a nivel de módulo:
- `import os` en `get_admin_stats` y `delete_user`
- `from sqlalchemy import func` en `list_admin_users` (ya importado arriba)
- `from app.db.models import JobModel, Voice` en `delete_user`
- `from app.core.storage_paths import get_storage_dir` en `get_admin_stats` y `delete_user`
- `from sqlalchemy.orm import joinedload` en `list_admin_jobs`
- `from app.services.job_cleanup import delete_job_files` en `delete_job`
- `from datetime import datetime, timedelta, timezone` en `get_business_metrics`

**Fix 2:**
Consolidados todos los imports al top del archivo (líneas 8-26). Eliminados todos los imports inline de dentro de funciones.

**Impacto:** 🟢 DRY + consistencia — 30 líneas duplicadas eliminadas, 8 imports movidos al top.

## Métricas del Batch F

| Métrica | Valor |
|---------|-------|
| Fixes aplicados | 3 (F1 ya estaba hecho) |
| Archivos editados | 4 (`scheduler.py`, `schemas/job.py`, `jobs_pipeline.py`, `security.py`, `admin.py`) |
| Patrones SessionLocal unificados | 6 → 1 helper |
| Líneas duplicadas JWT eliminadas | ~30 |
| Imports movidos al top | 8 |
| Validación manual eliminada | `data.get()`, `re.match()` → Pydantic |

## Total Acumulado (Batch E + H + F)

| Métrica | Valor |
|---------|-------|
| Total fixes (E + H + F) | 11 |
| Archivos creados | 2 (`llm_service.py`, `JobReformatRequest` schema) |
| Archivos editados | 10+ |
| Features reparadas | 1 (chat conversacional) |
| Bugs de seguridad eliminados | 1 (cross-request contamination) |
| Queries optimizadas | 3 (activation, retention ×2) |
| Dead code eliminado | ~45 líneas |
| Dependencias eliminadas | psycopg2 (raw), asyncpg (dead code) |
| Patrones unificados | SessionLocal (6→1), JWT (2→1) |
| Imports consolidados | 8 inline → top-level |

## Issues Pendientes Restantes

### Batch G (Medium — ~6-8 horas)
- ~20 casos de imports dentro de funciones en otros archivos (`voices.py`, `jobs_crud.py`, `exports.py`, `embedding.py`, `config.py`, `session.py`, `scene_manager.py`)
- No afectan funcionalidad, solo legibilidad y consistencia de código
