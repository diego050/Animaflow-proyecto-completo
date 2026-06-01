# Session 2026-05-25: Scheduler Optimization, UX Overhaul & Design Templates

**Date:** 2026-05-25 (Evening Session)  
**Owner:** Technical Orchestrator  
**Status:** Implemented & Verified

## Summary
Major improvements to the job approval pipeline (eliminating 60s limbo), comprehensive UX fixes across Dashboard pages (flash of empty state, black boxes, translucent cards), corrected Wizard flow to reflect Preview-first architecture, and implemented Design Templates feature for reusable `design.md` files.

---

## 1. Scheduler Optimization: Eliminating the "Approval Limbo"

### 1.1 Problem
When users approved scenes, the job stayed in `segmented` status. The Scheduler relied on Postgres `NOTIFY` which sometimes didn't fire for JSON column updates or same-status updates. It fell back to a **60-second sleep**, causing a noticeable delay before enrichment started.

### 1.2 Solution
**File:** `backend/app/core/scheduler.py`
- Reduced sleep timeout from `60.0` to `5.0` seconds. Scheduler now polls every 5s instead of sleeping a full minute.
- Added `queued_enrichment` to the SQL `WHERE IN` clause for job pickup.
- Added handler: when status is `queued_enrichment`, transitions to `visuals_generating` and returns `(job_id, 'enrichment')`.

**File:** `backend/app/api/jobs.py`
- Changed `approve_scenes` endpoint: `job.status = "segmented"` → `job.status = "queued_enrichment"`.
- This guarantees a distinct status string change that fires the Postgres trigger and is picked up immediately.

### 1.3 Result
Approval → Scheduler detects in ≤5 seconds → Enrichment starts. No more 60-second limbo.

---

## 2. File-Based Logging (Redis Removed)

### 2.1 Problem
The `/api/jobs/{job_id}/logs` endpoint was hardcoded to return `{"logs": []}` because Redis was removed from the project. Users had zero visibility into pipeline progress.

### 2.2 Solution
**File:** `backend/app/core/file_logger.py` (Created)
- New `JobFileLogger` class with:
  - `log(job_id, level, message)` — Appends JSON lines to `storage/logs/{job_id}.log`
  - `get_logs(job_id)` — Reads and parses all log entries, returns `[]` if file doesn't exist

**File:** `backend/app/api/jobs.py`
- Updated `get_job_logs` to return `JobFileLogger.get_logs(job_id)` instead of empty array.

**File:** `backend/app/modules/pipeline/orchestrator.py`
- Added logging calls at key pipeline steps:
  - Phase 1: "Segmentando texto...", "Generando TTS...", "Generando prompts visuales...", "Esperando aprobación del usuario..."
  - Phase 2: "Procesando escenas (TTS + Componentes)...", "Iniciando generación de componentes con IA..."
  - Per-scene: "Generando escena X/Y..."
  - Completion: "Componentes generados. Finalizando..."

### 2.3 Result
Users can now see real-time progress logs in the frontend without Redis dependency.

---

## 3. Dashboard UX: Flash of Empty State & Black Boxes

### 3.1 Problem
When loading the Dashboard/Videos page:
1. Store initialized with `jobsLoading: false` and `jobs: []`
2. React rendered "No hay proyectos" immediately
3. Then `fetchJobs()` started, showing a spinner
4. Then data arrived, showing the grid
5. **Result:** Flash of empty state → spinner → content. Plus black boxes from Framer Motion layout shifts.

### 3.2 Solution
**File:** `frontend/src/store/useJobsStore.ts`
- Changed initial `jobsLoading` from `false` to `true`. UI shows loading state immediately on mount.

**File:** `frontend/src/components/dashboard/JobCardSkeleton.tsx` (Created)
- Skeleton component matching exact shape of video cards: `aspect-video` thumbnail, text lines, action button placeholders.
- Uses `animate-pulse` with `bg-surface-container` on `bg-surface-high` card background.

**File:** `frontend/src/pages/dashboard/VideosPage.tsx`
- Replaced single `<Loader2>` spinner with a responsive grid of 8 `JobCardSkeleton` components.
- Uses same `grid-cols-*` classes as real job grid to prevent layout shifts.
- Removed unnecessary `<AnimatePresence>` wrapper from job grid container (prevented initial mount animation glitches causing black flashes).

### 3.3 Result
**Before:** Empty → Flash → Spinner → Content (layout shift + black boxes)  
**After:** Skeleton Grid → Content (smooth transition, zero layout shift)

---

## 4. ScriptsPage: Loading & Prompt Display

### 4.1 Problem
- Direct navigation to `/dashboard/scripts` showed empty/translucent cards because it relied on `jobs` from `useJobsStore` being pre-loaded by another page.
- Cards appeared translucent due to `bg-surface-container/95 backdrop-blur-sm`.
- Missing "Prompt Visual" section.

