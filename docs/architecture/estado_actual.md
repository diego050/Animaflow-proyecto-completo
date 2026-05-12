# Estado Actual de Arquitectura y Topología

## Componentes y Contratos (Implementados)
- **Contrato Central (`spec.json`)**: Esquema maestro validado en Pydantic (`backend/app/schemas/spec.py`) y TypeScript (`frontend/src/types/spec.ts`).
- **Base de Datos**: PostgreSQL trackea el ciclo de vida de los `jobs` (Pendiente -> Procesando -> Timeline Generada -> Renderizando -> Video Completado).
- **Generación Dinámica de Código**: El backend genera archivos React (`.tsx`) en tiempo real (escribiendo a disco) que Vite carga dinámicamente con `import.meta.glob`.
- **Topología de Workers**:
  - `FastAPI (API)` recibe solicitudes de UI.
  - `Worker (RQ)` escucha a Redis y lanza (A) generación de Specs y TSX y (B) ejecuciones del motor CLI de Remotion.
