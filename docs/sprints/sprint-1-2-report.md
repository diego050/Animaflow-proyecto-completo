# Sprint 1-2 Report: Dashboard Foundation + Project Wizard

> **Fecha:** Mayo 2026 | **Status:** ✅ Completado

---

## Goals

1. Build the foundational dashboard UI with project listing
2. Implement project creation wizard with AI script generation
3. Connect frontend to existing backend job endpoints
4. Establish state management patterns (Zustand)
5. Integrate existing PreviewPlayer and SceneEditor components

---

## What Was Completed

### Sprint 1: Dashboard Foundation

- **Zustand store** (`useDashboardStore`) for dashboard state management
  - Jobs list, selected job, wizard state, polling
  - Actions: fetchJobs, selectJob, createJob, startPolling, stopPolling
- **DashboardLayout** with sidebar navigation
  - 256px fixed width, collapsible on mobile
  - Navigation items: Proyectos, Voces, Guiones, Descargas, Configuración
- **ProjectsList page** with job cards
  - Auto-refresh on mount
  - Status badges with color coding
  - Progress steps visual tracker
- **ProjectDetail page** with 4 tabs
  - Guión (script text)
  - Preview (PreviewPlayer integration)
  - Editor (SceneEditor integration)
  - Exportar (MP4, AE, spec.json download)
- **Reusable components:**
  - `StatusBadge` — 10 job states with semantic colors
  - `ProjectCard` — job summary with status and actions
  - `ProgressSteps` — pipeline stage visualization
- **TypeScript types** mirroring backend Pydantic schemas 1:1

### Sprint 2: Project Creation Wizard

- **NewProjectWizard** (4 steps)
  - Step 1: Info — project description input
  - Step 2: Script — AI-generated script with voice selector
  - Step 3: Processing — real-time status polling (3s interval)
  - Step 4: Done — completion with navigation to project
- **AI script generation** via `POST /api/jobs/generate-script`
- **Real-time polling** — auto-stops on terminal status
- **Integration** of existing PreviewPlayer and SceneEditor
- **ComingSoon** placeholder component for future features

---

## Files Created/Modified

### Frontend

| File | Action | Description |
|---|---|---|
| `frontend/src/store/useDashboardStore.ts` | Created | Main dashboard Zustand store |
| `frontend/src/types/job.ts` | Created | TypeScript types (JobSummary, JobDetail, Voice, Script, etc.) |
| `frontend/src/components/DashboardLayout.tsx` | Created | Layout with sidebar + topbar |
| `frontend/src/pages/ProjectsList.tsx` | Created | Project listing page |
| `frontend/src/pages/ProjectDetail.tsx` | Created | Project detail with tabs |
| `frontend/src/pages/NewProjectWizard.tsx` | Created | 4-step project creation wizard |
| `frontend/src/components/StatusBadge.tsx` | Created | Status badge component |
| `frontend/src/components/ProjectCard.tsx` | Created | Project card component |
| `frontend/src/components/ProgressSteps.tsx` | Created | Pipeline progress tracker |
| `frontend/src/components/ComingSoon.tsx` | Created | Placeholder component |
| `frontend/src/api/client.ts` | Created | API client with Bearer token |
| `frontend/src/App.tsx` | Modified | Router configuration |

---

## Key Decisions

| Decision | Rationale |
|---|---|
| Zustand over Redux | Simpler API, less boilerplate, better TypeScript support |
| Polling (3s) over WebSockets | Simpler implementation, sufficient for MVP, no infrastructure needed |
| Tab-based ProjectDetail | Keeps related content together, avoids page navigation |
| Types mirror Pydantic 1:1 | Ensures frontend/backend contract consistency |
| 256px sidebar width | Standard dashboard pattern, readable nav labels |

---

## Issues Encountered

| Issue | Resolution |
|---|---|
| Polling interval cleanup | Used module-level `pollingInterval` variable with `stopPolling()` cleanup |
| Job status type safety | Created `isTerminalStatus()` helper function and `JobStatus` type union |
| Wizard state persistence | Stored in Zustand (not localStorage) — wizard is ephemeral by design |
| Component integration | Existing PreviewPlayer and SceneEditor required prop adaptation |

---

## Metrics

- **Components created:** 9
- **Pages created:** 3
- **Store actions:** 12
- **TypeScript types:** 15+
- **Lines of code:** ~2,500 (frontend)
