# Documentación del Proyecto AnimaFlow

Índice maestro para navegación técnica y comprensión de arquitectura (Humanos & IA).

> **Última actualización:** Mayo 2026 | **Sprints cubiertos:** 1–6

---

## Project Overview

AnimaFlow es una plataforma SaaS que convierte texto/audio en proyectos de video editables, frame-accurate, para Adobe After Effects mediante un pipeline estructurado `spec.json`.

**Diferenciador clave:** Exportación dual (MP4 + `spec.json`) con segmentación inteligente audio-texto, corrección de límites vía LLM, generación de prompts de animación y extracción de cues SFX.

**Stack técnico:**
- **Frontend:** React 18 + TypeScript, Vite, TailwindCSS, Zustand, Remotion
- **Backend:** FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 + Alembic (PostgreSQL)
- **Async Workers:** RQ + Redis (TTS, LLM, renderizado)
- **Auth:** JWT nativo (FastAPI + python-jose), roles (founder, agency, pilot)

---

## Quick Start

```bash
# 1. Infraestructura
docker-compose up -d postgres redis

# 2. Backend
cd backend && pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd frontend && npm install
npm run dev  # http://localhost:5173
```

**Credenciales de prueba (Sprint 5+):**
- Email: `pilot@animaflow.com`
- Password: `pilot123`

---

## Documentation Structure

| Directorio | Contenido |
|---|---|
| [`architecture/`](architecture/) | Diagramas de sistema, schema DB, referencia API |
| [`backend/`](backend/) | Auth, voice management, pipeline de workers |
| [`frontend/`](frontend/) | Arquitectura del dashboard, integración auth |
| [`qa/`](qa/) | Guía de testing, checklist manual |
| [`adr/`](adr/) | Architecture Decision Records |
| [`sprints/`](sprints/) | Reportes por sprint |
| [`temp/`](temp/) | Archivos temporales de desarrollo |

---

## Sprint Summary

| Sprint | Fecha | Tema | Estado |
|---|---|---|---|
| [1–2](sprints/sprint-1-2-report.md) | May 2026 | Dashboard Foundation + Project Wizard | ✅ Completado |
| [3–4](sprints/sprint-3-4-report.md) | May 2026 | Voices, Scripts, Downloads + Settings & Profile | ✅ Completado |
| [5–6](sprints/sprint-5-6-report.md) | May 2026 | Authentication System + Voice Endpoints + User-Job FK | ✅ Completado |

---

## Architecture Documents

| Documento | Descripción |
|---|---|
| [`architecture/system-overview.md`](architecture/system-overview.md) | Arquitectura general del sistema, diagramas, data flow |
| [`architecture/database-schema.md`](architecture/database-schema.md) | ERD, tablas, relaciones, migraciones, índices |
| [`architecture/api-reference.md`](architecture/api-reference.md) | Referencia completa de endpoints API |
| [`architecture/progress_tracking.md`](architecture/progress_tracking.md) | Sistema de tracking de progreso del pipeline |
| [`architecture/export_pipeline.md`](architecture/export_pipeline.md) | Pipeline de exportación MP4/AE |
| [`architecture/model_strategy.md`](architecture/model_strategy.md) | Estrategia de modelos dual con fallback |
| [`architecture/feature_script_generation.md`](architecture/feature_script_generation.md) | Generación de scripts |
| [`architecture/animation_spec_field.md`](architecture/animation_spec_field.md) | Campo spec de animación |
| [`architecture/svg_animation_types.md`](architecture/svg_animation_types.md) | Tipos de animación SVG |

---

## Backend Documents

| Documento | Descripción |
|---|---|
| [`backend/auth-system.md`](backend/auth-system.md) | Sistema de autenticación JWT |
| [`backend/voice-management.md`](backend/voice-management.md) | Gestión de voces TTS |
| [`backend/pipeline-overview.md`](backend/pipeline-overview.md) | Pipeline completo con RQ workers |
| [`backend/estado_actual.md`](backend/estado_actual.md) | Estado actual de la API |
| [`backend/pipeline_narrative_animation.md`](backend/pipeline_narrative_animation.md) | Pipeline de animación narrativa |
| [`backend/ae_export_fixes_sesion6.md`](backend/ae_export_fixes_sesion6.md) | Fixes de exportación AE |

---

## Frontend Documents

| Documento | Descripción |
|---|---|
| [`frontend/dashboard-architecture.md`](frontend/dashboard-architecture.md) | Arquitectura del dashboard, Zustand, routing |
| [`frontend/auth-integration.md`](frontend/auth-integration.md) | Integración de autenticación |
| [`frontend/estado_actual.md`](frontend/estado_actual.md) | Estado actual del frontend |
| [`frontend/remotion_generated_components.md`](frontend/remotion_generated_components.md) | Componentes Remotion generados |

---

## QA Documents

| Documento | Descripción |
|---|---|
| [`qa/testing-guide.md`](qa/testing-guide.md) | Guía de testing completa |
| [`qa/estrategia.md`](qa/estrategia.md) | Estrategia de testing |

---

## Architecture Decision Records (ADRs)

| ADR | Título | Estado |
|---|---|---|
| [ADR-001](adr/001-mvp-infrastructure.md) | MVP Infrastructure | ✅ Implementado |
| [ADR-002](adr/002-llm-integration.md) | LLM Integration | ✅ Implementado |
| [ADR-003](adr/003-voicebox-kokoro-preset-engine.md) | Voicebox Kokoro Preset Engine | ✅ Implementado |
| [ADR-004](adr/004-narrative-animation-engine.md) | Narrative Animation Engine | ✅ Implementado |
| [ADR-005](adr/005-tsx-generation-fixes.md) | TSX Generation Post-Processing | ✅ Implementado |
| [ADR-006](adr/006-authentication-strategy.md) | Authentication Strategy | ✅ Implementado |
| [ADR-007](adr/007-user-job-relationship.md) | User-Job Relationship | ✅ Implementado |
| [ADR-008](adr/008-voice-management-approach.md) | Voice Management Approach | ✅ Implementado |
| [ADR-009](adr/009-after-effects-deterministic-fidelity.md) | Deterministic AE Script Generator | ✅ Implementado |

