# Arquitectura DB-Driven y Scheduler Asíncrono

## 1. Visión General
En mayo de 2026, AnimaFlow migró de una arquitectura basada en **Redis + RQ Workers** a una arquitectura **DB-Driven Asíncrona** basada en **PostgreSQL (LISTEN/NOTIFY) + Node.js Render Pool**.

### Problemas de la Arquitectura Anterior (RQ + Redis)
- **Bloqueo Síncrono:** La API de Python se bloqueaba esperando a que `subprocess.run("npx remotion")` terminara (25s+ por escena).
- **Consumo de Memoria:** Se requerían 10+ contenedores (workers) consumiendo ~7GB de RAM.
- **Fragilidad:** Si un worker moría o el servidor se reiniciaba, el job se perdía para siempre.
- **Polling Masivo:** El frontend atacaba la base de datos haciendo requests HTTP cada 3 segundos.

### Solución Actual
La nueva arquitectura se divide en 4 contenedores ultraligeros (~300MB RAM total en reposo):
1. **API (FastAPI)**: Maneja las rutas HTTP y ejecuta un bucle en background (El Scheduler).
2. **PostgreSQL**: Actúa como fuente de la verdad **y como cola de mensajes** nativa.
3. **Render Server (Node.js)**: Un servidor Express dedicado a mantener instancias reciclables de Chromium abiertas.
4. **Frontend**: React + Vite + Nginx.

---

## 2. El Flujo de Trabajo (End-to-End)

El ciclo de vida de un video sigue este proceso determinista y asíncrono:

### Fase A: Ingreso y Segmentación
1. El usuario envía el texto en el Frontend.
2. FastAPI recibe el POST en `/api/jobs/`, inserta el `Job` en PostgreSQL con status `pending`.
3. El frontend se suscribe a `/api/jobs/{job_id}/stream` (Server-Sent Events) para recibir notificaciones en tiempo real sin polling.
4. **PostgreSQL dispara un Trigger** (`pg_notify('jobs', '...')`).
5. El **Scheduler Asíncrono** (que vive dentro de FastAPI) es despertado instantáneamente por el NOTIFY.
6. El Scheduler bloquea el Job en la DB (`FOR UPDATE SKIP LOCKED`) y ejecuta la segmentación y llamadas a LLMs sin bloquear la API principal. Al terminar, el status cambia a `segmented`.

### Fase B: Aprobación y Generación de Visuales
1. El usuario revisa los textos segmentados y hace click en "Aprobar y Generar".
2. La API actualiza el status a `visuals_generating` (o añade la flag `approved=True`).
3. Nuevo NOTIFY. El Scheduler retoma el trabajo:
   - Genera TTS asíncrono en paralelo usando semáforos.
   - Crea el `spec.json` y el `index.ts`.
4. Al terminar, actualiza el estado a `queued_render`.

### Fase C: Renderizado Delegado (Node.js)
1. Nuevo NOTIFY. El Scheduler lee `queued_render`.
2. En lugar de lanzar comandos `npx`, el Scheduler envía un POST HTTP interno al `Render Server` (puerto 3001).
3. **Render Server**:
   - Recibe el `job_id`, `scenes` y `aspectRatio`.
   - Utiliza su pool de Google Chrome pre-calentado (abreviando el inicio en 5 segundos).
   - Inyecta el `inputProps: { spec: { scenes, aspect_ratio } }` al `AnimaFlow-Main` composition.
   - Genera el archivo MP4.
4. El Render Server devuelve la ruta del video al Scheduler.
5. El Scheduler actualiza PostgreSQL a `completed`. A través de SSE, el frontend recibe la señal y muestra el video al usuario de forma inmediata.

---

## 3. Resiliencia y Recuperación (Crash Recovery)

¿Qué pasa si desconectan el cable de energía del servidor a mitad de un render?

Al arrancar nuevamente FastAPI, el Scheduler ejecuta su rutina `recover_stuck_jobs()`.
Busca en PostgreSQL todos los trabajos que estén en un estado intermedio (`segmenting`, `rendering`, etc.) cuya última actualización haya sido hace más de 15 minutos.
Estos trabajos son pasados a `pending` y el proceso se reanuda **exactamente** donde se quedó, sin intervención humana.

---

## 4. Gestión de Servidores y Logs

Para monitorizar este nuevo flujo, ya no necesitas buscar entre decenas de workers de RQ. 

### Ver logs en vivo
Desde tu terminal en Hostinger, ejecuta:
```bash
# Ver los logs del Scheduler y la API
docker-compose -f docker-compose.prod.yml logs -f api

# Ver los logs de renderizado y el estado de Google Chrome
docker-compose -f docker-compose.prod.yml logs -f render-server
```

### Reiniciar un componente específico
Si Chrome se atasca (poco probable gracias al reciclaje automático por RSS de memoria), simplemente:
```bash
docker-compose -f docker-compose.prod.yml restart render-server
```
El `Scheduler` en Python detectará el fallo tras unos segundos, marcará la escena como fallida, e intentará retomarla según su política de reintentos.
