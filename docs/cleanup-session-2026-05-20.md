# Sesión de Limpieza y Corrección — 2026-05-20

## Resumen Ejecutivo

Sesión de limpieza exhaustiva del codebase de AnimaFlow. Se aplicaron **36 correcciones** distribuidas en seguridad, estabilidad, calidad de código e infraestructura.

**Agentes involucrados:**
- Orchestrator (coordinación)
- Backend (Python/FastAPI)
- Frontend (React/TypeScript)
- Infra (Docker/CI/CD)
- QA (schema/contratos)

---

## 1. Seguridad (8 fixes)

### 1.1 Registro público — Forzar role="user"
- **Archivo:** `backend/app/api/auth.py:37`
- **Problema:** Cualquiera podía registrarse como admin/founder enviando `role` en el body.
- **Fix:** `role=user_data.role` → `role="user"`
- **Impacto:** Elimina elevación de privilegios por registro público.

### 1.2 Admin — Soft delete en lugar de hard delete
- **Archivo:** `backend/app/api/admin.py:153-160`
- **Problema:** `db.delete(user)` ignoraba `is_deleted` y `deleted_at`.
- **Fix:** `user.is_deleted = True; user.deleted_at = now(timezone.utc)`
- **Impacto:** Protección de datos; consistencia con el modelo.

### 1.3 Secrets — Fallar startup en producción si no definidos
- **Archivo:** `backend/app/core/config.py`
- **Problema:** `SECRET_KEY` y `ENCRYPTION_KEY` tenían defaults inseguros.
- **Fix:** `@model_validator(mode="after")` que falla si `ENV=production` y secrets son defaults.
- **Impacto:** App no arranca comprometida.

### 1.4 API expuesta en 0.0.0.0:8000
- **Archivo:** `docker-compose.prod.yml:9`
- **Problema:** `8000:8000` en todas las interfaces permitía bypass de Nginx.
- **Fix:** `127.0.0.1:8000:8000`
- **Impacto:** API solo accesible por Nginx del host.

### 1.5 Credenciales DB hardcodeadas en compose
- **Archivo:** `docker-compose.prod.yml`
- **Problema:** `DATABASE_URL` y `POSTGRES_PASSWORD` en `environment` tenían prioridad sobre `env_file`.
- **Fix:** Eliminadas del bloque `environment`; ahora leen desde `.env`.
- **Impacto:** Credenciales centralizadas y seguras.

### 1.6 worker-render como root
- **Archivo:** `backend/Dockerfile.render`, `docker-compose.prod.yml`
- **Problema:** Contenedor corriendo como UID 0 (root).
- **Fix:** `USER appuser` (UID 1000) en Dockerfile + `user: "1000:1000"` en compose.
- **Impacto:** Reduce riesgo de escape de contenedor; archivos con permisos correctos en volúmenes.

### 1.7 Rate limiting en memoria
- **Archivo:** `backend/app/core/limiter.py`
- **Problema:** `slowapi` con `MemoryStorage` no persistía entre workers/restarts.
- **Fix:** `storage_uri=settings.REDIS_URL`
- **Impacto:** Rate limiting consistente entre todos los workers.

### 1.8 Nginx — Headers de seguridad + client_max_body_size
- **Archivo:** `frontend/nginx.conf`
- **Problema:** Sin `X-Frame-Options`, `X-Content-Type-Options`, `client_max_body_size`.
- **Fix:** Añadidos headers de seguridad + `client_max_body_size 100M` + gzip.
- **Impacto:** Protección contra clickjacking, MIME sniffing, uploads grandes.

---

## 2. Estabilidad (8 fixes)

### 2.1 Scene regeneration — Mover a RQ worker
- **Archivo:** `backend/app/api/jobs.py:309-338`
- **Problema:** `await _regenerate_scene_async(...)` bloqueaba el worker Uvicorn.
- **Fix:** `queue.enqueue(_regenerate_scene_async, ...)` con `job_timeout="5m"`.
- **Impacto:** API no bloquea; frontend hace polling por `job_id`.

### 2.2 SQLAlchemy JSON mutability
- **Archivo:** `backend/app/db/models.py`, `app/modules/pipeline/orchestrator.py`
- **Problema:** SQLAlchemy 2.0 no detectaba cambios en dicts JSON anidados.
- **Fix:** `MutableDict.as_mutable(JSON)` + `flag_modified(job, "result_spec")`.
- **Impacto:** Actualizaciones parciales de `result_spec` se persisten correctamente.

### 2.3 Remotion renderer — Archivo temporal para props
- **Archivo:** `backend/app/modules/remotion/renderer.py`
- **Problema:** `spec_json` pasado como argumento CLI inline (riesgo ARG_MAX + escape).
- **Fix:** `tempfile.NamedTemporaryFile` + `--props=/tmp/spec.json` + `timeout=600`.
- **Impacto:** Render funciona con specs grandes; timeout protege contra hangs.

