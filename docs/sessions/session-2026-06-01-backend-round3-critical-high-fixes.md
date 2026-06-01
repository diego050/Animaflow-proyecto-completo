# Session Report: Backend Round 3 — Critical + High Priority Fixes — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Critical Bug Fixes + Code Quality + Test Maintenance
**Agente:** Orchestrator + Backend Agent

## Resumen

Tras la tercera auditoría de refactoring, se abordaron 2 issues críticos y 6 issues de alta prioridad. Se corrigieron además 2 issues adicionales descubiertos durante la validación de tests (db.flush() en auth.py, mock targets obsoletos en tests).

**Resultado final:** 42/42 tests passing (100%).

## Round 3 Critical: Fixes (2 fixes)

### C.1 — schemas/__init__.py broken import

**Archivo editado:** `app/schemas/__init__.py`

**Problema:**
Líneas 40-45 importaban desde `.admin` pero `app/schemas/admin.py` NO existe. Los admin schemas están definidos localmente en `app/api/admin.py`. Esto causaba un `ModuleNotFoundError` al iniciar la app.

**Fix:**
Eliminado el bloque `from .admin import (...)` completo (líneas 40-45).

### C.2 — auth.py double db.commit() en register

**Archivo editado:** `app/api/auth.py`

**Problema:**
El endpoint `/register` hacía dos `db.commit()`: uno después de crear el User (línea 60) y otro después de crear el Voice (línea 73). Si la creación del Voice fallaba, el User quedaba huérfano en la DB.

**Fix:**
- Eliminado el primer `db.commit()` y `db.refresh(user)`
- Agregado `db.flush()` después de `db.add(user)` para generar el `user.id` sin commitear
- Un único `db.commit()` final persiste ambos registros atómicamente

## Round 3 High: Fixes (6 fixes)

### H.1 — Dead import en auth.py

**Archivo editado:** `app/api/auth.py`

**Problema:**
Línea 30: `from app.core.security import decode_access_token` — importado pero nunca usado. El logout usa `jwt.decode` directamente.

**Fix:** Eliminada la línea de import.

### H.2 — Dead import en worker.py

**Archivo editado:** `app/modules/ae_export/worker.py`

**Problema:**
Línea 17: `from .script_builder import create_ae_full_script` — importado pero nunca usado.

**Fix:** Eliminada la línea de import.

### H.3 — Dead imports en orchestrator.py

**Archivo editado:** `app/modules/pipeline/orchestrator.py`

**Problema:**
Líneas 20-21: `render_single_scene`, `SCENES_STORAGE`, `concat_scenes`, `VIDEOS_STORAGE` — importados pero nunca usados. El render lo maneja el scheduler vía `RenderAdapter`.

**Fix:** Eliminadas ambas líneas de import.

### H.4 — run_pipeline_approved() docstring misleading

**Archivo editado:** `app/modules/pipeline/orchestrator.py`

**Problema:**
El docstring decía "Fase 2+3: Enriquecimiento y renderizado sincrónico" pero la función solo hace enriquecimiento (Fase 2). El render MP4 es on-demand cuando el usuario clickea descargar.

**Fix:** Actualizado el docstring para reflejar correctamente que es solo "Fase 2: Enriquecimiento sincrónico (TTS + animaciones)" y que el render es on-demand.

### H.5 — JWT decode logic duplicada en security.py

**Archivo editado:** `app/core/security.py`

**Problema:**
`_decode_token_and_get_user()` y `get_current_user()` tenían ~35 líneas de lógica duplicada (JWT decode + user lookup). Además, el blacklist check solo existía en `get_current_user()`, dejando `get_current_user_from_token()` sin verificación de blacklist.

**Fix:**
- Movido el blacklist check dentro de `_decode_token_and_get_user()` como single source of truth
- `get_current_user()` reducido a una sola línea: `return _decode_token_and_get_user(credentials.credentials, db)`
- `get_current_user_from_token()` ahora también verifica blacklist automáticamente

### H.6 — _cleanup_done_tasks() race condition en scheduler.py

**Archivo editado:** `app/core/scheduler.py`

**Problema:**
Tanto `_task_done_callback()` como `_cleanup_done_tasks()` removían tareas de `self.active_tasks`. El código ya era seguro gracias al guard `if task in self.active_tasks`, pero la intención no estaba documentada.

**Fix:** Agregado docstring explicando el diseño: el callback remueve normalmente, `_cleanup_done_tasks` es un safety net para edge cases.

## Test Fixes (2 additional fixes discovered during validation)

### T.1 — auth.py db.flush() missing

**Archivo editado:** `app/api/auth.py`

**Problema:**
Tras eliminar el primer `db.commit()`, el `user.id` era `None` al crear el Voice porque SQLAlchemy no asigna el ID hasta un flush/commit.

**Fix:** Agregado `db.flush()` después de `db.add(user)` para generar el ID dentro de la transacción.

### T.2 — Pipeline test mock targets obsoletos

**Archivo editado:** `tests/test_pipeline_integration.py`

**Problema:**
Los fixtures de test mockeaban `render_single_scene` y `concat_scenes` que fueron eliminados del orchestrator durante refactoring. Los tests fallaban al setup con `AttributeError`.

**Fix:** Eliminados los `@patch` decorators para `render_single_scene` y `concat_scenes` de ambos fixtures (`mock_external_services` y `mock_external_services_idempotency`).

## Test Results

| Metric | Count |
|---|---|
| Total Collected | 42 |
| Passed | 42 |
| Failed | 0 |
| Errors | 0 |

### Breakdown por archivo

| Archivo | Tests | Status |
|---|---|---|
| `test_auth.py` | 9 | ✅ |
| `test_parser.py` | 4 | ✅ |
| `test_parsers_idempotency.py` | 1 | ✅ |
| `test_parsers_svg.py` | 8 | ✅ |
| `test_parsers_tsx.py` | 3 | ✅ |
| `test_pipeline_integration.py` | 3 | ✅ |
| `test_shape_renderers.py` | 7 | ✅ |
| `test_validator.py` | 5 | ✅ |

## Issues Remaining (Medium/Low - deferred)

La auditoría Round 3 identificó además 12 issues medium y 12 low que fueron deferidos para post-MVP:
- Archivos grandes para split (admin.py, scene_editor.py, orchestrator.py) — complejidad >2 días
- FastAPI `@app.on_event("startup")` deprecation warning — cosmético, no bloqueante
- Otros issues de code style y optimizaciones menores

## Decisiones Arquitectónicas

1. **run_pipeline_approved() NO está incompleto** — El auditor original asumió erróneamente que debería renderizar MP4. La función correctamente solo hace enriquecimiento; el render es on-demand cuando el usuario solicita descargar el video.
2. **JWT single source of truth** — `_decode_token_and_get_user()` ahora es el único punto de validación JWT, incluyendo blacklist check.
3. **Atomic user+voice creation** — `db.flush()` permite obtener el ID sin commitear, garantizando atomicidad en el registro.
