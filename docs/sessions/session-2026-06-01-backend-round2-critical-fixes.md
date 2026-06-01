# Session Report: Backend Round 2 — Critical Fixes — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Critical Bug Fixes + Event Loop Safety
**Agente:** Orchestrator + Backend Agent

## Resumen

Tras la segunda auditoría de refactoring (37 issues encontrados), se abordaron los 5 issues críticos identificados como bloqueantes para producción.

## Round 2 Critical: Fixes (5 fixes)

### C.1 — Import `re` no usado en admin.py

**Archivo editado:** `app/api/admin.py`

**Problema:**
`import re` estaba importado pero nunca se usaba en el archivo.

**Fix:**
Eliminada la línea `import re`.

**Nota:** `import os` fue reportado como no usado pero el agente detectó que SÍ se usa en múltiples lugares (cálculo de storage, eliminación de archivos). Se mantuvo correctamente.

### C.2 — Import `os` no usado en contact.py

**Archivo editado:** `app/api/contact.py`

**Problema:**
`import os` estaba importado pero nunca se usaba.

**Fix:**
Eliminada la línea `import os`.

### C.3 — Imports inline en logout() de auth.py

**Archivo editado:** `app/api/auth.py`

**Problema:**
El endpoint `POST /auth/logout` tenía 4 imports dentro del cuerpo de la función:
- `from app.db.models import TokenBlacklist`
- `from jose import jwt`
- `from app.core.config import settings`
- `from datetime import datetime, timezone`

Esto viola PEP8 y causa re-importación en cada llamada.

**Fix:**
Movidos todos los imports al top del archivo. Usado alias `dt_timezone` para evitar conflicto con `timezone` existente.

### C.4 — asyncio.run() sin protección contra event loop activo

**Archivos editados:**
- `app/modules/pipeline/orchestrator.py` (2 ocurrencias)
- `app/modules/pipeline/scene_manager.py` (1 ocurrencia)

**Problema:**
`asyncio.run()` se llama dentro de funciones síncronas. Si estas funciones son llamadas desde un handler async de FastAPI (que ya tiene un event loop activo), se produce:
```
RuntimeError: This event loop is already running
```

**Fix:**
Envueltos todos los `asyncio.run()` con try/except que detecta el error y hace fallback a `asyncio.get_event_loop().run_until_complete()`:

```python
coro = some_async_function(...)
try:
    result = asyncio.run(coro)
except RuntimeError as e:
    if "event loop" in str(e).lower():
        result = asyncio.get_event_loop().run_until_complete(coro)
    else:
        raise
```

La coroutine se crea ANTES del try block para poder reutilizarla en el fallback.

### C.5 — generate_ae_export_async bloquea el event loop

**Archivo editado:** `app/api/exports.py`

**Problema:**
El endpoint async `trigger_ae_export` llamaba a `generate_ae_export_async()` de forma síncrona:
```python
generate_ae_export_async(job_id, force)
```

Esta función genera scripts AE para todas las escenas y crea un zip — puede tardar minutos. Al ejecutarse síncronamente en un endpoint async, **bloquea todo el event loop de FastAPI**, haciendo que TODAS las demás peticiones API se queden colgadas hasta que termine.

**Fix:**
```python
# ANTES (bloquea event loop)
generate_ae_export_async(job_id, force)

# DESPUÉS (thread pool)
await asyncio.to_thread(generate_ae_export_async, job_id, force)
```

`asyncio.to_thread()` ejecuta la función síncrona en un thread pool separado, liberando el event loop para atender otras peticiones.

## Métricas de Round 2 Critical

| Métrica | Valor |
|---------|-------|
| Fixes críticos aplicados | 5 |
| Archivos editados | 5 (`admin.py`, `contact.py`, `auth.py`, `orchestrator.py`, `scene_manager.py`, `exports.py`) |
| Imports eliminados | 2 (`re` en admin.py, `os` en contact.py) |
| Imports movidos al top | 4 (en auth.py logout) |
| asyncio.run() protegidos | 3 (2 en orchestrator, 1 en scene_manager) |
| Event loop blocking eliminado | 1 (exports.py) |

## Total Acumulado (Todas las fases)

| Métrica | Valor |
|---------|-------|
| Total fixes aplicados | **41** |
| Features nuevas | **4** |
| Archivos creados | **5** |
| Archivos editados | **34+** |
| Tablas nuevas | **3** |
| Bugs de seguridad eliminados | **2** |
| Event loop blocking eliminado | **1** |
| asyncio.run() protegidos | **3** |