### 2.4 datetime.utcnow() deprecado
- **Archivo:** `backend/app/db/models.py`, `backend/app/core/security.py`
- **Problema:** `datetime.utcnow()` deprecated en Python 3.12+.
- **Fix:** `datetime.now(timezone.utc)`.
- **Impacto:** Compatibilidad futura; comportamiento correcto en zonas horarias.

### 2.5 Healthcheck roto
- **Archivo:** `docker-compose.prod.yml`
- **Problema:** `healthcheck` usaba `curl` que no existe en `python:3.11-slim`.
- **Fix:** Eliminado el healthcheck del compose (el Dockerfile ya tiene uno funcional con Python).
- **Impacto:** Contenedor `api` reporta estado correcto.

### 2.6 Redis persistencia
- **Archivo:** `docker-compose.prod.yml`
- **Problema:** Redis sin volumen ni AOF; jobs se perdían en restart.
- **Fix:** `command: redis-server --appendonly yes` + volumen `redis_data:/data`.
- **Impacto:** Jobs en cola sobreviven reinicios.

### 2.7 Polling naive en frontend
- **Archivo:** `frontend/src/store/useJobsStore.ts`
- **Problema:** `setInterval` cada 3s sin cleanup ni backoff.
- **Fix:** `setTimeout` dinámico + `AbortController` + `visibilitychange` listener + backoff exponencial (3s→30s).
- **Impacto:** Menor carga en servidor; pausa cuando tab no visible.

### 2.8 Remotion anti-patrón useState/useEffect
- **Archivo:** `frontend/src/remotion/MainComposition.tsx`
- **Problema:** `DynamicScene` usaba `useState` + `useEffect` para lazy-load; Remotion no garantiza consistencia de frames.
- **Fix:** Mapa estático de componentes síncrono.
- **Impacto:** Renderizado de video determinístico y consistente.

---

## 3. Calidad de Código (12 fixes)

### 3.1 Tailwind v4 config
- **Archivo:** `frontend/tailwind.config.js` (eliminado)
- **Problema:** Tailwind v4 con config v3 obsoleto.
- **Fix:** Eliminado `tailwind.config.js`; el CSS ya usaba `@import "tailwindcss"`.
- **Impacto:** Build limpio sin warnings.

### 3.2 spec_schema.json sincronizado
- **Archivo:** `specs/spec_schema.json`, `backend/app/schemas/spec.py`, `frontend/src/types/spec.ts`
- **Problema:** 14 inconsistencias entre JSON Schema, Pydantic y TypeScript.
- **Fix:** Regenerado desde `TimelineSpec.model_json_schema()`; campos añadidos: `animation_spec`, `ae_metadata`, `ae_script_code`, `word_timestamps`.
- **Impacto:** Fuente de verdad única; contratos consistentes.

### 3.3 Tipos duplicados unificados
- **Archivo:** `frontend/src/types/spec.ts`, `frontend/src/types/job.ts`
- **Problema:** `TimelineSpec`, `SceneSpec`/`Spec`, `WordTimestamp`, `SFX`/`SFXCue` definidos dos veces.
- **Fix:** Eliminados duplicados de `job.ts`; importados desde `spec.ts`.
- **Impacto:** DRY; riesgo de desincronización eliminado.

### 3.4 JobStatus enum + CHECK constraint
- **Archivo:** `backend/app/db/models.py`, `backend/app/schemas/job.py`, `frontend/src/types/job.ts`
- **Problema:** Backend escribía strings arbitrarios en `status`; frontend esperaba estados conocidos.
- **Fix:** `JobStatus = Literal[...]` en Pydantic + CHECK constraint en DB + campo `error_message` separado.
- **Impacto:** Estados consistentes; mensajes de error no contaminan el enum.

### 3.5 Imports duplicados eliminados
- **Archivo:** `backend/app/api/jobs.py`
- **Problema:** Bloque de imports duplicado en líneas 257-265.
- **Fix:** Eliminado; imports necesarios movidos al inicio del archivo.
- **Impacto:** Código limpio.

### 3.6 @model_validator Pydantic v2
- **Archivo:** `backend/app/core/config.py`
- **Problema:** `@validator` deprecated en Pydantic v2.
- **Fix:** `@model_validator(mode="after")`.
- **Impacto:** Compatibilidad futura.

### 3.7 Password validation
- **Archivo:** `backend/app/schemas/auth.py`
- **Problema:** (Ya existía, verificado) Validador con longitud ≥8 + complejidad.
- **Impacto:** Passwords seguras.

### 3.8 CHECK constraint role
- **Archivo:** `backend/app/db/models.py`
- **Problema:** Campo `role` sin restricción de valores en DB.
- **Fix:** `CheckConstraint("role IN ('founder', 'agency', 'user', 'admin')")`.
- **Impacto:** Integridad de datos a nivel de base de datos.

### 3.9 Barrel exports
- **Archivos:** `frontend/src/components/index.ts`, `frontend/src/store/index.ts`, `frontend/src/types/index.ts`
- **Problema:** Imports dispersos sin centralización.
- **Fix:** Creados `index.ts` en cada directorio.
- **Impacto:** Developer experience mejorada.

