# ADR 012: Critical Backend Security & Stability Fixes

**Fecha:** 31 de Mayo de 2026
**Estado:** Implementado
**Autor:** Orchestrator + General Agent

## Contexto

Tras un análisis exhaustivo del backend (~5000+ líneas, 14 archivos de API, 12 core modules), se identificaron 8 problemas críticos que afectaban seguridad, estabilidad y confiabilidad del sistema en producción.

## Problemas Identificados

### 1. Alembic incompleto
`alembic/env.py` solo importaba 2 de los 9+ modelos de la base de datos. Las migraciones automáticas podían ignorar cambios en tablas como Voice, ApiKey, Asset, etc.

### 2. Protección DoS desactivada
`main.py` tenía `sys.set_int_max_str_digits(0)` en la línea 1, desactivando globalmente la protección de Python contra ataques de parsing de enteros gigantes.

### 3. Marketplace sin autenticación
El endpoint `POST /api/components/{id}/like` no requería autenticación. Cualquier bot podía inflar likes infinitamente.

### 4. HTTP síncrono bloqueante
`contact.py` y `model_fetcher.py` usaban `requests` (síncrono) dentro de rutas `async def`, bloqueando el event loop de FastAPI para TODOS los usuarios mientras esperaban respuestas externas.

### 5. Scheduler sin monitoreo
El scheduler lanzaba tareas con `asyncio.create_task()` sin tracking. Si una tarea fallaba, el error se perdía silenciosamente y el job quedaba atrapado en estado intermedio eternamente.

### 6. División por cero en admin stats
Si no había jobs terminados, `completed_jobs / finished_jobs` lanzaba excepción 500.

### 7. Fuga de sesiones de DB
El scheduler creaba `SessionLocal()` nuevo por cada llamada a `_get_user_api_key` sin cerrarlo, agotando las conexiones de la base de datos.

### 8. Entrypoint.sh ignorado
El Dockerfile lanzaba uvicorn directamente sin ejecutar `entrypoint.sh`, por lo que el modelo de Piper TTS nunca se descargaba automáticamente en deploys nuevos.

## Decisiones

### Alembic
Importar explícitamente TODOS los modelos en `env.py`. Así, sin importar cómo se reorganice el código, Alembic siempre conoce todas las tablas.

### DoS Protection
Eliminar `sys.set_int_max_str_digits(0)`. La protección de Python debe estar activa. Si en el futuro se necesitan números enormes, se aplica el límite solo en esa función específica.

### Marketplace
Eliminar completamente el feature del marketplace (no es parte del MVP). Se eliminó `components.py`, el modelo `CommunityComponent`, y todas las referencias. El código queda en Git para recuperación futura.

### HTTP Async
Reemplazar `requests` por `httpx.AsyncClient` en todos los puntos de I/O externo. `httpx` ya estaba en `requirements.txt`. Las funciones pasaron de `def` a `async def` con `await`.

### Scheduler Monitoring
Agregar `self.active_tasks: list` al Scheduler. Cada tarea lanzada se registra y tiene un callback que:
- La remueve de la lista al terminar
- Si falló, marca el job como "failed" en DB con el mensaje de error
- `run_forever` limpia tareas completadas en cada iteración

### División por cero
Verificación: ya estaba protegido con guard clauses. No se necesitó cambio.

### Session Leak
`_process_chunks_async` ahora usa el parámetro `db` pasado en vez de crear `SessionLocal()` nuevo. Si `db` no está disponible, usa `with SessionLocal() as temp_session:` que cierra automáticamente.

### Entrypoint.sh
Agregar `COPY entrypoint.sh`, `chmod +x`, y `ENTRYPOINT ["/app/entrypoint.sh"]` al Dockerfile. El script ya verifica si el modelo existe antes de descargarlo.

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `alembic/env.py` | Importar 9 modelos explícitamente |
| `app/main.py` | Eliminar `set_int_max_str_digits`, quitar router de components |
| `app/api/components.py` | **Eliminado** (326 líneas) |
| `app/db/models.py` | Eliminar clase `CommunityComponent` |
| `app/api/contact.py` | `requests` → `httpx.AsyncClient` |
| `app/modules/llm/model_fetcher.py` | `requests` → `httpx.AsyncClient`, funciones async |
| `app/api/api_keys.py` | `list_models` ahora async con await |
| `app/core/scheduler.py` | Task tracking + error callbacks + session reuse |
| `app/modules/pipeline/orchestrator.py` | Usar `db` parameter en vez de SessionLocal() |
| `Dockerfile` | Agregar ENTRYPOINT con entrypoint.sh |

## Consecuencias

- **Positiva:** 8 vulnerabilidades críticas resueltas
- **Positiva:** El scheduler ahora es observable — ningún error silencioso
- **Positiva:** El servidor ya no se bloquea por I/O externo
- **Positiva:** Las conexiones de DB ya no se fugan
- **Positiva:** Los deploys nuevos descargan el modelo de Piper automáticamente
- **Negativa:** Marketplace eliminado (recuperable desde Git si se necesita en v2)
- **Negativa:** `sys.set_int_max_str_digits` removido — si hay respuestas de Gemini extremadamente largas, podría haber problemas de parsing (poco probable)

## Lecciones Aprendidas

1. Cuando se elimina un modelo de la DB, hay que actualizar DOS lugares: `models.py` Y `alembic/env.py`. Olvidar esto causó un ImportError en CI/CD.
2. `requests` síncrono dentro de `async def` es un anti-patrón silencioso — no da error, solo degrada performance.
3. `asyncio.create_task()` sin tracking es "fire and forget" — los errores se pierden.
