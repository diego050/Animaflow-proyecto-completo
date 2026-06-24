# Session Report: Backend TTS Provider Cleanup — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Dead Code Removal + Consistency Fix
**Agente:** Orchestrator + Refactoring Agent

## Resumen

Se limpiaron los proveedores de TTS: se eliminó Voicebox (no soportado en VPS), se eliminó el stub de Gemini TTS (Google no tiene API pública de TTS con ese endpoint), y se exportó correctamente OpenAI TTS.

**Resultado final:** 42/42 tests passing (100%), zero regresiones.

## Fixes (3 fixes)

### Fix 1 — Eliminación completa de Voicebox

**Archivos modificados:**
- `app/core/config.py` — eliminado campo `VOICEBOX_URL`
- `app/db/models.py` — eliminada columna `voicebox_profile_id` del modelo `Voice`
- `app/api/voices.py` — eliminadas referencias a `voicebox_profile_id`
- `app/api/auth.py` — eliminado `voicebox_profile_id` de la creación de voz por defecto en registro
- `app/schemas/voice.py` — eliminado `voicebox_profile_id` de `VoiceResponse`
- `scripts/seed_default_voices.py` — eliminada referencia
- `app/modules/ae_export/zip_exporter.py` — actualizado docstring
- `app/modules/README.md` — actualizada referencia de función
- `frontend/src/types/auth.ts` — eliminado `voicebox_profile_id` de `BackendVoice`

**Nota:** La migración Alembic `c2d55e8f9a01_add_voices_table.py` mantiene la columna `voicebox_profile_id` por ser registro histórico. La columna queda en la DB pero ya no es referenciada por el código.

### Fix 2 — Exportar OpenAI TTS Provider

**Archivo:** `app/modules/tts/providers/__init__.py`

**Problema:** `OpenAITTSProvider` estaba implementado y funcionando, pero no se exportaba desde `__init__.py`. Se importaba directamente en `service.py`, lo cual era inconsistente con los demás providers.

**Fix:** Agregado `OpenAITTSProvider` a los imports y `__all__` del `__init__.py`.

### Fix 3 — Eliminación de Gemini TTS stub

**Archivos modificados:**
- `app/modules/tts/providers/gemini_tts.py` — **ELIMINADO** (28 líneas de stub con `NotImplementedError`)
- `app/modules/tts/providers/__init__.py` — eliminado import y export
- `app/modules/tts/service.py` — eliminado import y entrada del dict `PROVIDERS`
- `app/schemas/job.py` — actualizada descripción de `tts_provider` (reemplazado `gemini_tts` por `openai_tts`)
- `app/.env.example` — actualizado comentario
- `frontend/src/types/job.ts` — reemplazado `gemini_tts` por `openai_tts` en `AVAILABLE_TTS_PROVIDERS`

## TTS Providers Disponibles (después del cleanup)

| Provider | Tipo | Requiere API Key | Estado |
|----------|------|:---:|--------|
| `local_piper` | Local (subprocess) | ❌ No | ✅ Default |
| `elevenlabs` | API externa | ✅ Sí | ✅ Working |
| `google_tts` | API externa | ✅ Sí | ✅ Working |
| `openai_tts` | API externa | ✅ Sí | ✅ Working |

## Test Results

| Metric | Count |
|---|---|
| Total Collected | 42 |
| Passed | 42 |
| Failed | 0 |
| Errors | 0 |