### 4.2 Solution
**File:** `frontend/src/pages/dashboard/ScriptsPage.tsx`
- Added `useEffect` that calls `fetchJobs()` if `jobs.length === 0`.
- Removed `if (jobs.length > 0)` guard from `fetchScripts` call — now runs unconditionally when `jobs` changes.

**File:** `frontend/src/store/useMediaStore.ts`
- Changed `scriptsLoading` initial state from `false` to `true`.
- Added `set({ scriptsLoading: true })` at start of `fetchScripts`.
- Added `prompt: j.script_text` to derived scripts.

**File:** `frontend/src/components/dashboard/ScriptCard.tsx`
- Changed background from `bg-surface-container/95 backdrop-blur-sm` to solid `bg-surface-container`.
- Added "PROMPT VISUAL" section with monospace font, mint-precision color, truncated to 150 chars.

### 4.3 Result
Direct navigation to Scripts page now loads jobs automatically, shows solid cards with prompt visual, no more translucency.

---

## 5. DownloadsPage: Show Only Actually Downloaded Items

### 5.1 Problem
Page showed 3 downloadable items (MP4, AE, spec.json) for every completed job, even if user never downloaded anything. Created misleading "available files" blocks.

### 5.2 Solution
**File:** `frontend/src/pages/dashboard/DownloadsPage.tsx`
- Added localStorage tracking: `STORAGE_KEY = 'animaflow_downloaded_jobs'`
- `getDownloadedIds()` — safely parses stored job IDs from localStorage
- `markAsDownloaded(jobId)` — adds job ID to list, persists, triggers re-render
- Changed filtering: only shows completed jobs where `downloadedIds.includes(j.job_id)`
- Updated all three download handlers (`handleDownloadMp4`, `handleDownloadAE`, `handleDownloadSpec`) to call `markAsDownloaded()` after successful download
- Updated empty state: "No hay descargas aún" → subtitle: "Descarga archivos de proyectos completados y aparecerán aquí."

### 5.3 Result
**Before:** Giant blocks for every completed job (even undownloaded)  
**After:** Empty state until user downloads something, then only downloaded jobs appear

---

## 6. VideosPage: Preview Modal Fix

### 6.1 Problem
Modal showed "Video no disponible para este proyecto" when job had no MP4 but had a Remotion preview (result_spec with scenes). Dead end for users.

### 6.2 Solution
**File:** `frontend/src/pages/dashboard/VideosPage.tsx`
- **Thumbnail click:** Only opens modal if `job.video_url` exists. Otherwise navigates to `/dashboard/project/{job_id}` where Remotion player lives.
- **Action buttons:** Added "Preview Interactivo" button for completed jobs without `video_url`.
- **Modal fallback:** Replaced "Video no disponible" with informative message + "Abrir Preview Interactivo" button that navigates to project detail.

### 6.3 Result
Users never hit a dead end. If no MP4, they're directed to the interactive Remotion preview with audio and animations.

---

## 7. Wizard Flow: Reflect Preview-First Architecture

### 7.1 Problem
Wizard still showed "Render" as Step 5 and "Listo" as Step 6, with message "Tu video ha sido generado". Users expected a finished MP4, but only the Preview was ready.

### 7.2 Solution
**File:** `frontend/src/components/wizard/WizardNavigation.tsx`
- Step 5: `'Render'` → `'Preview'`
- Step 6: `'Listo'` → `'Preview Listo'`

**File:** `frontend/src/components/wizard/WizardStepDone.tsx`
- Title: `'¡Proyecto completado!'` → `'¡Preview generado!'`
- Description: Clarifies that interactive preview is ready, not final MP4.
- Button: `'Ver Proyecto'` → `'Abrir Preview Interactivo'`
- Added note: `"Exportar MP4 disponible dentro del proyecto."`

**File:** `frontend/src/pages/dashboard/NewProjectWizard.tsx`
- Step 5 processing text: `'Generando Preview Interactivo'`, description: `'Creando componentes visuales y audio para tu previsualización.'`

### 7.3 Result
Flow now accurately reflects reality: `Approve → Generate Preview → Preview Ready → Go to Project (for Render)`

---

## 8. Design Templates Feature

### 8.1 Problem
Users had to upload `design.md` every time they created a project. No way to save and reuse designs.

### 8.2 Solution
**Backend (Already existed, verified & integrated):**
- `DesignTemplate` model in `backend/app/db/models.py`
- CRUD endpoints in `backend/app/api/design_templates.py` (`GET`, `POST`, `PUT`, `DELETE` `/api/design-templates`)
- `JobCreate` schema updated to accept `design_template_id: Optional[str]`
- `create_job` endpoint resolves template content and uses as `design_md`
- Scheduler reads `design_md` from `job.result_spec` and passes to pipeline

