# Guía de Despliegue AnimaFlow en VPS

**Fecha:** 2026-05-20
**Estado:** ✅ Producción funcional
**VPS:** Hostinger (Puertos 80/443 ocupados por otro proyecto)

---

## 1. Resumen del Despliegue

Este documento registra todo el proceso de despliegue de AnimaFlow desde un entorno local a un VPS compartido en Hostinger, incluyendo la arquitectura de Docker, CI/CD automático, corrección de errores y configuración de seguridad.

---

## 2. Arquitectura Final

### 2.1 Stack Tecnológico
- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS (servido por Nginx)
- **Backend:** FastAPI (Python 3.11) + SQLAlchemy 2.0 + Alembic
- **Renderizado:** Remotion (React) + Chromium + FFmpeg
- **Base de datos:** PostgreSQL 15 (Alpine)
- **Colas:** Redis 7 (Alpine) + RQ Workers
- **Infraestructura:** Docker Compose + Nginx reverse proxy
- **CI/CD:** GitHub Actions con deploy automático por SSH

### 2.2 Arquitectura de Contenedores

| Servicio | Imagen | Puertos | Memoria | Réplicas |
|----------|--------|---------|---------|----------|
| `api` | `backend/Dockerfile` (Python) | 8000 | 1GB | 1 |
| `frontend` | `frontend/Dockerfile` (Nginx) | 8080→80 | 256MB | 1 |
| `worker-default` | `backend/Dockerfile` (Python) | - | 1GB | 2 |
| `worker-render` | `backend/Dockerfile.render` (Python+Node) | - | 4GB | 1 |
| `postgres` | `postgres:15-alpine` | 127.0.0.1:5432 | - | 1 |
| `redis` | `redis:7-alpine` | 127.0.0.1:6379 | - | 1 |

### 2.3 Estrategia de Imágenes Docker

Se optó por **3 imágenes separadas** en lugar de una sola:

1. **`backend/Dockerfile`** (Python puro): Usado por `api` y `worker-default`. Ligero y rápido.
2. **`frontend/Dockerfile`** (Nginx + React build): Sirve el SPA y hace proxy de API/videos.
3. **`backend/Dockerfile.render`** (Híbrido Python+Node): Incluye Chromium y FFmpeg. Solo para `worker-render`.

**Razón:** Evitar que la imagen de backend se infle con 500MB+ de Chromium cuando solo el renderizador lo necesita.

---

## 3. Problemas Críticos Identificados y Solucionados

### 3.1 Worker Render sin Node.js ni Chromium
- **Problema:** `worker-render` usaba la misma imagen Python que el resto, pero ejecutaba `npx remotion render`, lo que requiere Node.js 20+, Chromium y librerías gráficas.
- **Solución:** Crear `backend/Dockerfile.render` basado en `nikolaik/python-nodejs:python3.11-nodejs20-slim` con pre-instalación de dependencias de sistema y `npx remotion browser ensure`.

### 3.2 Contenedores sin Filesystem Compartido
- **Problema:** `api` y `worker-default` generaban archivos `.tsx` dinámicos que `worker-render` debía compilar, pero al estar en contenedores separados no los veía.
- **Solución:** Volumen Docker compartido `remotion_generated` montado en `/app/frontend/src/remotion/generated` en los 3 servicios.

### 3.3 Base de Datos y Redis Expuestos a Internet
- **Problema:** PostgreSQL y Redis estaban mapeados con `5432:5432` y `6379:6379`, accesibles desde cualquier IP.
- **Solución:** Bind a `127.0.0.1` exclusivamente: `127.0.0.1:5432:5432` y `127.0.0.1:6379:6379`.

### 3.4 Proxy de Videos Faltante en Nginx
- **Problema:** El frontend pedía videos en `/videos/{job_id}.mp4` pero Nginx no tenía ruta y devolvía 404.
- **Solución:** Bloque `location /videos/` con `proxy_pass` al backend y `proxy_buffering off` para MP4 grandes.

### 3.5 Rutas Hardcodeadas en Backend
- **Problema:** `renderer.py`, `component_generator.py` e `index_writer.py` usaban rutas relativas `../../../frontend` que fallaban en Docker.
- **Solución:** Centralización vía `config.py` con property `frontend_path` que detecta automáticamente el entorno (local vs Docker).

