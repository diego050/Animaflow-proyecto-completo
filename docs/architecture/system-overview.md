# System Overview

> **Fecha:** Mayo 2026 | **Estado:** Sprints 1–6 completados

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  React 18 + TypeScript (Vite)                                │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │    │
│  │  │ Dashboard│ │  Wizard  │ │ Settings │ │  VoicesPage  │   │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │    │
│  │       └────────────┴────────────┴──────────────┘            │    │
│  │                         │                                    │    │
│  │  ┌──────────────────────┴──────────────────────────────┐    │    │
│  │  │  Zustand Stores                                      │    │    │
│  │  │  ┌──────────────────┐  ┌─────────────────────────┐  │    │    │
│  │  │  │  useAuthStore    │  │  useDashboardStore      │  │    │    │
│  │  │  │  (user, token)   │  │  (jobs, voices, wizard) │  │    │    │
│  │  │  └──────────────────┘  └─────────────────────────┘  │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │                         │                                    │    │
│  │  ┌──────────────────────┴──────────────────────────────┐    │    │
│  │  │  API Client (apiFetch + apiUpload)                   │    │    │
│  │  │  Auto Bearer token attachment, 401 → redirect login  │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ HTTP/JSON + Bearer JWT
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API LAYER                                     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  FastAPI (Python 3.11+)                                      │    │
│  │                                                              │    │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐   │    │
│  │  │ /api/auth  │ │ /api/jobs│ │/api/voices│ │/api/exports│   │    │
│  │  │ register   │ │ CRUD     │ │ CRUD     │ │ MP4/AE/json│   │    │
│  │  │ login      │ │ generate │ │ upload   │ │ download   │   │    │
│  │  │ me (GET/PUT)│ │ render  │ │ preview  │ │            │   │    │
│  │  └─────┬──────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘   │    │
│  │        └─────────────┴────────────┴─────────────┘           │    │
│  │                         │                                    │    │
│  │  ┌──────────────────────┴──────────────────────────────┐    │    │
│  │  │  Security Layer                                      │    │    │
│  │  │  get_current_active_user → JWT decode → User lookup  │    │    │
│  │  │  All routes protected (except register/login)        │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ SQLAlchemy 2.0 ORM
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                       │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │  PostgreSQL      │    │  Redis           │                       │
│  │                  │    │                  │                       │
│  │  ┌────────────┐  │    │  ┌────────────┐  │                       │
│  │  │ users      │  │    │  │ Job Queue  │  │                       │
│  │  │ jobs       │  │    │  │ (RQ)       │  │                       │
│  │  │ voices     │  │    │  └────────────┘  │                       │
│  │  └────────────┘  │    │                  │                       │
│  └──────────────────┘    └────────┬─────────┘                       │
│                                   │                                  │
│                          ┌────────┴─────────┐                       │
│                          │  RQ Workers      │                       │
│                          │                  │                       │
│                          │  1. TTS Worker   │                       │
│                          │  2. Segmentation │                       │
│                          │  3. LLM Worker   │                       │
│                          │  4. Render Worker│                       │
│                          └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Relationships

### Frontend Components

```
App
├── AuthProvider (route guards)
│   ├── LoginPage
│   └── ProtectedRoute
│       ├── DashboardLayout
│       │   ├── Sidebar (navigation)
│       │   ├── Topbar (user info + logout)
│       │   └── Outlet (page content)
│       │       ├── ProjectsList
│       │       │   └── ProjectCard × N
│       │       ├── ProjectDetail
│       │       │   ├── Tab: Guión
│       │       │   ├── Tab: Preview (PreviewPlayer)
│       │       │   ├── Tab: Editor (SceneEditor)
│       │       │   └── Tab: Exportar
│       │       ├── NewProjectWizard (4 steps)
│       │       ├── VoicesPage
│       │       ├── ScriptsPage
│       │       ├── DownloadsPage
│       │       └── SettingsPage (4 tabs)
│       └── ComingSoon (placeholder)
```

### Backend Services

```
FastAPI App
├── API Routers
│   ├── auth.py      → register, login, me
│   ├── jobs.py      → CRUD, generate-script, render, regenerate
│   ├── voices.py    → CRUD, upload-sample, preview
│   ├── exports.py   → MP4, AE, spec.json
│   └── audio.py     → audio playback
├── Core
│   ├── config.py    → settings (env vars)
│   └── security.py  → JWT, bcrypt, auth deps
├── DB
│   ├── models.py    → User, JobModel, Voice
│   └── session.py   → SQLAlchemy engine/session
├── Schemas
│   ├── auth.py      → UserCreate, Token, UserResponse
│   ├── job.py       → JobCreate, JobResponse, etc.
│   └── voice.py     → VoiceCreate, VoiceResponse, etc.
└── Services
    └── pipeline.py  → TTS, segmentation, LLM, render
```

