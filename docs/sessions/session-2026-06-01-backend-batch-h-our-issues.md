# Session Report: Backend Batch H — Issues Introduced by Our Work — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Cleanup de issues introducidos por nuestro trabajo reciente
**Agente:** Orchestrator + Backend Agent

## Resumen

Tras la auditoría de refactoring que identificó 41 issues, se encontró que **5 fueron introducidos por nuestro trabajo reciente** (sessions previas). El Batch H aborda 3 de esos 5 (los otros 2 — mutable default y llm_service — ya fueron arreglados en Batch E).

## Origen de los Issues

| Issue | Introducido en | Sesión |
|-------|---------------|--------|
| H1: SceneEditRequest en API layer | Session 2026-05-26 → movido en Batch C | Scene Editor + Split jobs.py |
| H2: psycopg2 raw en worker | Sprint 7 (Modularización) | Creación de ae_export/worker.py |
| H3: asyncpg dead code en stream | Batch D (2026-06-01) | SSE → LISTEN/NOTIFY fix |

## Batch H: Fixes (3 fixes)

### H.1 — SceneEditRequest Movido a Schemas

**Archivos editados:**
- `app/schemas/job.py` — agregada clase `SceneEditRequest`
- `app/api/jobs_pipeline.py` — eliminada definición local, ahora importa desde schemas

**Problema:**
El modelo Pydantic `SceneEditRequest` estaba definido dentro del archivo de rutas (`jobs_pipeline.py` líneas 18-28) en vez de en `app/schemas/`. Esto rompía la convención arquitectónica del proyecto donde todos los schemas Pydantic viven en `app/schemas/`.

**Fix:**
Movida la clase `SceneEditRequest` a `app/schemas/job.py`. Actualizado el import en `jobs_pipeline.py` para incluirlo desde `app.schemas.job`. Eliminado el import redundante `from pydantic import BaseModel` que ya no era necesario.

**Impacto:** 🟢 Consistencia arquitectónica — todos los schemas ahora están en el lugar correcto.

### H.2 — psycopg2 Reemplazado por SQLAlchemy + flag_modified

**Archivo editado:**
- `app/modules/ae_export/worker.py`

**Problema:**
La función `_persist_job_spec()` usaba `psycopg2` directo con un comentario que decía "Bypasses SQLAlchemy ORM entirely to avoid JSON change detection issues." Esto creaba:
- Dos patrones de acceso a DB en el mismo código (SQLAlchemy + psycopg2 raw)
- Driver sync (psycopg2) ejecutándose en un contexto async (RQ worker)
- Workaround para un problema que tiene solución nativa en SQLAlchemy

**Fix:**
Reemplazada la conexión psycopg2 raw con SQLAlchemy usando `flag_modified(job, "result_spec")`. Esta función le dice explícitamente a SQLAlchemy que el campo JSON fue modificado, resolviendo el problema de detección de cambios sin bypassear el ORM.

```python
# ANTES (workaround)
conn = psycopg2.connect(host=..., port=..., user=..., password=..., database=...)
cur.execute("UPDATE jobs SET result_spec = %s WHERE id = %s", (json.dumps(spec_dict), job_id))

# DESPUÉS (correcto)
with get_db_context() as db:
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    job.result_spec = spec_dict
    flag_modified(job, "result_spec")
    db.commit()
```

Eliminados: `import psycopg2`, `from sqlalchemy.engine.url import make_url`
Agregado: `from sqlalchemy.orm.attributes import flag_modified`

**Impacto:** 🟡 Consistencia — un solo patrón de DB en todo el código. Sin driver sync en contexto async.

### H.3 — asyncpg Dead Code Eliminado en stream.py

**Archivo editado:**
- `app/api/stream.py`

**Problema:**
El endpoint SSE tenía código asyncpg que no funcionaba:
- `notify_conn.add_listener('jobs', lambda *args: None)` — descartaba TODOS los eventos
- `notify_conn.run_in_transaction(lambda: None)` — no-op usado como sleep hack
- `db.commit()` en un loop read-only — innecesario y potencialmente problemático
- El endpoint funcionaba correctamente solo con el polling fallback

**Fix:**
Eliminado todo el código asyncpg (setup, listener, teardown). Reemplazado `db.commit()` con `db.expire_all()` que refresca correctamente la sesión para queries read-only. Simplificado el loop de polling a un simple `await asyncio.sleep(5.0)`.

```python
# ANTES (dead code)
notify_conn = await asyncpg.connect(settings.DATABASE_URL)
await notify_conn.add_listener('jobs', lambda *args: None)
...
await asyncio.wait_for(notify_conn.run_in_transaction(lambda: None), timeout=5.0)

# DESPUÉS (limpio)
db.expire_all()  # Refresh session for read-only query
...
await asyncio.sleep(5.0)  # Simple poll
```

Eliminado: `import asyncpg`, `from app.core.config import settings` (ya no necesario)
Reducido: de 101 líneas → 79 líneas

**Impacto:** 🟡 Limpieza — sin dependencias innecesarias, sin dead code paths.

## Métricas del Batch H

| Métrica | Valor |
|---------|-------|
| Fixes aplicados | 3 |
| Archivos editados | 3 (`schemas/job.py`, `jobs_pipeline.py`, `worker.py`, `stream.py`) |
| Imports eliminados | `psycopg2`, `asyncpg`, `make_url`, `BaseModel` (redundante) |
| Líneas reducidas (stream.py) | 101 → 79 (-22 líneas) |
| Patrones de DB unificados | 2 → 1 (solo SQLAlchemy) |
| Dead code eliminado | asyncpg listener + no-op transaction |

## Issues Pendientes Restantes

### Batch F (High Priority Preexistentes — ~4-6 horas)
1. N+1 adicional en retention rate (admin.py)
2. Repeated SessionLocal pattern en scheduler (6+ repeticiones)
3. `reformat_job` usa `dict = Body()` en vez de Pydantic model
4. Duplicate imports (os, JWT logic duplicada)

### Batch G (Medium — ~6-8 horas)
- 20+ casos de imports dentro de funciones que deberían estar a nivel de módulo

## Total Acumulado (Batch E + H)

| Métrica | Valor |
|---------|-------|
| Total fixes (E + H) | 8 |
| Archivos creados | 1 (`llm_service.py`) |
| Archivos editados | 7 |
| Features reparadas | 1 (chat conversacional) |
| Bugs de seguridad eliminados | 1 (cross-request contamination) |
| Queries optimizadas | 3 (activation, retention ×2) |
| Dead code eliminado | ~45 líneas |
| Dependencias eliminadas | psycopg2 (raw), asyncpg (dead code) |
