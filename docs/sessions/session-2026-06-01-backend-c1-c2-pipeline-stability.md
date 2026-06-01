# Session Report: Backend C1 + C2 — Pipeline Stability — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Critical Pipeline Stability
**Agente:** Orchestrator + Refactoring Agent

## Resumen

Se abordaron los 2 issues críticos restantes de la auditoría de refactoring: race conditions en el pipeline de jobs y manejo inseguro de event loops. Ambos son fixes de estabilidad que previenen problemas en producción bajo carga.

**Resultado final:** 42/42 tests passing (100%), zero regresiones.

## C1 — Pipeline Race Conditions (3 fixes)

### C1.1 — Eliminar "pending" como status válido en run_pipeline_enrichment()
**Archivo:** `app/modules/pipeline/orchestrator.py`

**Problema:** `run_pipeline_enrichment()` aceptaba jobs en status `["segmented", "visuals_generating", "queued_enrichment", "pending"]`. El status `"pending"` era un backdoor que permitía saltarse la segmentación. Si alguien llamaba a esta función directamente en un job pending, se procesaba sin haber sido segmentado primero.

**Fix:** Removido `"pending"` de la lista de statuses válidos. Ahora solo acepta `["segmented", "visuals_generating", "queued_enrichment"]`. Los jobs en "pending" deben pasar por segmentación primero.

### C1.2 — Idempotencia en enriquecimiento (skip TTS + LLM si ya existe)
**Archivo:** `app/modules/pipeline/orchestrator.py`

**Problema:** Si el scheduler crasheaba a mitad del enriquecimiento y se reiniciaba, re-procesaba escenas que ya tenían audio TTS generado. Desperdiciaba créditos de TTS y tiempo de LLM.

**Fix:**
- Antes de generar TTS: verificar si `scene.get("audio_url")` ya existe. Si sí, skip con log `"Scene %d already has audio, skipping TTS"`.
- Antes de llamar al LLM para animaciones: verificar si `scene.get("anima_composer")` ya existe. Si sí, skip con log `"Scene %d already has animation spec, skipping LLM call"`.

**Impacto:** El enriquecimiento ahora es idempotente. Se puede reintentar sin duplicar trabajo ni gastar créditos extra.

### C1.3 — Eliminar "pending" en run_pipeline_approved()
**Archivo:** `app/modules/pipeline/orchestrator.py`

**Problema:** Mismo backdoor que C1.1 pero en la función `run_pipeline_approved()`.

**Fix:** Removido `"pending"` de los statuses válidos. Ahora solo acepta `["segmented"]`.

## C2 — Event Loop Management

### C2.1 — Simplificar run_async() a asyncio.run()
**Archivo:** `app/core/async_utils.py`

**Problema:** La función `run_async()` tenía un fallback que creaba nuevos event loops manualmente con `asyncio.new_event_loop()` y `asyncio.set_event_loop()`. Esto es:
- Deprecated en Python 3.10+
- Causa memory leaks bajo carga concurrente
- Puede causar "Event loop is closed" errors

**Insight clave:** `run_async()` SOLO se llama desde `run_pipeline()` y `run_pipeline_enrichment()` que son funciones síncronas. El scheduler las ejecuta vía `loop.run_in_executor()` en un **thread pool worker**. Los worker threads NO tienen event loop. Entonces `asyncio.run()` SIEMPRE funciona en el flujo normal.

El fallback solo era necesario si alguien llamaba `run_pipeline()` directamente desde un endpoint de FastAPI (que tiene event loop). Pero ese no es el flujo normal y debería ser un error.

**Fix:** Reemplazada toda la función con `return asyncio.run(coro)`. Más simple, más seguro, usa el approach moderno de Python. Si alguien la usa mal (desde un event loop), recibe un `RuntimeError` claro en vez de memory leaks silenciosos.

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
| `test_parser.py` | 5 | ✅ |
| `test_parsers_idempotency.py` | 1 | ✅ |
| `test_parsers_svg.py` | 8 | ✅ |
| `test_parsers_tsx.py` | 3 | ✅ |
| `test_pipeline_integration.py` | 3 | ✅ |
| `test_shape_renderers.py` | 6 | ✅ |
| `test_validator.py` | 5 | ✅ |

## Decisiones Arquitectónicas

1. **State machine estricta:** Los jobs deben pasar por cada fase en orden. No hay atajos. "pending" → segmentación → enriquecimiento → render.
2. **Idempotencia por diseño:** Cada fase verifica si el trabajo ya fue hecho antes de hacerlo. Esto permite reintentos seguros sin duplicar costos.
3. **asyncio.run() exclusivo:** El fallback de event loops manuales fue eliminado porque el scheduler ya maneja la concurrencia vía thread pool. Si alguien necesita llamar código async desde FastAPI, debe usar `await` directamente.
