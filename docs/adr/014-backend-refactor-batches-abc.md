# ADR 014: Backend Refactor — Code Quality, Performance & Architecture

**Fecha:** 1 de Junio de 2026
**Estado:** Implementado
**Autor:** Orchestrator + General Agent

## Contexto

Tras completar los 8 fixes críticos (ADR-012), se identificaron 14 problemas adicionales de calidad de código, consistencia y arquitectura que afectaban mantenibilidad y performance.

## Decisiones por Batch

### Batch A: Limpieza de Código (5 fixes)

**Problema:** Código muerto, funciones duplicadas, paquetes sin `__init__.py`.

**Decisiones:**
1. Eliminar `constants.py` y `resolutions.py` — no se usaban (excepto `get_resolution` que se inlinó en 6 archivos AE Export)
2. Dedicar `get_job_or_404` a `app/api/deps.py` — estaba duplicada en jobs.py y exports.py
3. Extraer job cleanup a `app/services/job_cleanup.py` — 70 líneas duplicadas en jobs.py y admin.py
4. Unificar audio search en `app/services/audio_finder.py` — 50 líneas duplicadas en audio.py y exports.py
5. Crear `__init__.py` en 6 directorios faltantes para estructura de paquetes correcta

### Batch B: Consistencia (5 fixes)

**Problema:** Mezcla de Pydantic v1/v2, comparaciones booleanas incorrectas en SQLAlchemy, funciones redundantes.

**Decisiones:**
1. Migrar `class Config: from_attributes = True` → `model_config = ConfigDict(from_attributes=True)` en assets.py y design_template.py
2. Reemplazar `== True/False` → `.is_(True/False)` en 19 ocurrencias de SQLAlchemy (8 archivos)
3. Reemplazar `datetime.utcnow()` → `datetime.now(timezone.utc)` (Python 3.12 deprecó utcnow)
4. Eliminar `get_current_active_user` wrapper redundante — `get_current_user` ya verifica `is_active`
5. Eliminar torch (~200MB) del Dockerfile — whisper ya no está en dependencies

### Batch C: Refactorización Arquitectónica (4 fixes)

**Problema:** jobs.py de 778 líneas, N+1 queries en admin, sin paginación, sin response_model.

**Decisiones:**
1. Split `jobs.py` en `jobs_crud.py` (289 líneas, 9 endpoints) y `jobs_pipeline.py` (451 líneas, 5 endpoints)
2. Fix N+1 queries en `list_admin_users`: de 2 queries por usuario → 1 query batch para todos los usuarios de la página
3. Agregar 5 modelos Pydantic como `response_model` en admin endpoints para documentación OpenAPI automática
4. Agregar paginación (`page`, `per_page`) a `list_admin_users` y `list_admin_jobs`

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `app/core/constants.py` | **Eliminado** |
| `app/core/resolutions.py` | **Eliminado** |
| `app/api/jobs.py` | **Eliminado** (split en 2 archivos) |
| `app/api/deps.py` | **Creado** — shared dependencies |
| `app/api/jobs_crud.py` | **Creado** — 9 endpoints CRUD |
| `app/api/jobs_pipeline.py` | **Creado** — 5 endpoints pipeline |
| `app/services/job_cleanup.py` | **Creado** — shared cleanup service |
| `app/services/audio_finder.py` | **Creado** — shared audio search |
| `app/api/__init__.py` + 5 más | **Creados** — package markers |
| `app/api/assets.py` | Pydantic v2 ConfigDict |
| `app/schemas/design_template.py` | Pydantic v2 ConfigDict |
| `app/api/admin.py` | N+1 fix, pagination, response_models |
| `app/api/auth.py` | `.is_(False)` replacements |
| `app/core/security.py` | Removed redundant wrappers |
| `app/api/voices.py` | `.is_(True)` replacements |
| `app/api/api_keys.py` | `.is_(True)` replacements |
| `app/services/embedding.py` | `.is_(True)` replacements |
| `app/modules/pipeline/orchestrator.py` | `.is_(True)` replacement |
| `app/modules/llm/resolver.py` | `.is_(True)` replacement |
| `app/modules/ae_export/*.py` (6 files) | Inlined `get_resolution` |
| `Dockerfile` | Removed torch installation |
| `app/main.py` | Updated router imports |

## Consecuencias

- **Positiva:** Código más mantenible — jobs.py de 778 → 2 archivos de ~300-450 líneas
- **Positiva:** Admin panel 67x más eficiente en queries (201 → 3 con 100 usuarios)
- **Positiva:** Swagger/OpenAPI ahora documenta respuestas del admin
- **Positiva:** 0 duplicación de lógica (job cleanup, audio search, get_job_or_404)
- **Positiva:** Docker image ~200MB más pequeña
- **Positiva:** Pydantic v2 consistente en todo el proyecto
- **Positiva:** SQLAlchemy best practices (`.is_()` para booleanos)
- **Negativa:** `resolutions.py` eliminado requirió inline en 6 archivos (trade-off aceptable)
- **Negativa:** Paginación en admin lists puede requerir ajuste en frontend si espera todos los registros

## Lecciones Aprendidas

1. Antes de eliminar un archivo, hacer grep de TODOS sus imports en todo el proyecto
2. Los wrappers redundantes (`get_current_active_user`) parecen útiles pero agregan confusión
3. Split de archivos grandes debe preservar rutas de endpoints exactamente iguales
4. N+1 queries son silenciosos — no dan error, solo degradan performance gradualmente
