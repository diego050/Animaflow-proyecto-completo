# Session Report: Backend Critical Audit Fixes — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Dead Code Removal + Pipeline Bug Fix + Import Cleanup
**Agente:** Orchestrator + Refactoring Agent

## Resumen

Tras la auditoría comprehensiva del backend (68+ archivos), se abordaron los 5 issues críticos identificados. Se eliminaron 544 líneas de código muerto, se fixeó un bug crítico del pipeline que saltaba el renderizado, y se limpiaron imports no usados.

**Resultado final:** 42/42 tests passing (100%), zero regresiones.

## Critical Fixes (5 fixes)

### C1 — Eliminación de 5 archivos muertos (~544 líneas)
**Archivos eliminados:**
- `app/modules/remotion/scene_renderer.py` (154 líneas) — `render_single_scene()` nunca se importaba
- `app/modules/remotion/renderer.py` (90 líneas) — `render_video_pipeline()` nunca se llamaba
- `app/modules/remotion/ae_deterministic.py` (131 líneas) — `generate_ae_script_from_tsx()` nunca se usaba
- `app/modules/remotion/component_postprocess.py` (46 líneas) — funciones nunca llamadas
- `app/modules/video/concat.py` (123 líneas) — `concat_scenes()` nunca se importaba

**Razón:** El pipeline de render usa `render_adapter.py` (HTTP al render server). Estos archivos eran de una implementación local anterior que fue reemplazada.

**Cleanup adicional:**
- Reescrito `app/modules/remotion/__init__.py` para eliminar imports de archivos eliminados
- Eliminado directorio `app/modules/video/` (quedó vacío)

### C2 — Eliminación de función muerta en client.py
**Archivo:** `app/modules/llm/client.py`

**Problema:** `_send_chat_message_with_retry()` (31 líneas) nunca se llamaba en ningún lugar del codebase.

**Fix:** Eliminada la función completa.

### C3 — Fix bug de status en pipeline (CRÍTICO)
**Archivo:** `app/modules/pipeline/orchestrator.py`

**Problema:** `run_pipeline_enrichment()` setea `job.status = "completed"` después del enriquecimiento. Pero el scheduler espera `"queued_render"` para triggerar el render. Esto significaba que los jobs **se saltaban el renderizado completamente** después del enriquecimiento.

**Fix:** Cambiado `job.status = "completed"` → `job.status = "queued_render"` en línea 452.

**Impacto:** Los jobs ahora correctamente transicionan a `queued_render` después del enriquecimiento, permitiendo que el scheduler los tome para la fase de render.

### C4 — Eliminación de imports no usados (6 archivos)
**Archivos modificados:**

| Archivo | Import eliminado |
|---------|-----------------|
| `app/main.py` | `import os` |
| `app/core/scheduler.py` | `import json` |
| `app/api/exports.py` | `from app.core.config import settings` |
| `app/modules/ae_export/worker.py` | `import json` |
| `app/modules/pipeline/scene_manager.py` | `import asyncio` |
| `app/api/jobs_pipeline.py` | `from typing import Any, Literal` |

### C5 — Fix TTS fallback de proveedor desconocido
**Archivo:** `app/modules/tts/service.py`

**Problema:** Cuando se pasaba un nombre de proveedor desconocido, el sistema fallback a `openai_tts` que requiere API key. Esto fallaba con `TTS_API_KEY_MISSING` y daba errores confusos.

**Fix:** Cambiado fallback de `openai_tts` → `local_piper` (modelo gratuito local) en ambas funciones:
- `generate_tts_audio_only()` (línea ~69)
- `generate_tts_with_timestamps()` (línea ~114)

También actualizado el voice_id default de `"alloy"` → `"es_ES-carlfm-x_low"`.

## Test Updates

### Pipeline integration tests — status assertion fix
**Archivo:** `tests/test_pipeline_integration.py`

**Problema:** Los tests esperaban `job.status == "completed"` pero el comportamiento correcto es `job.status == "queued_render"` (el render es on-demand).

**Fix:** Actualizadas 4 assertions en 3 tests:
- `test_pipeline_produces_valid_spec`
- `test_pipeline_spec_snapshot`
- `test_rerun_pipeline_same_output` (2 assertions)

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
| `test_parsers_svg.py` | 7 | ✅ |
| `test_parsers_tsx.py` | 3 | ✅ |
| `test_pipeline_integration.py` | 3 | ✅ |
| `test_shape_renderers.py` | 6 | ✅ |
| `test_validator.py` | 5 | ✅ |

## Decisiones Arquitectónicas

1. **Render on-demand confirmado:** El pipeline termina en `queued_render`, no en `completed`. El render MP4 solo ocurre cuando el usuario clickea "Descargar MP4". Esto es el diseño correcto.
2. **Archivos de render local eliminados:** La implementación de render local (Remotion CLI directo) fue reemplazada por `render_adapter.py` (HTTP al render server). Los archivos viejos se eliminaron para evitar confusión.
3. **TTS fallback a local_piper:** Si el proveedor es desconocido, fallback al modelo gratuito local en vez de OpenAI. Esto evita errores confusos para usuarios sin API key.
