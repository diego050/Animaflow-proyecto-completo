# AnimaFlow

**Text-to-video pipeline with frame-accurate precision.**

AnimaFlow converts text or audio into editable, frame-accurate video projects — delivering both a rendered MP4 and a structured project spec (`spec.json`) for full post-production control.

---

## What It Does

1. **Input:** Paste a script or upload an audio file
2. **Pipeline:** TTS → intelligent segmentation (~7s chunks) → LLM-driven animation prompts → SFX cue extraction
3. **Output:** Download a ready-to-publish MP4 + an editable `spec.json` with layers, timings, keyframes, and animation properties

## Why It Exists

AI-generated video outputs are flat MP4s with no editability, no layer control, and unpredictable results. AnimaFlow solves this by producing deterministic, structured video projects that remain fully editable after generation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Zustand, Remotion |
| Backend | FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 + Alembic |
| Async Pipeline | DB-driven scheduler (asyncio) — no external queue system |
| Rendering | Node.js Render Server (`@remotion/renderer`) |
| Database | PostgreSQL 15 |
| Infra | Docker Compose, VPS/Hostinger |

---

## Project Structure

```
├── /backend          # FastAPI API, scheduler, schemas, database models
├── /frontend         # React UI, Remotion player, component registry
├── /servers          # Node.js Render Server
├── /specs            # spec.json schema (source of truth)
├── /docs             # Architecture decisions, deployment guides, session reports
├── /scripts          # Deploy, merge, and automation scripts
└── docker-compose.prod.yml
```

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### Run Locally

```bash
# 1. Start infrastructure
docker compose -f docker-compose.prod.yml up -d postgres redis

# 2. Backend
cd backend && pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd frontend && npm install
npm run dev  # http://localhost:3000
```

---

## Status

🚧 **MVP in development** — Core pipeline under active construction.

| Milestone | Status |
|---|---|
| Async pipeline architecture | ✅ Complete |
| spec.json schema v1 | ✅ Defined |
| Component registry | 🔄 In progress |
| End-to-end render | 🚧 Working |
| Auth (JWT) | ✅ Complete |

---

## License

Private — All rights reserved.