**Frontend (Newly implemented):**
- **`DesignTemplateModal.tsx`** (Created): Modal for managing templates (list, create, delete)
- **`WizardStepInfo.tsx`**: Added dropdown "Diseño guardado (opcional)" with "Ninguno" + templates list. Added "Gestionar diseños" button that opens modal. Fetches templates on mount.
- **`useWizardStore.ts`**: Added `designTemplateId: string` to `WizardData`, included in reset.
- **`NewProjectWizard.tsx`**: Passes `designTemplateId` to `WizardStepInfo` and `createJob`.
- **`useJobsStore.ts`**: `createJob` accepts `designTemplateId`, includes `design_template_id` in API body.

### 8.3 Result
Users can save multiple `design.md` files, select them from a dropdown in the Wizard, and reuse them across projects without re-uploading.

---

## 9. Files Modified Summary

### Backend
| File | Category | Changes |
|---|---|---|
| `backend/app/core/scheduler.py` | Scheduler | Reduced timeout 60s→5s, added `queued_enrichment` status handler |
| `backend/app/api/jobs.py` | API | Changed approve status to `queued_enrichment`, wired file logger |
| `backend/app/core/file_logger.py` | Logging | New file-based logger (created) |
| `backend/app/modules/pipeline/orchestrator.py` | Pipeline | Added logging calls at key steps |
| `backend/app/schemas/job.py` | Schema | Added `design_template_id` field |

### Frontend
| File | Category | Changes |
|---|---|---|
| `frontend/src/store/useJobsStore.ts` | State | `jobsLoading: true` initial, added `designTemplateId` param |
| `frontend/src/store/useMediaStore.ts` | State | `scriptsLoading: true` initial, prompt extraction |
| `frontend/src/store/useWizardStore.ts` | State | Added `designTemplateId` to WizardData |
| `frontend/src/components/dashboard/JobCardSkeleton.tsx` | UI Component | New skeleton loader (created) |
| `frontend/src/components/dashboard/ScriptCard.tsx` | UI Component | Solid background, prompt display |
| `frontend/src/components/wizard/DesignTemplateModal.tsx` | UI Component | New template management modal (created) |
| `frontend/src/components/wizard/WizardNavigation.tsx` | UI Component | Step labels: Render→Preview, Listo→Preview Listo |
| `frontend/src/components/wizard/WizardStepDone.tsx` | UI Component | Updated messages for preview-first flow |
| `frontend/src/components/wizard/WizardStepInfo.tsx` | UI Component | Added design template dropdown + modal trigger |
| `frontend/src/pages/dashboard/VideosPage.tsx` | UI Page | Skeleton grid, preview modal fix, interactive preview button |
| `frontend/src/pages/dashboard/ScriptsPage.tsx` | UI Page | Auto-fetch jobs, removed translucent styling |
| `frontend/src/pages/dashboard/DownloadsPage.tsx` | UI Page | localStorage tracking, show only downloaded jobs |
| `frontend/src/pages/dashboard/NewProjectWizard.tsx` | UI Page | Pass designTemplateId, updated step 5 text |

---

## 10. Key Decisions (ADR-style)

### ADR-014: File-Based Logging over Redis
- **Context:** Redis was removed from the project, breaking the log streaming system.
- **Decision:** Implement simple JSON-line file logger in `storage/logs/{job_id}.log`.
- **Consequences:** Zero infrastructure dependency, easy to debug, persists across restarts. Trade-off: no real-time streaming without polling (acceptable for MVP).

### ADR-015: Skeleton Loaders over Spinner
- **Context:** Single spinner caused layout shift and "flash of empty state".
- **Decision:** Use skeleton grid matching final card layout.
- **Consequences:** Smooth visual transition, zero layout shift, better perceived performance.

### ADR-016: localStorage for Download Tracking
- **Context:** No DB table for tracking user downloads. Adding one would be over-engineering for MVP.
- **Decision:** Use `localStorage` to track downloaded job IDs per browser.
- **Consequences:** Simple, zero backend changes, persists across sessions. Trade-off: not synced across devices (acceptable for MVP).

### ADR-017: Preview-First Wizard Flow
- **Context:** Users expected MP4 at end of Wizard, but architecture is Preview → Edit → Render on demand.
- **Decision:** Rename Wizard steps and messages to reflect "Preview" not "Render".
- **Consequences:** Sets correct expectations, reduces confusion about missing MP4.

---

## 11. Deployment Commands

```bash
cd /opt/animaflow
git add -A
git commit -m "feat: scheduler optimization, file logging, dashboard UX overhaul, design templates, preview-first wizard"
docker compose -f docker-compose.prod.yml up -d --build api frontend
docker exec animaflow-api-1 alembic upgrade head
```

## 12. Verification Steps

```bash
# 1. Check scheduler picks up approved jobs quickly
docker compose -f docker-compose.prod.yml logs -f api | grep "queued_enrichment"

# 2. Verify logs are being written
ls -la storage/logs/
cat storage/logs/{job_id}.log

# 3. Check frontend build
cd frontend && npm run build

# 4. Test design templates
curl -X POST http://localhost:8000/api/design-templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Design", "content": "# Test\nSome markdown"}'
```

---

*Documento generado por el agente Technical Orchestrator de AnimaFlow.*  
*Fecha: 2026-05-25*
