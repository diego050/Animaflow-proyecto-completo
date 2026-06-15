# Documentación del Proyecto AnimaFlow

Índice maestro para navegación técnica y comprensión de arquitectura (Humanos & IA).

> **Última actualización:** 1 Junio 2026 (Completo) | **Sprints cubiertos:** 1–7+

---

## Project Overview

AnimaFlow es una plataforma SaaS que convierte texto/audio en proyectos de video editables, frame-accurate, para Adobe After Effects mediante un pipeline estructurado `spec.json`.

**Diferenciador clave:** Exportación dual (MP4 + `spec.json`) con segmentación inteligente audio-texto, corrección de límites vía LLM, generación de prompts de animación y extracción de cues SFX.

**Stack técnico:**
- **Frontend:** React 18 + TypeScript, Vite, TailwindCSS, Zustand, Remotion
- **Backend:** FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 + Alembic (PostgreSQL)
- **Async Workers:** DB-driven scheduler (asyncio) + Render Server (Node.js)
- **Auth:** JWT nativo (FastAPI + python-jose), roles (founder, agency, user, admin)

---

## Quick Start

```bash
# 1. Infraestructura
docker-compose -f docker-compose.prod.yml up -d postgres redis

# 2. Backend
cd backend && pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd frontend && npm install
npm run dev  # http://localhost:5173
```

**Crear usuario admin (después del deploy):**
```bash
cd backend
python scripts/create_admin.py --email admin@animaflow.com --name "Admin"
```

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
| [`sessions/`](sessions/) | Session reports de desarrollo |

---

## Sprint Summary

| Sprint | Fecha | Tema | Estado |
|---|---|---|---|
| [1–2](sprints/sprint-1-2-report.md) | May 2026 | Dashboard Foundation + Project Wizard | ✅ Completado |
| [3–4](sprints/sprint-3-4-report.md) | May 2026 | Voices, Scripts, Downloads + Settings & Profile | ✅ Completado |
| [5–6](sprints/sprint-5-6-report.md) | May 2026 | Authentication System + Voice Endpoints + User-Job FK | ✅ Completado |
| [7](sprints/sprint-7-report.md) | May 2026 | Backend Modularization + Production Hardening | ✅ Completado |
| [7+](sprints/sprint-7-plus-report.md) | May 2026 | Frontend Refactor + Audit Resolution + Toast System | ✅ Completado |
| [Post-Production](session-2026-05-25-llm-stability-dashboard-fixes.md) | May 2026 | LLM Stability + Positioning Engine + Dashboard UX | ✅ Completado |
| [Backend Critical Fixes](sessions/session-2026-05-31-backend-critical-fixes.md) | May 2026 | 8 Critical Security & Stability Fixes | ✅ Completado |
| [Backend Refactor Batches A-C](sessions/session-2026-06-01-backend-refactor-batches-abc.md) | Jun 2026 | 14 Fixes: Cleanup, Consistency, Refactor | ✅ Completado |
| [Backend Batch D](sessions/session-2026-06-01-backend-batch-d.md) | Jun 2026 | 5 Final Bug Fixes & Optimizations | ✅ Completado |

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
| [`backend/pipeline_narrative_animation.md`](backend/pipeline_narrative_animation.md) | Pipeline de animación narrativa |
| [`backend/ae_export_fixes_sesion6.md`](backend/ae_export_fixes_sesion6.md) | Fixes de exportación AE |
| [`backend/modularization.md`](backend/modularization.md) | Guía de modularización del backend (7 dominios) |
| [`backend/hardening.md`](backend/hardening.md) | Checklist de hardening para producción (P0-P2) |

---

## Frontend Documents

| Documento | Descripción |
|---|---|
| [`frontend/dashboard-architecture.md`](frontend/dashboard-architecture.md) | Arquitectura del dashboard, Zustand, routing |
| [`frontend/auth-integration.md`](frontend/auth-integration.md) | Integración de autenticación |
| [`frontend/remotion_generated_components.md`](frontend/remotion_generated_components.md) | Componentes Remotion generados |
| [`frontend/frontend-audit.md`](frontend/frontend-audit.md) | Resultado del audit y acciones tomadas |
| [`frontend/component-structure.md`](frontend/component-structure.md) | Estructura de componentes extraídos (ProjectDetail, Settings, Wizard) |

---

## QA Documents

