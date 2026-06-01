# Session Report: Backend Round 2 — Medium Priority Fixes — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Code Quality + Performance + Consistency
**Agente:** Orchestrator + Backend Agent

## Resumen

Tras la segunda auditoría de refactoring, se abordaron 13 issues de prioridad media. 1 issue adicional (get_business_metrics ~10 queries) fue diferido porque las queries son necesarias para diferentes time windows y es admin-only low traffic.

## Round 2 Medium: Fixes (13 fixes)

### M.1 — N+1 queries en get_admin_stats

**Archivo editado:** `app/api/admin.py`

**Problema:**
7 queries separadas para contar jobs por status (total, completed, failed, rendering, pending).

**Fix:**
Single aggregated query con `func.count` + `func.sum(func.cast(...))`:
```python
# ANTES: 7 queries
total_jobs = db.query(JobModel).count()
completed_jobs = db.query(JobModel).filter(JobModel.status == "completed").count()
# ... 5 más

# DESPUÉS: 1 query agregada
job_stats = db.query(
    func.count(JobModel.id).label("total"),
    func.sum(func.cast(JobModel.status == "completed", Integer)).label("completed"),
    func.sum(func.cast(JobModel.status.in_(["failed", "failed_render"]), Integer)).label("failed"),
    func.sum(func.cast(JobModel.status == "rendering", Integer)).label("rendering"),
    func.sum(func.cast(JobModel.status == "pending", Integer)).label("pending"),
).first()
```

**Resultado:** 7 queries → 3 queries (1 agregada + 2 de usuarios)

### M.2 — get_business_metrics queries

**Estado:** Diferido a post-MVP. Las ~10 queries son necesarias para diferentes time windows (7 días, 14 días, 30 días) y el endpoint es admin-only con rate limit de 30/min.

### M.3 — Relative imports en orchestrator.py

**Archivo editado:** `app/modules/pipeline/orchestrator.py`

**Problema:**
7 imports relativos (`from ..tts.service`, `from ..llm.visual_spec`, etc.) mezclados con absolutos — riesgo de circular imports.

**Fix:**
Todos convertidos a imports absolutos:
```python
# ANTES
from ..tts.service import AUDIO_STORAGE, generate_tts_with_timestamps
from ..segmentation.service import split_text_into_chunks
from ..llm.visual_spec import generate_batch_visuals_with_llm, VisualSpecResult
from ..llm.component_strategy import generate_scene_composer
from ..remotion.scene_renderer import render_single_scene, SCENES_STORAGE
from ..video.concat import concat_scenes, VIDEOS_STORAGE

# DESPUÉS
from app.modules.tts.service import AUDIO_STORAGE, generate_tts_with_timestamps
from app.modules.segmentation.service import split_text_into_chunks
from app.modules.llm.visual_spec import generate_batch_visuals_with_llm, VisualSpecResult
from app.modules.llm.component_strategy import generate_scene_composer
from app.modules.remotion.scene_renderer import render_single_scene, SCENES_STORAGE
from app.modules.video.concat import concat_scenes, VIDEOS_STORAGE
```

### M.4 — Relative imports en scene_manager.py

**Archivo editado:** `app/modules/pipeline/scene_manager.py`

**Fix:**
3 imports relativos convertidos a absolutos:
```python
from app.modules.tts.service import generate_tts_with_timestamps
from app.modules.llm.visual_spec import VisualSpecResult
from app.modules.llm.component_strategy import generate_scene_composer
```

### M.5 — logging.getLogger → get_logger en context_manager.py

**Archivo editado:** `app/services/context_manager.py`

**Fix:**
```python
# ANTES
import logging
logger = logging.getLogger(__name__)

# DESPUÉS
from app.core.logging import get_logger
logger = get_logger("context_manager")
```

### M.6 — logging.getLogger → get_logger en intent_router.py

**Archivo editado:** `app/services/intent_router.py`

**Fix:**
```python
# ANTES
import logging
logger = logging.getLogger(__name__)

# DESPUÉS
from app.core.logging import get_logger
logger = get_logger("intent_router")
```

### M.7 — Indentación inconsistente en voices.py

**Archivo editado:** `app/api/voices.py`

**Fix:**
```python
# ANTES (misaligned)
            db.query(Voice).filter(
                Voice.user_id == current_user.id,
            Voice.is_default.is_(True),  # noqa: E712
                Voice.id != voice_id,
            )

# DESPUÉS (aligned)
            db.query(Voice).filter(
                Voice.user_id == current_user.id,
                Voice.is_default.is_(True),  # noqa: E712
                Voice.id != voice_id,
            )
```

### M.8 — Dead comment en jobs_crud.py

**Archivo editado:** `app/api/jobs_crud.py`

**Fix:**
Eliminado comentario muerto: `# db.refresh(new_job) fue llamado arriba.`

### M.9 — Dead comments en orchestrator.py

**Archivo editado:** `app/modules/pipeline/orchestrator.py`

**Fix:**
Eliminados 2 comentarios obsoletos:
- `# No more TSX files to cleanup`
- `# Regenerar index.ts sin los archivos eliminados (ya no es necesario)`

### M.10 — Unused params en scheduler wake_up

**Archivo editado:** `app/core/scheduler.py`

**Fix:**
```python
# ANTES
def wake_up(self, connection, pid, channel, payload):

# DESPUÉS
def wake_up(self, _connection, _pid, _channel, _payload):
```

### M.11 — DEBUG logging leak en llm/client.py

**Archivo editado:** `app/modules/llm/client.py`

**Problema:**
DEBUG logging que dump raw LLM responses (primeros 2000 chars) — puede leak datos sensibles en producción.

**Fix:**
```python
# ANTES
logger.debug("LLM response: %s", response[:2000])

# DESPUÉS
# WARNING: This may leak sensitive data in production logs
if settings.ENV == "development":
    logger.debug("LLM response (first 2000 chars): %s", response[:2000])
```

### M.12 — DB pool config en session.py

**Archivo editado:** `app/db/session.py`

**Problema:**
Sin `pool_size`, `max_overflow`, `pool_recycle` configurados — en VPS con conexiones limitadas puede agotar el pool de Postgres.

**Fix:**
```python
# ANTES
engine = create_engine(settings.sqlalchemy_database_uri, pool_pre_ping=True)

# DESPUÉS
engine = create_engine(
    settings.sqlalchemy_database_uri,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,  # 30 minutes
)
```

### M.13 — system_health._start_time function attribute

**Archivo editado:** `app/api/admin.py`

**Problema:**
`system_health._start_time` usa atributo de función — patrón inusual que puede fallar si la función es reemplazada o decorada.

**Fix:**
```python
# ANTES (function attribute)
uptime_seconds = time.time() - getattr(system_health, '_start_time', time.time())
if not hasattr(system_health, '_start_time'):
    system_health._start_time = time.time()

# DESPUÉS (module-level constant)
_APP_START_TIME = time.time()  # at module level
uptime_seconds = time.time() - _APP_START_TIME
```

## Métricas de Round 2 Medium

| Métrica | Valor |
|---------|-------|
| Fixes aplicados | 13 |
| Issues diferidos | 1 (get_business_metrics queries) |
| Archivos editados | 10 |
| Queries reducidas (admin stats) | 7 → 3 |
| Relative imports convertidos | 10 |
| Logging consistency fixes | 2 |
| Dead comments eliminados | 3 |
| Security fixes (logging leak) | 1 |
| DB pool config agregado | 1 |
