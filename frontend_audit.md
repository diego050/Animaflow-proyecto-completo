# AnimaFlow — Frontend Audit

**Fecha:** 2026-05-18  
**Score: 7.5/10**

---

## 📊 Inventario

| Categoría | Cantidad | Detalle |
|:----------|:--------:|:--------|
| Pages (dashboard) | 10 | Projects, Detail, Wizard, Voices, Scripts, Videos, Images, Downloads, Settings, ComingSoon |
| Pages (admin) | 5 | Dashboard, Users, Jobs, System, Settings |
| Pages (public) | 5 | Landing, Login, ForgotPassword, Privacy, Terms |
| Components | 19 | 8 auth, 8 dashboard, 2 layout, 1 scene editor |
| Stores (Zustand) | 3 | Auth (173 ln), Dashboard (540 ln), Admin (181 ln) |
| Types | 4 | auth.ts, job.ts, admin.ts, spec.ts |
| API client | 1 | client.ts (93 ln) — `apiFetch`, `apiUpload`, `api.*` |

---

## ✅ Lo Que Está Bien

### 1. Arquitectura de routing — Limpia
```
/ (public) → /dashboard (ProtectedRoute) → /admin (AdminProtectedRoute by role)
```
Tres niveles de acceso bien separados. `AdminProtectedRoute` verifica `user.role === 'admin'`.

### 2. API Client — Bien diseñado
- Tipado genérico (`apiFetch<T>`)
- Auto-logout en 401
- Soporte para upload multipart
- Convenience methods (`api.get`, `api.post`, etc.)
- URL base configurable via env

### 3. TypeScript types — Mirror backend 1:1
- `auth.ts` documenta matching con Pydantic schemas
- `job.ts` tiene type guards (`isProcessingStatus()`, `isTerminalStatus()`) — excelente
- `BackendVoice` → `Voice` mapper function para snake_case → camelCase

### 4. Admin ya estructurado
El admin panel ya tiene:
- Dashboard con stats cards + system health indicators
- User management (list, toggle, role change, delete)
- Job management (list, retry, cancel, delete)
- System health page
- Settings page

### 5. Polling mechanism — Correcto
El `startPolling/stopPolling` limpia el interval correctamente y para al detectar status terminal.

---

## 🔴 Problemas Encontrados

### 1. ❌ Admin API backend **NO EXISTE**
**Esto es lo más importante.** El frontend tiene:
- `useAdminStore.ts` llamando a `/api/admin/stats`, `/api/admin/users`, `/api/admin/jobs`, `/api/admin/system/health`, `/api/admin/settings`
- 5 páginas admin completas

Pero en el backend **no hay ningún router admin**:
```
grep "admin" backend/app/api/*.py → No results found
```

**Todo el panel admin va a devolver 404.** Necesitas crear `backend/app/api/admin.py` con los endpoints que el frontend ya consume.

### 2. 🔴 God Components — 3 archivos enormes

| Archivo | Líneas | Problema |
|:--------|-------:|:---------|
| `ProjectDetail.tsx` | **1,178** | Un solo componente manejando preview, scene editor, timeline, export, render |
| `SettingsPage.tsx` | **1,075** | Un solo componente con API keys, LLM settings, profile, theme |
| `NewProjectWizard.tsx` | **923** | Un solo componente con 4+ steps inline |

Esto es el mismo patrón que tenías en el backend con `pipeline.py` (1,839 líneas).

**Recomendación para `ProjectDetail.tsx`:**
```
pages/dashboard/ProjectDetail.tsx (1,178 → ~200 lines as orchestrator)
├── components/project/SceneTimeline.tsx      (~250 lines)
├── components/project/ExportPanel.tsx        (~150 lines)  
├── components/project/RenderControls.tsx     (~100 lines)
├── components/project/SceneEditorDialog.tsx  (~200 lines)
└── components/project/ProjectHeader.tsx      (~80 lines)
```

### 3. 🟡 `useDashboardStore.ts` — 540 líneas, demasiadas responsabilidades

Este store maneja:
- Jobs CRUD
- Wizard state
- Polling
- Voices CRUD
- Scripts CRUD
- Settings
- Downloads

**Es como el `pipeline.py` del frontend.** Recomendación:
```
store/
├── useJobsStore.ts       (~150 lines) — CRUD + polling + render/export
├── useWizardStore.ts     (~80 lines)  — Wizard step/data management
├── useVoicesStore.ts     (~80 lines)  — Voice CRUD
├── useMediaStore.ts      (~60 lines)  — Scripts + Downloads
├── useSettingsStore.ts   (~40 lines)  — User preferences
├── useAuthStore.ts       (keep as is)
└── useAdminStore.ts      (keep as is)
```

---

## 🟡 Observaciones Menores

### 4. `console.error` en lugar de user-facing errors
En `useDashboardStore.ts:210` y `:404`:
```typescript
console.error(message);
```
Los errores se tragan silenciosamente. El usuario no ve nada. Deberían setear un `error` state que se muestre en la UI como toast/notification.

### 5. `DashboardPage.tsx` — Archivo huérfano
`pages/DashboardPage.tsx` (33 líneas) existe pero **no se usa en ninguna ruta**. `App.tsx` usa `ProjectsList` como index del dashboard. Se puede eliminar.

### 6. Archivos generados en `remotion/generated/`
Hay 8 archivos `Scene_*.tsx` generados por el pipeline que probablemente no deberían estar en git. Considerar agregar a `.gitignore`:
```gitignore
src/remotion/generated/
```

### 7. Role mismatch: `admin` vs backend roles
El backend `User.role` acepta `founder | agency | pilot`.
El frontend `User.role` acepta `founder | agency | pilot | admin`.
El `AdminProtectedRoute` verifica `role === 'admin'`, pero ese rol no existe en el backend model.

---

## 📋 Prioridades

| # | Tarea | Impacto | Esfuerzo |
|:-:|:------|:-------:|:--------:|
| 1 | **Crear `backend/app/api/admin.py`** | 🔴 Bloqueante | ~4h |
| 2 | **Resolver role mismatch** (`admin` role en backend) | 🔴 Bloqueante | ~30min |
| 3 | Descomponer `ProjectDetail.tsx` (1,178 ln) | 🟡 Calidad | ~2h |
| 4 | Descomponer `SettingsPage.tsx` (1,075 ln) | 🟡 Calidad | ~1.5h |
| 5 | Dividir `useDashboardStore.ts` (540 ln) | 🟡 Calidad | ~2h |
| 6 | Error handling visible al usuario (toasts) | 🟡 UX | ~1h |
| 7 | Eliminar `DashboardPage.tsx` huérfano | 🟢 Cleanup | ~5min |
| 8 | `.gitignore` remotion/generated/ | 🟢 Cleanup | ~5min |
