# Animaflow - Proyecto Completo

AnimaFlow is a SaaS platform that converts text/audio into editable, frame-accurate video projects for Adobe After Effects via a structured `spec.json` pipeline.

## Architecture Update (Day 4)

We have recently migrated to a new **Asynchronous DB-Driven Architecture**.

### Key Changes
- **No RQ / Redis:** We have removed RQ and Redis from the stack. The pipeline now uses a DB-driven polling scheduler (`scheduler.py`) that manages the pipeline phases asynchronously within the FastAPI backend using standard `asyncio`.
- **Node.js Render Server:** Rendering is now handled by a dedicated Node.js Render Server (`render-server.mjs`) instead of a Python-based worker. This provides a much faster and more reliable rendering pipeline utilizing `@remotion/renderer` directly.
- **RenderAdapter:** The FastAPI backend communicates with the new Render Server via `RenderAdapter`.
- **Docker Compose:** The production stack (`docker-compose.prod.yml`) has been simplified to only include `api`, `frontend`, `render-server`, and `postgres`. `worker-default` and `worker-render` have been removed.

### Stack
- **Frontend:** React 18 + TypeScript, Vite, TailwindCSS, Remotion
- **Backend:** FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 (PostgreSQL)
- **Render Server:** Express (Node.js 20+), Remotion Renderer
- **Database:** PostgreSQL 15
