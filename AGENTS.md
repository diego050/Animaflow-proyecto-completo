# AnimaFlow — Agent Instructions

## Project Overview
AnimaFlow is a SaaS platform that converts text/audio into editable, frame-accurate video projects for Adobe After Effects via a structured `spec.json` pipeline.

**Core Differentiator:** Dual export (MP4 + `spec.json`) with intelligent audio-text segmentation, LLM-driven boundary correction, animation prompt generation, and SFX cue extraction.

## Tech Stack
- **Frontend:** React 18 + TypeScript, Vite, TailwindCSS, Zustand, Remotion
- **Backend:** FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 + Alembic (PostgreSQL)
- **Async Workers:** DB-driven scheduler (asyncio) + Render Server (Node.js)
- **Infra:** Docker Compose (Postgres, Redis, API, Frontend, Render Server), VPS/Hostinger deploy
- **Auth:** JWT native (FastAPI + python-jose/PyJWT), role-based (founder, agency, user, admin)

## Project Structure
```
/animaflow-proyecto-completo
├── /backend
│   ├── /app
│   │   ├── /api        # FastAPI routers
│   │   ├── /core       # Config, security, JWT, logging
│   │   ├── /db         # SQLAlchemy models, Alembic migrations
│   │   ├── /services   # Remotion trigger, TTS, LLM, scheduler
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
├── /.opencode/         # Agents, commands, skills
├── /.agents/skills/    # Installed skills (OpenCode compatible)
└── docker-compose.prod.yml
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
- Stability > Features: 95% render success rate required before scaling

### Architecture & Animation Standards
- **High-Fidelity Automated Graphics:** Abandon raw SVG/React generation via LLM. Use declarative physics (`spring`, `interpolate`) via `Remotion Animated` or pre-built `Remocn` / `shadcn` registries.
- **Strict Determinism:** NEVER use Framer Motion, standard Tailwind `animate-*` utilities, or GSAP without forced time-mocking (`useCurrentFrame`).
- **Scalable UI:** Editor remains code/prompt-driven initially, but visual outputs must be premium from Day 1 using the component registry.
- Dual export (MP4 + spec.json) remains mandatory.
- **Stability > Features**: 95% render success rate required before scaling.

### Development & Technical Debt
- Avoid over-engineering: use managed services until WTP is validated
- Living Documentation: every technical decision logged immediately with date & owner
- No payments/subscriptions before Sprint 5
- Pilot users first → feedback → iterate → commercial conversion

## Core Pipeline
```
Input → job_id (immediate) → scheduler.py (asyncio) → Frontend polling → MP4 + spec.json
  1. TTS: audio.mp3 + word-level timestamps
  2. Segmentation: ~7s chunks
  3. LLM: boundary correction + media_query + remotion_props + SFX
  4. Render: spec.json → Render Server → MP4
```

**Never block the main thread.** All async, idempotent, retry-safe.

## Development Workflow

### Initialization
```bash
# 1. Infrastructure
docker-compose -f docker-compose.prod.yml up -d postgres redis

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
- **Backend** (`@backend`): FastAPI, Pydantic, SQLAlchemy, Alembic, scheduler, render adapter.
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

---

## Design System: "The Blueprint Palette"

### Color Palette
| Token | Value | Usage |
|---|---|---|
| primary | `#2C3E50` (Steel Blue) | Stability, technical professionalism |
| secondary | `#FF8C00` (Cadmium Orange) | Precision indicators, anchor points, alerts |
| accent/cta | `#00FFAB` (Mint Precision) | Positive actions, "Sync Ready" states |
| background | `#0F172A` (Deep Slate) | Main background, reduces eye fatigue |
| surface | `#1E293B` | Side panels, controls |
| border | `#334155` | 1px defined borders |

### Typography
| Role | Font | Weight | Usage |
|---|---|---|---|
| Display | Inter Tight | Bold/SemiBold | Technical titles |
| Body/UI | Inter | Regular/Medium | SaaS interface standard |
| Mono | JetBrains Mono | — | Timestamps, JSON specs, code |

### Motion Principles
- **Deliberate rhythm:** No playful bounces. Transitions 150ms-250ms with `cubic-bezier(0.4, 0, 0.2, 1)`
- **Microinteractions:** Hover = subtle border expansion (1px → 2px). Export feedback via segmented progress bars
- **State handling:** Technical skeletons showing layer structure before content loads

### Visual Metaphors
**✅ Allowed:** Nodes & connectors, separated layers (z-index), reference grids (20px dots), wireframes during processing, exact frame timestamps
**❌ Prohibited:** Brains/neurons, star dust/magic, humanoids/robots, iridescent gradients, extreme diffuse shadows

### Logo Concepts
1. **Sync Frame:** Technical brackets enclosing a central anchor point
2. **Layer Bridge:** Three staggered horizontal lines forming a flow arrow
3. **The Spec Grid:** A "P" formed by grid dots connected by thin lines
