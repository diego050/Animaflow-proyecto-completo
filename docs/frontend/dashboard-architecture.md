# Dashboard Architecture

> **Fecha:** Mayo 2026 | **Sprints:** 1-4 | **Status:** Implemented

---

## Component Hierarchy

```
App
├── Router
│   ├── /login → LoginPage
│   ├── / → ProtectedRoute
│   │   └── DashboardLayout
│   │       ├── Sidebar (256px, collapsible)
│   │       │   ├── Logo
│   │       │   ├── NavItems
│   │       │   │   ├── Proyectos
│   │       │   │   ├── Voces
│   │       │   │   ├── Guiones
│   │       │   │   ├── Descargas
│   │       │   │   └── Configuración
│   │       │   └── CollapseButton (mobile)
│   │       ├── Topbar
│   │       │   ├── Page title
│   │       │   ├── User name
│   │       │   └── Logout button
│   │       └── <Outlet /> (page content)
│   │           ├── / → ProjectsList
│   │           │   └── ProjectCard × N
│   │           │       ├── StatusBadge
│   │           │       └── ProgressSteps
│   │           ├── /project/:id → ProjectDetail
│   │           │   ├── Tab: Guión
│   │           │   ├── Tab: Preview → PreviewPlayer
│   │           │   ├── Tab: Editor → SceneEditor
│   │           │   └── Tab: Exportar
│   │           ├── /new → NewProjectWizard
│   │           │   ├── Step 1: Info
│   │           │   ├── Step 2: Script (voice selector)
│   │           │   ├── Step 3: Processing (polling)
│   │           │   └── Step 4: Done
│   │           ├── /voices → VoicesPage
│   │           │   └── VoiceCard × N
│   │           ├── /scripts → ScriptsPage
│   │           │   └── ScriptCard × N
│   │           ├── /downloads → DownloadsPage
│   │           └── /settings → SettingsPage
│   │               ├── Tab: Perfil
│   │               ├── Tab: Preferencias
│   │               ├── Tab: API Keys
│   │               └── Tab: Facturación
│   └── * → ComingSoon
```

---

## Zustand Stores

### useAuthStore

**File:** `frontend/src/store/useAuthStore.ts`

| State | Type | Description |
|---|---|---|
| `user` | `User \| null` | Current user profile |
| `token` | `string \| null` | JWT from localStorage |
| `isLoading` | `boolean` | Loading state for auth operations |
| `error` | `string \| null` | Last error message |
| `isAuthenticated` | `boolean` | Derived from token presence |

| Action | Description |
|---|---|
| `login(credentials)` | POST /api/auth/login, store token |
| `register(data)` | POST /api/auth/register, store token |
| `logout()` | Clear token, reset state |
| `fetchMe()` | GET /api/auth/me, restore session |
| `updateProfile(data)` | PUT /api/auth/me |
| `clearError()` | Reset error state |

---

### useDashboardStore

**File:** `frontend/src/store/useDashboardStore.ts`

| State | Type | Description |
|---|---|---|
| `jobs` | `JobSummary[]` | User's project list |
| `jobsLoading` | `boolean` | Loading state |
| `jobsError` | `string \| null` | Last error |
| `selectedJob` | `JobDetail \| null` | Currently viewed project |
| `wizardStep` | `number` | Current wizard step (1-4) |
| `wizardData` | `WizardData` | Wizard form state |
| `pollingJobId` | `string \| null` | Currently polled job |
| `voices` | `Voice[]` | User's TTS voices |
| `scripts` | `Script[]` | Script library |
| `settings` | `UserSettings` | User preferences (localStorage) |

| Action | Description |
|---|---|
| `fetchJobs()` | GET /api/jobs |
| `selectJob(id)` | GET /api/jobs/{id} |
| `createJob(script, ratio, voiceId)` | POST /api/jobs/ |
| `generateScript(info)` | POST /api/jobs/generate-script |
| `deleteJob(id)` | DELETE /api/jobs/{id} |
| `triggerRender(id)` | POST /api/jobs/{id}/render |
| `regenerateScene(jobId, idx, query, text)` | POST /api/jobs/{id}/scenes/{idx}/regenerate |
| `startPolling(id)` | Poll every 3s until terminal status |
| `stopPolling()` | Clear polling interval |
| `fetchVoices()` | GET /api/voices/ |
| `createVoice(data)` | POST /api/voices/ |
| `updateVoice(id, data)` | PUT /api/voices/{id} |
| `deleteVoice(id)` | DELETE /api/voices/{id} |
| `uploadVoiceSample(id, file)` | POST /api/voices/{id}/upload-sample |
| `previewVoice(id, text)` | POST /api/voices/{id}/preview |
| `updateSettings(partial)` | Persist to localStorage |

