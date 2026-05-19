# AnimaFlow — Agent Instructions

## Project Overview
AnimaFlow is a SaaS platform that converts text/audio into editable, frame-accurate video projects for Adobe After Effects via a structured `spec.json` pipeline.

**Core Differentiator:** Dual export (MP4 + `spec.json`) with intelligent audio-text segmentation, LLM-driven boundary correction, animation prompt generation, and SFX cue extraction.

## Tech Stack
- **Frontend:** React 18 + TypeScript, Vite, TailwindCSS, Zustand, Remotion
- **Backend:** FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 + Alembic (PostgreSQL)
- **Async Workers:** RQ + Redis (background rendering, TTS, LLM correction, prompt generation)
- **Infra:** Docker Compose (Postgres, Redis), VPS/Hostinger deploy
- **Auth:** JWT native (FastAPI + python-jose/PyJWT), role-based (founder, agency, user, admin)

## Project Structure
```
/animaflow-proyecto-completo
├── /backend
│   ├── /app
│   │   ├── /api        # FastAPI routers
│   │   ├── /core       # Config, security, JWT, logging
│   │   ├── /db         # SQLAlchemy models, Alembic migrations
│   │   ├── /services   # Remotion trigger, TTS, LLM, RQ workers
│   │   └── /schemas    # Pydantic models (spec.json validation)
│   ├── requirements.txt
│   └── Dockerfile
├── /frontend
│   ├── /src
│   │   ├── /components # UI elements
│   │   ├── /remotion   # Video compositions
│   │   ├── /store      # Zustand stores
│   │   ├── /types      # TS interfaces (mirror backend schemas)
│   │   └── /api        # API client / fetch wrappers
│   ├── package.json
│   └── vite.config.ts
├── /specs
│   └── spec_schema.json # Source of truth for pipeline
├── /docs               # Architecture, ADRs, sprint reports
├── /spec.md            # Product specification
├── /.opencode/agents/  # Agent definitions
├── /.agents/skills/    # Installed skills
└── docker-compose.yml
```

## Critical Rules

### Product Validation
- Zero solution bias in product validation
- Follow "Mom Test" framework rigorously for interviews
- Never mention specific tools (After Effects), technical internals (spec.json), or dual export in initial user conversations

### MVP Prioritization
- MVP functional in 20 days max priority
- "MVP first, visual UI later": initial editor is code/prompt-driven only
- Drag-and-drop UI is strictly v2 roadmap
- Dual export (MP4 + spec.json) is mandatory, must work between Sprint 1-2
- **Stability > Features**: 95% render success rate required before scaling

### Development
- Avoid over-engineering: use managed services until WTP is validated
- Living Documentation: every technical decision logged immediately with date & owner
- No payments/subscriptions before Sprint 5
- Pilot users first → feedback → iterate → commercial conversion

## Core Pipeline
```
Input → job_id (immediate) → RQ workers → Frontend polling → MP4 + spec.json
  1. TTS Worker: audio.mp3 + word-level timestamps
  2. Segmentation Worker: ~7s chunks
  3. LLM Worker: boundary correction + media_query + remotion_props + SFX
  4. Render Worker: spec.json → Remotion → MP4
```

**Never block the main thread.** All async, idempotent, retry-safe.

## Development Workflow

### Initialization
```bash
# 1. Infrastructure
docker-compose up -d postgres redis

# 2. Backend
cd backend && pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd frontend && npm install
npm run dev  # port 3000
```

### Agent Coordination
- **Orchestrator** (`@orchestrator`): Primary agent. Manages stack coordination, pipeline flow, code quality.
- **Architecture** (`@architecture`): spec.json schema, pipeline topology, system diagrams.
- **Backend** (`@backend`): FastAPI, Pydantic, SQLAlchemy, Alembic, RQ workers.
- **Frontend** (`@frontend`): React UI, Zustand, Remotion player, export triggers.
- **QA** (`@qa`): pytest, vitest, Playwright E2E, spec.json validation.

## Code Standards
- **TypeScript:** Strict mode. No `any`. Frontend types mirror Pydantic schemas 1:1
- **Python:** Pydantic v2 for all I/O. SQLAlchemy 2.0. PEP8 + `ruff` linting
- **Remotion:** `<Composition>` and `<Sequence>` strictly. 30fps locked. No direct DOM mutations
- **Git:** Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`). PRs require passing CI

## Guardrails
- No sync rendering in FastAPI request handlers
- spec.json immutable without version bump + migration
- Every external dependency (TTS, LLM, Storage) needs deterministic fallback
- If feature adds >2 days complexity or unmanaged infra → defer to v2
- Prioritize "functional, measurable, stable" over "perfect, scalable"
