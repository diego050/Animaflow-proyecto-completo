# Sprint 3-4 Report: Voices, Scripts, Downloads + Settings & Profile

> **Fecha:** Mayo 2026 | **Status:** ✅ Completado

---

## Goals

1. Build voice management UI (Sprint 3)
2. Create script library from completed jobs (Sprint 3)
3. Implement download/export history page (Sprint 3)
4. Build settings page with profile, preferences, API keys, billing (Sprint 4)
5. Create accessible modal component (Sprint 3)
6. Implement localStorage-based settings persistence (Sprint 4)

---

## What Was Completed

### Sprint 3: Voices, Scripts, Downloads

- **VoicesPage:** Voice management interface
  - Initially used mock data (later connected to real API in Sprint 6)
  - VoiceCard component for each voice
  - Create, edit, delete, preview actions
- **ScriptsPage:** Reusable script library
  - Derived from completed jobs
  - ScriptCard component with copy/edit actions
  - Filter by source job
- **DownloadsPage:** Export history
  - Grouped by project
  - Download buttons for MP4, AE zip, spec.json
  - JsonViewer component for spec preview
- **Modal component:** Accessible modal
  - Escape key closes
  - Backdrop click closes
  - Focus trap inside modal
  - Body scroll lock

### Sprint 4: Settings & Profile

- **SettingsPage** with 4 tabs:
  - **Perfil:** Name, email, password change
  - **Preferencias:** Default aspect ratio, voice, language, theme
  - **API Keys:** Placeholder (future)
  - **Facturación:** Placeholder (future)
- **Profile form** with password change validation
- **Preferences** with localStorage persistence
- **Default settings:**
  - Aspect ratio: 9:16
  - Voice: kokoro-es
  - Language: es
  - Theme: dark

---

## Files Created/Modified

### Frontend

| File | Action | Description |
|---|---|---|
| `frontend/src/pages/VoicesPage.tsx` | Created | Voice management page |
| `frontend/src/pages/ScriptsPage.tsx` | Created | Script library page |
| `frontend/src/pages/DownloadsPage.tsx` | Created | Export history page |
| `frontend/src/pages/SettingsPage.tsx` | Created | Settings with 4 tabs |
| `frontend/src/components/Modal.tsx` | Created | Accessible modal component |
| `frontend/src/components/VoiceCard.tsx` | Created | Voice display card |
| `frontend/src/components/ScriptCard.tsx` | Created | Script display card |
| `frontend/src/components/JsonViewer.tsx` | Created | JSON syntax viewer |
| `frontend/src/store/useDashboardStore.ts` | Modified | Added voices, scripts, settings state |
| `frontend/src/types/job.ts` | Modified | Added Voice, Script, UserSettings types |

---

## Key Decisions

| Decision | Rationale |
|---|---|
| Mock data for voices (Sprint 3) | Backend voice endpoints not yet built; UI first approach |
| Scripts derived from jobs | No separate script model needed; reuse existing data |
| localStorage for settings | Simple, no backend needed, survives page refresh |
| Tab-based settings | Groups related settings, avoids long scroll page |
| Placeholder tabs (API Keys, Billing) | No payments before Sprint 5 per AGENTS.md rules |
| Accessible modal | WCAG compliance from the start, reusable pattern |

---

## Issues Encountered

| Issue | Resolution |
|---|---|
| Mock data vs real API | Used mock data in Sprint 3, replaced with real API in Sprint 6 |
| Settings type mismatch | Created `UserSettings` type that combines auth + preference fields |
| Modal focus trap | Implemented with `useRef` and `useEffect` for keyboard navigation |
| Script derivation logic | Filtered jobs by `completed`/`completed_video` status |

---

## Metrics

- **Pages created:** 4
- **Components created:** 4
- **Store additions:** 20+ new state fields and actions
- **Lines of code:** ~1,800 (frontend)
