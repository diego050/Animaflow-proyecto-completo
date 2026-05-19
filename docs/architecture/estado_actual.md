# Estado Actual de Arquitectura y Topología

## Componentes y Contratos (Implementados)
- **Contrato Central (`spec.json`)**: Esquema maestro validado en Pydantic (`backend/app/schemas/spec.py`) y TypeScript (`frontend/src/types/spec.ts`).
- **Base de Datos**: PostgreSQL trackea el ciclo de vida de los `jobs` con **estados granulares** para progress tracking:
  - Pipeline de generación: `pending` → `segmenting` → `visuals_generating` → `processing_scenes` → `completed`
  - Pipeline de renderizado: `queued_render` → `rendering` → `completed_video`
  - Estados de error: `failed: <mensaje>` y `failed_render: <mensaje>`
- **Generación Dinámica de Código**: El backend genera archivos React (`.tsx`) en tiempo real (escribiendo a disco) que Vite carga dinámicamente con `import.meta.glob`.
- **Topología de Workers**:
  - `FastAPI (API)` recibe solicitudes de UI, persiste job en PostgreSQL y encola en Redis.
  - `Worker (RQ)` escucha a Redis, ejecuta `run_pipeline` con actualizaciones de estado en cada fase, y lanza (A) generación de Specs y TSX y (B) ejecuciones del motor CLI de Remotion.
  - **Progress Tracking**: El frontend hace polling cada 2s a `GET /api/jobs/{job_id}` para mostrar progreso en tiempo real al usuario.
