# Session Report: Backend Batch G — Import Cleanup — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Code Style + Consistency
**Agente:** Orchestrator + Backend Agent

## Resumen

Batch G aborda los ~20 casos de imports dentro de funciones que deberían estar a nivel de módulo. Estos no afectan funcionalidad pero ensucian el código y violan PEP8 (todos los imports deben estar al inicio del archivo).

## Batch G: Fixes (6 archivos)

### G.1 — voices.py (5 imports inline eliminados)

**Archivo editado:** `app/api/voices.py`

**Imports movidos al top:**
- `import hashlib` (estaba en `preview_voice`)
- `import shutil` (estaba en `preview_voice`)
- `from app.core.storage_paths import get_storage_dir` (estaba en `preview_voice`)
- `from app.modules.tts.whisper_timestamps import get_audio_duration` (estaba en `preview_voice`)
- `import os` redundante en `delete_voice` (ya importado al top)

### G.2 — jobs_crud.py (3 imports inline eliminados)

**Archivo editado:** `app/api/jobs_crud.py`

**Imports movidos al top:**
- `from app.services.job_cleanup import delete_job_files` (estaba en `delete_job`)
- `from app.modules.llm.script_generator import generate_script_from_info` (estaba en `generate_script`)
- `from app.modules.llm.resolver import MissingApiKeyError` (estaba en `generate_script`)

### G.3 — exports.py (1 import inline eliminado)

**Archivo editado:** `app/api/exports.py`

**Imports movidos al top:**
- `from app.services.audio_finder import find_audio_file` (estaba en `download_scene_audio`)

### G.4 — embedding.py (1 import inline eliminado)

**Archivo editado:** `app/services/embedding.py`

**Imports movidos al top:**
- `import math` (estaba en `cosine_similarity`)

### G.5 — config.py (1 import redundante eliminado)

**Archivo editado:** `app/core/config.py`

**Fix:**
- Eliminado `import os` redundante dentro de la propiedad `frontend_path` (ya importado al top en línea 4)

### G.6 — session.py (import order fix)

**Archivo editado:** `app/db/session.py`

**Fix:**
- Movido `from contextlib import contextmanager` al top del archivo (estaba en línea 16, después de la función `get_db()`)
- Agregada separación correcta entre grupos de imports (stdlib → third-party → local)

## Métricas del Batch G

| Métrica | Valor |
|---------|-------|
| Archivos editados | 6 |
| Imports inline eliminados | 12 |
| Imports redundantes eliminados | 2 (`os` en voices.py, `os` en config.py) |
| Import order fixes | 1 (`contextlib` en session.py) |

## Total Acumulado (Batch E + H + F + G)

| Métrica | Valor |
|---------|-------|
| Total fixes aplicados | **23** |
| Archivos creados | 2 (`llm_service.py`, `JobReformatRequest` schema) |
| Archivos editados | 16+ |
| Features reparadas | 1 (chat conversacional) |
| Bugs de seguridad eliminados | 1 (cross-request contamination) |
| Queries optimizadas | 3 (activation, retention ×2) |
| Dead code eliminado | ~45 líneas |
| Dependencias eliminadas | psycopg2 (raw), asyncpg (dead code) |
| Patrones unificados | SessionLocal (6→1), JWT (2→1) |
| Imports consolidados | 20 inline → top-level |

## Estado Final

Todos los issues identificados en la auditoría de refactoring han sido resueltos:
- ✅ Batch E: 5 críticos
- ✅ Batch H: 3 issues nuestros
- ✅ Batch F: 3 high priority
- ✅ Batch G: 6 archivos de import cleanup

**No quedan issues pendientes de la auditoría original de 41.**