| Documento | Descripción |
|---|---|
| [`qa/testing-guide.md`](qa/testing-guide.md) | Guía de testing completa |
| [`qa/estrategia.md`](qa/estrategia.md) | Estrategia de testing |
| [`qa/test-results.md`](qa/test-results.md) | Resultados de tests (32 tests pasando) |

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
| [ADR-010](adr/010-backend-modularization.md) | Backend Modularization — Monolith to Modular Monolith | ✅ Implementado |
| [ADR-012](adr/012-critical-backend-fixes.md) | Critical Backend Security & Stability Fixes | ✅ Implementado |

### Calidad Visual (linaje visual-quality)
Plan vivo y ADRs sobre la calidad de los videos generados (composición, posicionamiento, selección de componentes, animación):

| Documento | Estado | Descripción |
|---|---|---|
| [**PLAN-MEJORA-CALIDAD.md**](../PLAN-MEJORA-CALIDAD.md) | 🟡 En curso | **Plan canónico vivo** — roadmap por fases (0a→5) para llevar la calidad a nivel profesional |
| [ADR-011 v8](adr-011-visual-quality-v8.md) | 🟡 0a/0b/1 + Fase 2 parcial + Fase 3 en curso | Infra + wins visuales + **manifest** + responsividad (parcial) + **de-solapamiento por bounding box** y bugs de texto (Fase 3) |
| [ADR-010 v7](adr-010-visual-quality-v7.md) | ✅ Implementado | Posicionamiento (contrato de coordenadas), selección, animación sincronizada (karaoke) |
| [ADR-009 v5](adr-009-visual-quality-v5.md) | ✅ Implementado | Calidad visual v5 |
| [ADR-008 v4](adr-008-visual-quality-v4.md) | ✅ Implementado | Calidad visual v4 |
| [coordinate-contract.md](coordinate-contract.md) | ✅ Vigente | Contrato de coordenadas (LEER antes de crear/editar un componente) |
| [responsive-contract.md](responsive-contract.md) | ✅ Vigente (Fase 2) | Contrato de responsividad: dimensionar con `useCanvas()` (vmin/vw/vh) y layout por orientación |

---

## Session Reports

| Documento | Fecha | Descripción |
|---|---|---|
| [Session 2026-05-25 (Scheduler & UX)](sessions/session-2026-05-25-scheduler-ux-design-templates.md) | 2026-05-25 | Scheduler Optimization, UX Overhaul & Design Templates |
| [Session 2026-05-25 (LLM & UX)](sessions/session-2026-05-25-llm-stability-dashboard-fixes.md) | 2026-05-25 | LLM Stability, Positioning Engine & Dashboard UX Overhaul |
| [Session 2026-05-25 (Transitions)](sessions/session-2026-05-25-transitions-vector-search.md) | 2026-05-25 | Transitions, Vector Search & Component Intelligence |
| [Session 2026-05-23](sessions/session-2026-05-23-transparency-animations.md) | 2026-05-23 | Transparencia, Playground y Continuidad |
| [Session 2026-05-22](sessions/session-2026-05-22-component-architecture-v2.md) | 2026-05-22 | Component Architecture v2 (33 componentes) |
| [Session 2026-05-20](sessions/cleanup-session-2026-05-20.md) | 2026-05-20 | Limpieza y Corrección (36 fixes) |
| [Session 2026-05-31 (Backend Fixes)](sessions/session-2026-05-31-backend-critical-fixes.md) | 2026-05-31 | 8 Critical Backend Security & Stability Fixes |
| [Session 2026-06-01 (Refactor Batches)](sessions/session-2026-06-01-backend-refactor-batches-abc.md) | 2026-06-01 | 14 Backend Refactor Fixes (Batches A, B, C) |
| [Session 2026-06-01 (Batch D)](sessions/session-2026-06-01-backend-batch-d.md) | 2026-06-01 | 5 Final Backend Bug Fixes & Optimizations |

### New ADRs
| ADR | Título | Estado |
|---|---|---|
| [ADR-011](adr/011-deterministic-positioning-engine.md) | Deterministic Backend Positioning over Secondary LLM | ✅ Implementado |
| [ADR-012](adr/012-integer-linewidth-schema.md) | Integer-only lineWidth Schema for Gemini | ✅ Implementado |
| [ADR-013](adr/013-graceful-degradation-strategy.md) | Per-scene Fallback to "Fade Text" on LLM Failure | ✅ Implementado |