---

## Data Flow: Input → Video

```
┌─────────┐     ┌──────────┐     ┌───────────────┐     ┌──────────┐
│  User   │────▶│  FastAPI │────▶│  Redis Queue  │────▶│  Worker  │
│  Input  │     │  POST /  │     │  (enqueue)    │     │  Pool    │
│  (text) │     │  jobs    │     │               │     │          │
└─────────┘     └──────────┘     └───────────────┘     └────┬─────┘
                                                             │
                    ┌────────────────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PIPELINE (RQ Workers)                          │
│                                                                   │
│  Step 1: TTS Worker                                               │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Voicebox (Kokoro engine) → audio.mp3 + word timestamps  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                            │                                      │
│                            ▼                                      │
│  Step 2: Segmentation Worker                                      │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Split script into ~7s chunks → scenes[]                 │    │
│  └──────────────────────────────────────────────────────────┘    │
│                            │                                      │
│                            ▼                                      │
│  Step 3: LLM Worker                                               │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Boundary correction + media_query + remotion_props + SFX│    │
│  │  → Complete spec.json                                    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                            │                                      │
│                            ▼                                      │
│  Step 4: Render Worker                                            │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  spec.json → Remotion → MP4                              │    │
│  └──────────────────────────────────────────────────────────┘    │
│                            │                                      │
│                            ▼                                      │
│  Step 5: AE Export (on demand)                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  spec.json → After Effects project (.zip)                │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    OUTPUT                                         │
│                                                                   │
│  • MP4 video (Remotion render)                                    │
│  • spec.json (editable timeline contract)                         │
│  • After Effects .zip (AE project package)                        │
│                                                                   │
│  Frontend polls GET /api/jobs/{id} every 3s until terminal status │
└──────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack Summary

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend UI | React | 18.x | Component framework |
| Frontend Build | Vite | 5.x | Dev server + bundler |
| Frontend Types | TypeScript | 5.x | Type safety |
| Styling | TailwindCSS | 3.x | Utility-first CSS |
| State Management | Zustand | 4.x | Global state |
| Video Preview | Remotion | 4.x | In-browser player |
| Backend API | FastAPI | 0.115+ | REST API framework |
| Data Validation | Pydantic | v2 | Request/response schemas |
| ORM | SQLAlchemy | 2.0 | Database abstraction |
| Migrations | Alembic | 1.14+ | Schema versioning |
| Database | PostgreSQL | 16.x | Persistent storage |
| Queue | Redis + RQ | 7.x / 1.16+ | Async task processing |
| Auth | python-jose | 3.3+ | JWT encoding/decoding |
| Passwords | passlib[bcrypt] | 1.7+ | Bcrypt hashing |
| TTS Engine | Voicebox (Kokoro) | — | Text-to-speech |

---

## Deployment Architecture

```
┌───────────────────────────────────────────────────────┐
│                    VPS / Hostinger                      │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Docker Compose                                   │  │
│  │                                                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │  │
│  │  │ Postgres │  │  Redis   │  │  FastAPI      │  │  │
│  │  │ :5432    │  │  :6379   │  │  :8000        │  │  │
│  │  └──────────┘  └──────────┘  └───────┬───────┘  │  │
│  │                                      │           │  │
│  │  ┌───────────────────────────────────┴───────┐  │  │
│  │  │  RQ Workers (separate containers)         │  │  │
│  │  │  - TTS worker                              │  │  │
│  │  │  - LLM worker                              │  │  │
│  │  │  - Render worker                           │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Nginx (reverse proxy)                           │  │
│  │  :80 → :443 (SSL)                                │  │
│  │  / → Frontend (static)                           │  │
│  │  /api/* → FastAPI                                │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│                    CDN / Storage                        │
│                                                        │
│  • Video outputs (MP4) → /storage/outputs/             │
│  • Voice samples → /storage/voice_samples/             │
│  • AE exports → /storage/ae_exports/                   │
│  • spec.json → /storage/specs/                         │
└───────────────────────────────────────────────────────┘
```