### 3.10 Constantes mágicas centralizadas
- **Archivos:** `frontend/src/constants.ts`, `backend/app/core/constants.py`
- **Problema:** `'local_piper'`, `'9:16'`, `'es_ES-carlfm-x_low'` repetidos.
- **Fix:** Centralizados en archivos de constantes.
- **Impacto:** Mantenimiento simplificado.

### 3.11 .env.example completo
- **Archivo:** `.env.example` (raíz)
- **Problema:** No había plantilla documentada de variables de entorno.
- **Fix:** Creado con todas las variables necesarias.
- **Impacto:** Onboarding de nuevos developers más fácil.

### 3.12 Campos frontend-only documentados
- **Archivo:** `frontend/src/types/job.ts`
- **Problema:** `previewAudioUrl`, `projectsUsed` no existen en backend.
- **Fix:** Comentarios JSDoc `@deprecated` con explicación.
- **Impacto:** Claridad sobre qué campos son roadmap v2.

---

## 4. Infraestructura / DevOps (8 fixes)

### 4.1 docker-compose version obsoleto
- **Archivo:** `docker-compose.prod.yml`
- **Problema:** `version: '3.8'` genera warning en cada comando.
- **Fix:** Eliminado.
- **Impacto:** Logs limpios.

### 4.2 Scripts CI/CD seguros
- **Archivos:** `.github/workflows/deploy-production.yml`, `.github/workflows/deploy-testing.yml`
- **Problema:** `docker system prune -f` borraba recursos de otros proyectos en el VPS.
- **Fix:** `docker image prune -f` (solo imágenes dangling).
- **Impacto:** Otros proyectos en el VPS no se ven afectados.

### 4.3 deploy.sh sin down destructivo
- **Archivo:** `scripts/deploy.sh`
- **Problema:** `docker-compose down` detenía todos los contenedores antes del build.
- **Fix:** Rolling update con `docker compose up -d --build`.
- **Impacto:** Zero-downtime deploys.

### 4.4 SonarQube script limpio
- **Archivo:** `scripts/setup_sonarqube.py`
- **Problema:** Contraseña hardcodeada + impresa en stdout.
- **Fix:** Lee de variable de entorno; sin `print` de secrets.
- **Impacto:** Seguridad de credenciales.

### 4.5 docs/temp/ fuera de git
- **Archivo:** `.gitignore`
- **Problema:** 9 archivos temporales de debugging trackeados.
- **Fix:** `docs/temp/` añadido a `.gitignore` + `git rm --cached`.
- **Impacto:** Repo limpio.

### 4.6 .pyc y app/services/ eliminados
- **Archivos:** `backend/app/services/`, `__pycache__/`
- **Problema:** Carpeta deprecated + archivos compilados en el repo.
- **Fix:** Eliminados + reglas en `.gitignore`.
- **Impacto:** Repo limpio.

### 4.7 Path aliases en Vite
- **Archivos:** `frontend/vite.config.ts`, `frontend/tsconfig.app.json`
- **Problema:** Imports relativos `../../store/...` propensos a errores.
- **Fix:** `resolve.alias: { '@': './src' }` + `paths: { '@/*': ['src/*'] }`.
- **Impacto:** Developer experience mejorada.

### 4.8 Mensajes de error unificados a inglés
- **Archivos:** `backend/app/api/jobs.py`, `backend/app/api/assets.py`, `backend/app/api/exports.py`, `backend/app/modules/pipeline/orchestrator.py`
- **Problema:** Mezcla de español e inglés en mensajes de API.
- **Fix:** Todos los mensajes de error de la API ahora están en inglés.
- **Impacto:** Consistencia; frontend puede traducir si es necesario.

---

## 5. Migraciones de Base de Datos

### 5.1 add_error_message_to_jobs
- **Revision ID:** `6276e582bac8`
- **Down revision:** `9f147a2b3c4d`
- **Cambio:** Añade columna `error_message` (Text, nullable) a tabla `jobs`.
- **Nota:** Creada inicialmente en el VPS dentro del contenedor; recreada manualmente en el repo para GitHub Actions.

---

## 6. Estado Final del Sistema

| Servicio | Estado Esperado |
|----------|----------------|
| API | Healthy, bind 127.0.0.1:8000 |
| Frontend | Running, puerto 8080 |
| PostgreSQL | Running, puerto 5432 (localhost) |
| Redis | Running, puerto 6379 (localhost), AOF persistencia |
| worker-default x2 | Listening on default queue |
| worker-render | Listening on render queue, UID 1000 |

---

## 7. Próximos Pasos Recomendados

1. **Probar la app completa:** Crear proyecto → generar script → renderizar video.
2. **Monitorear logs:** `docker compose -f docker-compose.prod.yml logs -f api`
3. **Revisar métricas:** Verificar que Redis, workers y API están saludables.
4. **Documentar decisiones:** Si se hacen cambios arquitectónicos, actualizar ADRs en `docs/adr/`.

---

*Documento generado automáticamente por el agente Orchestrator de AnimaFlow.*
*Fecha: 2026-05-20*