### 3.6 Rutas Hardcodeadas en Frontend
- **Problema:** Múltiples componentes llamaban directamente a `http://localhost:8000/api/...`, lo que fallaba en producción.
- **Solución:** Reemplazar todas las URLs absolutas por rutas relativas (`/api/...`) y usar `VITE_API_BASE_URL` vacío por defecto.

### 3.7 Audio URL con Ruta de Disco
- **Problema:** `scene_manager.py` guardaba `audio_url` como ruta de disco (`storage/audio/...`) en vez de URL web.
- **Solución:** Convertir a URL web `/api/audio/{filename}` con copia al storage estándar.

### 3.8 Migraciones Inconsistentes
- **Problema:** El modelo `User` tenía campos (`is_deleted`, `deleted_at`) que no existían en la base de datos porque faltaba la migración.
- **Solución:** Crear migración `9f147a2b3c4d_add_soft_delete_to_users.py` y ejecutar `alembic upgrade head`.

### 3.9 Null Errors en Dashboard de Admin
- **Problema:** `AdminDashboardPage.tsx` llamaba `.toFixed()` sobre propiedades que el backend devolvía como `null`.
- **Solución:** Añadir operador `?? 0` (nullish coalescing) a todos los valores numéricos antes de renderizarlos.

### 3.10 Dockerfile con Usuario y Chown en Orden Incorrecto
- **Problema:** `chown -R appuser:appuser` corría antes de `useradd`, causando `invalid user`.
- **Solución:** Reordenar instrucciones: crear usuario primero, luego usar `chown`.

### 3.11 Pipeline CI/CD Engañoso
- **Problema:** GitHub Actions decía "deployment complete" aunque el build de Docker fallara.
- **Solución:** Añadir `set -euo pipefail` al inicio del script SSH para que falle de verdad en cualquier error.

### 3.12 Alembic Choke con Migraciones Manuales
- **Problema:** Insertar filas manualmente en `alembic_version` causó solapamiento de revisiones.
- **Solución:** Usar `alembic stamp` en lugar de INSERT manual, o dejar que el pipeline aplique migraciones limpiamente.

---

## 4. Configuración de CI/CD

### 4.1 Flujo de Trabajo

```
Develop → Testing → Main
   ↓         ↓        ↓
  push    deploy    deploy
          (VPS)     (VPS)
```

### 4.2 Workflows de GitHub Actions

| Archivo | Trigger | Qué hace |
|---------|---------|----------|
| `.github/workflows/ci.yml` | PR a cualquier rama | Corre tests, lint, build, verificación de seguridad |
| `.github/workflows/deploy-testing.yml` | Push a `Testing` | Deploy automático al VPS vía SSH |
| `.github/workflows/deploy-production.yml` | Push a `main` | Deploy automático al VPS vía SSH + backup de DB |

### 4.3 Script de Deploy (Testing)

1. `git reset --hard origin/Testing`
2. Copiar `.env` al backend
3. `docker compose pull`
4. `docker compose up -d --build api worker-default worker-render frontend`
5. Esperar que Postgres esté listo (`pg_isready`)
6. `alembic upgrade head`
7. Health check (`curl /health`)
8. `docker system prune -f`

### 4.4 Script de Deploy (Producción)

Igual que testing, pero añade:
- Backup de base de datos antes de migrar (`pg_dump`)
- Notificaciones de éxito/fallo (placeholder para Slack/Discord)

---

## 5. Configuración del VPS

### 5.1 Requisitos Previos

- Docker y Docker Compose instalados
- Repositorio clonado en `/opt/animaflow`
- Archivo `.env` creado en `/opt/animaflow/.env`
- Carpeta de backups: `mkdir -p /opt/animaflow/backups`

### 5.2 Variables de Entorno (.env)

| Variable | Descripción |
|----------|-------------|
| `ENV` | `production` |
| `DATABASE_URL` | Conexión a PostgreSQL interno de Docker |
| `REDIS_URL` | Conexión a Redis interno de Docker |
| `SECRET_KEY` | Clave JWT (generada con `secrets.token_hex(32)`) |
| `ENCRYPTION_KEY` | Clave Fernet para encriptación de API keys |
| `GEMINI_API_KEY` | API key de Google Gemini |
| `CORS_ORIGINS` | Orígenes permitidos (incluir IP del VPS) |
| `STORAGE_BASE_DIR` | `/app` (ruta dentro de los contenedores) |

### 5.3 Puertos Externos

