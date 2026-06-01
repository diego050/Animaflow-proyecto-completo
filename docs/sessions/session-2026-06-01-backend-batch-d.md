# Session Report: Backend Batch D — Bug Fixes & Optimizations — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Bug Fixes + Performance Optimizations
**Agente:** Orchestrator + General Agent

## Resumen

Último batch de la refactorización completa del backend. 5 fixes finales enfocados en bugs silenciosos y optimizaciones de performance.

## Fixes Aplicados

### D.1 — Temp file leak en export_spec_json
- **Archivo:** `app/api/exports.py`
- **Problema:** `export_spec_json` creaba `NamedTemporaryFile(delete=False)` y nunca lo borraba. Los archivos se acumulaban en disco indefinidamente.
- **Fix:** Reemplazar con `StreamingResponse` + `io.BytesIO` — mismo patrón que ya usaba `download_scene_spec` en el mismo archivo. Cero archivos temporales.

### D.2 — GET con side-effects en list_voices
- **Archivo:** `app/api/voices.py`
- **Problema:** `GET /api/voices/` creaba una voz default si el usuario no tenía voces. Violación del principio REST: GET debe ser solo lectura.
- **Fix:** `list_voices` ahora solo retorna la lista (puede estar vacía). Nuevo endpoint `POST /api/voices/initialize-default` para crear la voz default explícitamente.

### D.3 — SSE polling → LISTEN/NOTIFY
- **Archivo:** `app/api/stream.py`
- **Problema:** El SSE endpoint pollaba la DB cada 0.5 segundos. Con 10 usuarios = 20 queries/segundo, la mayoría sin cambios.
- **Fix:** Usa asyncpg LISTEN en el canal `jobs` (mismo que usa el scheduler) para notificaciones en tiempo real. Fallback polling cada 5 segundos. Reducción de 10x en queries.

### D.4 — Cachear ApiKey decrypt
- **Archivo:** `app/db/models.py`
- **Problema:** `ApiKey.api_key` property desencriptaba con Fernet cada vez que se accedía. Múltiples accesos = múltiples decrypts innecesarios.
- **Fix:** Cachea el valor desencriptado en `_cached_api_key`. Fernet solo se ejecuta una vez por instancia del modelo.

### D.5 — Embedding como Vector column
- **Archivo:** `app/db/models.py`
- **Problema:** `ComponentModel.embedding` usaba `Column(JSON)`. No se podía hacer búsqueda por similitud de coseno en PostgreSQL.
- **Fix:** Cambiado a `Column(Vector(768))` (misma dimensión que Gemini). pgvector ya estaba instalado. Ahora permite `ORDER BY embedding <=> query_embedding` para búsqueda semántica nativa.

## Métricas del Batch D

| Métrica | Antes | Después |
|---------|-------|---------|
| Archivos temporales por export | 1 (nunca borrado) | 0 |
| GET side-effects | 1 | 0 |
| Queries SSE por usuario/seg | 2 | 0.2 |
| Fernet decrypts por request | Múltiples | 1 |
| Embeddings buscables por SQL | No | Sí |

## Estado Final del Proyecto

Todos los 27 problemas identificados en el análisis exhaustivo del backend han sido resueltos:
- 8 fixes críticos (Sección 1)
- 5 fixes de limpieza (Batch A)
- 5 fixes de consistencia (Batch B)
- 4 fixes de refactorización (Batch C)
- 5 fixes de bug/performance (Batch D)
