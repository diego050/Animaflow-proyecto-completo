# Plan de Ajustes de Despliegue en Producción (VPS)

Este documento detalla las modificaciones críticas necesarias en la configuración de Docker, Nginx, la base de datos y el código backend para que la aplicación funcione correctamente y de forma segura en producción en tu VPS.

Actualmente existen varios problemas arquitectónicos y de seguridad que harían que la renderización de video fallara por completo y que la base de datos quedara expuesta a internet.

---

## User Review Required

> [!IMPORTANT]
> **1. Arquitectura de Renderizado (Puntos Críticos)**
> *   **worker-render sin Node ni Chrome:** El contenedor del renderizador corre sobre Python, pero invoca `npx remotion` que requiere Node.js, Chromium y librerías del sistema Debian. Se propone crear un Dockerfile específico (`Dockerfile.render`) para este worker.
> *   **Aislamiento de Archivos Generados (TSX):** Los contenedores `api` y `worker-default` generan dinámicamente componentes TSX que `worker-render` debe compilar. Al estar en contenedores separados, no comparten estos archivos. Se propone un volumen compartido (`remotion_generated`) para sincronizarlos en tiempo real.
>
> [!WARNING]
> **2. Vulnerabilidad de Seguridad (Base de Datos & Redis)**
> *   Actualmente, el puerto de PostgreSQL (`5432:5432`) y de Redis (`6379:6379`) están expuestos públicamente a internet. Cualquiera podría intentar acceder usando la contraseña por defecto. Se propone bindearlos a `127.0.0.1` para que solo sean accesibles de forma interna o mediante túneles SSH seguros.
>
> [!NOTE]
> **3. Proxy de Videos en Nginx**
> *   El frontend intenta cargar los videos usando `/videos/{job_id}.mp4`. Nginx no tiene ruta de proxy para `/videos/` y los busca localmente en su propio contenedor (retornando 404). Se añadirá un bloque `proxy_pass` para redirigir `/videos/` al backend.

---

## Proposed Changes

### 1. Configuración de Entorno y Rutas

#### [MODIFY] [config.py](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/backend/app/core/config.py)
*   Añadir la propiedad `FRONTEND_DIR` en la clase `Settings` configurada desde las variables de entorno, y una propiedad computada `frontend_path` que resuelva dinámicamente el directorio del frontend (tanto para desarrollo local como en Docker).

#### [MODIFY] [renderer.py](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/backend/app/modules/remotion/renderer.py)
*   Reemplazar la resolución manual de rutas hardcodeadas por `settings.frontend_path` y `get_storage_dir("videos")`.

#### [MODIFY] [component_generator.py](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/backend/app/modules/remotion/component_generator.py)
*   Reemplazar la resolución manual de `generated_dir` usando `settings.frontend_path`.

#### [MODIFY] [index_writer.py](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/backend/app/modules/remotion/index_writer.py)
*   Reemplazar la ruta de escritura de `index.ts` usando `settings.frontend_path`.

#### [MODIFY] [scene_manager.py](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/backend/app/modules/pipeline/scene_manager.py)
*   Corregir la asignación de `audio_url` durante la regeneración de una sola escena para que copie el archivo a la ubicación estándar y asigne la URL web `/api/audio/{filename}` en lugar de la ruta interna del disco.

---

### 2. Infraestructura Docker y Nginx

#### [NEW] [Dockerfile.render](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/backend/Dockerfile.render)
*   Crear un Dockerfile híbrido (Python + Node.js) basado en Debian Bookworm slim.
*   Instalar `ffmpeg`, Node.js 20, y las librerías compartidas de Chromium requeridas por Puppeteer/Remotion.
*   Instalar las dependencias de Python y de Node en `/app/frontend`.
*   Ejecutar `npx remotion browser ensure` para asegurar la descarga del navegador Chromium optimizado.

#### [NEW] [.dockerignore](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/.dockerignore)
*   Excluir archivos innecesarios del contexto de construcción de imágenes Docker (`node_modules`, `venv`, `.git`, `storage`, `.env`, etc.) para acelerar la construcción y evitar conflictos.

#### [MODIFY] [docker-compose.prod.yml](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/docker-compose.prod.yml)
*   **worker-render:** Cambiar el contexto de construcción al directorio raíz (`.`) y usar `backend/Dockerfile.render`.
*   **Volumen compartido (remotion_generated):** Crear y montar un volumen compartido en `/app/frontend/src/remotion/generated` para `api`, `worker-default` y `worker-render`.
*   **Puertos Seguros:** Cambiar puertos de PostgreSQL y Redis a `127.0.0.1:5432:5432` y `127.0.0.1:6379:6379`.
*   **Storage Bind Mount (Opcional pero recomendado):** Configurar bind mounts para `./storage` en lugar de volúmenes nombrados para facilitar el acceso a videos y modelos desde la terminal del VPS.

#### [MODIFY] [nginx.conf](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/frontend/nginx.conf)
*   Añadir un bloque de localización para `/videos/` que envíe la petición al backend `http://api:8000/videos/`.

---

## Verification Plan

### Automated Tests
*   **Test de Integración de Rutas:** Verificar que `settings.frontend_path` apunta a la ubicación correcta en local y en docker.
*   **Comprobación de Compilación Docker:** Construir localmente las imágenes de producción para validar que no haya errores de dependencias:
    ```bash
    docker compose -f docker-compose.prod.yml build
    ```

### Manual Verification
*   **Verificación de Render en Contenedor:** Encolar un trabajo de render en la cola `render` y monitorizar que `worker-render` ejecute exitosamente `npx remotion render` sin fallas de Puppeteer.
*   **Servicio de Videos:** Acceder a la URL `http://localhost:8080/videos/{id}.mp4` para validar que el proxy de Nginx funciona y sirve el video desde el contenedor backend.