| Puerto | Servicio | Acceso |
|--------|----------|--------|
| 8080 | Frontend (Nginx) | Público |
| 8000 | API (FastAPI) | Público |
| 5432 | PostgreSQL | Solo 127.0.0.1 (interno) |
| 6379 | Redis | Solo 127.0.0.1 (interno) |

**Nota:** Los puertos 80 y 443 están ocupados por otro proyecto (portfolio) en el mismo VPS.

---

## 6. Estructura de Volumes Docker

| Volumen | Propósito | Persistencia |
|---------|-----------|--------------|
| `postgres_data` | Datos de PostgreSQL | ✅ Permanente |
| `animaflow_storage` | Videos, audios, assets | ✅ Permanente |
| `remotion_generated` | Componentes TSX generados | ✅ Permanente |

---

## 7. Creación del Primer Usuario Admin

Ejecutar en el VPS:

```bash
# Crear usuario admin
docker compose -f /opt/animaflow/docker-compose.prod.yml exec api python scripts/create_admin.py

# El script pedirá email, password y nombre interactivamente.
```

---

## 8. Acceso a la Aplicación

- **Frontend:** `http://IP_VPS:8080`
- **Login:** `http://IP_VPS:8080/login`
- **API Health:** `http://IP_VPS:8000/health`
- **Panel Admin:** `http://IP_VPS:8080/admin` (requiere rol `admin`)

---

## 9. Comandos Útiles para Mantenimiento

```bash
# Ver estado de contenedores
docker compose -f /opt/animaflow/docker-compose.prod.yml ps

# Ver logs en tiempo real
docker compose -f /opt/animaflow/docker-compose.prod.yml logs -f

# Logs específicos del worker de render
docker compose -f /opt/animaflow/docker-compose.prod.yml logs -f worker-render

# Re-crear un servicio específico
docker compose -f /opt/animaflow/docker-compose.prod.yml up -d --build api

# Backup manual de base de datos
docker compose -f /opt/animaflow/docker-compose.prod.yml exec -T postgres pg_dump -U postgres animaflow > backup_manual.sql

# Ejecutar migraciones manualmente
docker compose -f /opt/animaflow/docker-compose.prod.yml exec -T api alembic upgrade head
```

---

## 10. Lecciones Aprendidas

1. **Nunca ejecutar INSERT manual en `alembic_version`:** Usar `alembic stamp` o dejar que el pipeline maneje migraciones.
2. **Siempre esperar que Postgres esté listo antes de migrar:** Usar `pg_isready` en loop, no `sleep` fijo.
3. **Validar builds Docker con `set -euo pipefail`:** Evita falsos positivos de "deployment complete".
4. **Centralizar rutas de filesystem:** `config.py` con `frontend_path` evita rutas hardcodeadas que fallan en Docker.
5. **Usar rutas relativas en frontend:** `/api/...` en lugar de `http://localhost:8000` para funcionar en cualquier entorno.
6. **Defensa contra nulls en UI:** `?? 0` antes de `.toFixed()` cuando el backend puede devolver `null`.
7. **Revisar orden de instrucciones en Dockerfiles:** Crear usuarios antes de usarlos en `chown`.

---

## 11. Archivos Modificados/Creados Durante el Despliegue

### Creados
- `backend/Dockerfile.render`
- `.dockerignore`
- `backend/alembic/versions/9f147a2b3c4d_add_soft_delete_to_users.py`
- `docs/deployment-guide.md` (este archivo)

### Modificados
- `backend/Dockerfile`
- `docker-compose.prod.yml`
- `frontend/nginx.conf`
- `backend/app/core/config.py`
- `backend/app/modules/remotion/renderer.py`
- `backend/app/modules/remotion/component_generator.py`
- `backend/app/modules/remotion/index_writer.py`
- `backend/app/modules/pipeline/scene_manager.py`
- `.github/workflows/deploy-testing.yml`
- `.github/workflows/deploy-production.yml`
- `frontend/src/api/client.ts`
- `frontend/src/pages/dashboard/ProjectDetail.tsx`
- `frontend/src/pages/dashboard/DownloadsPage.tsx`
- `frontend/src/components/SceneEditor.tsx`
- `frontend/src/components/Dashboard.tsx`
- `frontend/.env.example`
- `frontend/src/pages/admin/AdminDashboardPage.tsx`

---

*Documento generado automáticamente tras el despliegue exitoso del MVP de AnimaFlow.*