---

## Routing Structure

**Router config:** `frontend/src/App.tsx`

| Path | Component | Auth | Description |
|---|---|---|---|
| `/login` | `LoginPage` | Public | Authentication |
| `/` | `DashboardLayout` → `ProjectsList` | Protected | Home / project list |
| `/project/:id` | `ProjectDetail` | Protected | Project detail with tabs |
| `/new` | `NewProjectWizard` | Protected | Create new project |
| `/voices` | `VoicesPage` | Protected | Voice management |
| `/scripts` | `ScriptsPage` | Protected | Script library |
| `/downloads` | `DownloadsPage` | Protected | Export history |
| `/settings` | `SettingsPage` | Protected | User settings |

**Route guards:** `ProtectedRoute` component checks `isAuthenticated` from `useAuthStore`.

---

## API Client Pattern

**File:** `frontend/src/api/client.ts`

### apiFetch<T>()

Core fetch wrapper with:
- Automatic Bearer token from `localStorage`
- `Content-Type: application/json` header
- 401 handling → clear token → redirect to `/login`
- 204 handling → return empty object
- Error parsing → `data.detail` or generic message

### apiUpload<T>()

Multipart form upload for:
- Voice sample audio files
- Does NOT set `Content-Type` (browser sets with boundary)
- Same auth and error handling as `apiFetch`

### Convenience Methods

```typescript
export const api = {
  get: <T>(endpoint: string) => apiFetch<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) => apiFetch<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  }),
  put: <T>(endpoint: string, body?: unknown) => apiFetch<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  }),
  delete: (endpoint: string) => apiFetch(endpoint, { method: 'DELETE' }),
};
```

---

## State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│                    APP INITIALIZATION                     │
│                                                           │
│  1. App mounts                                            │
│  2. useAuthStore reads token from localStorage            │
│  3. If token exists → fetchMe() to validate session       │
│  4. If valid → render dashboard                           │
│  5. If invalid → redirect to /login                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    PROJECT CREATION                       │
│                                                           │
│  1. User clicks "Nuevo Proyecto"                          │
│  2. Navigate to /new → NewProjectWizard                   │
│  3. Step 1: Enter project info                            │
│  4. Step 2: Generate script (POST /api/jobs/generate-script)│
│     └── Select voice from voices list                     │
│  5. Step 3: Create job (POST /api/jobs/)                  │
│     └── Start polling (every 3s)                          │
│  6. Step 4: Show completion when terminal status reached  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    JOB POLLING                            │
│                                                           │
│  1. startPolling(jobId) called                            │
│  2. setInterval every 3000ms:                             │
│     a. GET /api/jobs/{jobId}                              │
│     b. Update selectedJob in store                        │
│     c. Update status in jobs list                         │
│     d. If terminal status → stopPolling()                 │
│  3. stopPolling() clears interval                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    SETTINGS PERSISTENCE                   │
│                                                           │
│  1. loadSettings() → read from localStorage               │
│  2. updateSettings(partial) → merge + save to localStorage│
│  3. Settings used as defaults for wizard                  │
└─────────────────────────────────────────────────────────┘
```

---

## Key Components

### StatusBadge

Displays job status with color coding for 10 states:
- `pending` → gray
- `processing` → blue
- `tts_done` → cyan
- `segmenting` → purple
- `llm_processing` → indigo
- `spec_ready` → teal
- `queued_render` → orange
- `rendering` → yellow
- `completed` → green
- `failed` → red

### ProgressSteps

Visual pipeline tracker showing current stage:
```
○ Pending → ○ Processing → ○ TTS → ○ Segmenting → ○ LLM → ✓ Spec Ready
```

### Modal

Accessible modal component:
- Escape key closes
- Backdrop click closes
- Focus trap inside modal
- Body scroll lock

### JsonViewer

Syntax-highlighted JSON display for spec.json preview.
