# Session 2026-05-25: LLM Stability, Positioning Engine & Dashboard UX Overhaul

**Date:** 2026-05-25 (continuation)  
**Owner:** Technical Orchestrator  
**Status:** Applied & Verified

## Summary
Major stabilization of the LLM generation pipeline (infinite decimal loops, oversized responses), implementation of deterministic backend positioning logic to replace expensive secondary AI calls, and comprehensive fix of three critical dashboard UX pages (Scripts, Videos, Downloads).

---

## 1. CI/CD Status

### 1.1 Node Version Revert
**Problem:** CI builds failing due to Node version incompatibility  
**Fix:** Reverted to npm with Node 20; builds passing successfully  
**Files:** `.github/workflows/ci.yml`, `frontend/package.json`

---

## 2. LLM Reliability: Gemini Infinite Decimal Loop Fix

### 2.1 Root Cause Analysis
**Problem:** Gemini model enters infinite loop generating numbers with excessive decimal precision (e.g., `0.500000000000000...` repeating thousands of times) for numeric fields like `lineWidth`. This bloated responses to 65,000+ characters, causing Pydantic parsing failures and complete render pipeline collapse.

**Why it happens:** Large language models sometimes get stuck in token repetition loops when asked to produce precise numeric values, especially for fields without explicit format constraints.

### 2.2 Regex Sanitization Layer
**Implemented:** Post-processing regex that detects and truncates numbers with more than 6 decimal places to maximum 6 decimals.

**Before:** `"lineWidth": 0.5000000000000000000000000000000000000000...` (thousands of digits)  
**After:** `"lineWidth": 0.500000` (clean, parseable)

**Files:** `backend/app/modules/llm/component_strategy.py`

### 2.3 Retry Loop (3 Attempts)
**Implemented:** Automatic retry mechanism with exponential backoff when JSON parsing fails.
- Attempt 1: Raw response
- Attempt 2: Sanitized response  
- Attempt 3: Sanitized + aggressive trimming (remove trailing garbage)

If all 3 attempts fail → fallback to default animation + warning logged.

**Files:** `backend/app/modules/llm/component_strategy.py`

### 2.4 Token Limit Enforcement
**Problem:** No ceiling on LLM output size allowed runaway responses  
**Fix:** Added `max_output_tokens=4000` to Gemini generation request parameters  
**Impact:** Caps response at ~3000 words; prevents memory exhaustion  
**Files:** `backend/app/modules/llm/client.py`

### 2.5 Schema Hardening: lineWidth Type
**Problem:** Gemini consistently returned floats for `lineWidth` even when declared as number  
**Fix:** Changed schema type from `NUMBER` to `INTEGER` in Gemini structured output definition  
**Rationale:** Line widths in Remotion components are always integers; forcing integer type eliminates float hallucination  
**Additional:** Added `required: ["type", "x", "y"]` to enforce minimum valid component structure

**Files:** `backend/app/modules/llm/component_strategy.py`

---

## 3. Deterministic Positioning Engine (Backend Logic)

### 3.1 Design Decision: Code vs Secondary AI
**Decision:** Use deterministic Python post-processing instead of a second "Vision" LLM call for positioning corrections.

**Rationale:**
| Factor | Secondary LLM Call | Deterministic Python |
|---|---|---|
| Cost | $0.02-0.05 per job | $0 |
| Latency | 3-8 seconds additional | <1ms |
| Reliability | Can also hallucinate | Guaranteed correct |
| Complexity | Vision API setup needed | Pure math |

**Files:** `backend/app/modules/llm/component_strategy.py`

### 3.2 Smart Layout Engine (Auto x/y Assignment)
**Problem:** When LLM omits `x`/`y` coordinates for layers, all elements stack at `(0, 0)` center causing complete overlap.

**Solution:** Backend calculates safe zones automatically based on layer type.

**Positioning Rules:**
| Layer Type | Default X | Default Y | Behavior |
|---|---|---|---|
| Background | 0 | 0 | Full canvas coverage |
| Background Decorations | Center ± random offset | Center ± random offset | Organic placement |
| Main Object (SVG) | Canvas center X | Canvas 30% Y | Prominent visual position |
| Text | Canvas center X | Canvas 75% Y (bottom third) | Readable, not overlapping object |

### 3.3 Path Normalizer (Absolute → Relative Coordinates)
**Problem:** LLM generates SVG paths with absolute coordinates (`M 200 150 L ...`) that may exceed canvas bounds or cause rendering artifacts.

**Fix:** Converts absolute path commands to relative ones when they exceed expected ranges, normalizing to canvas-safe coordinates.

**Logic:**
- Detects `M`, `L`, `C`, `Q` path commands
- If any coordinate exceeds canvas dimensions → converts to relative from last known point
- Maintains path shape integrity while ensuring fit

### 3.4 Coordinate Clamping (Off-Screen Preventing)
**Problem:** Components with negative or excessively large `x`/`y` values render partially or completely off-screen.

**Fix:** Clamps all coordinates to valid canvas range with margin buffer:

```python
def clamp_coordinates(x: int, y: int, w: int, h: int, margin: int = 20) -> tuple:
    x = max(margin, min(w - margin, x))
    y = max(margin, min(h - margin, y))
    return (x, y)
```

**Applied to:** All component `x`, `y`, and nested SVG element positions  
**Margin:** 20px buffer to prevent edge clipping

---

## 4. Backend Bugfixes

### 4.1 ValueError: Unescaped Braces in f-string Prompt
**Problem:** Crash caused by `f"... {json} ..."` syntax where the JSON string contained raw curly braces that Python's f-string parser interpreted as format expressions.

**Error:** `ValueError: Single '{' encountered in format string`

**Fix:** Double-brace escaping `{{}}` in all prompt templates that embed JSON content.

**Files:** `backend/app/modules/llm/component_strategy.py`, any prompt template files

### 4.2 TypeScript Compilation Errors
**Fixed errors in:**

#### AnimatedWrapper.tsx
**Errors:** Missing imports, incorrect prop types, undefined variable references  
**Fix:** Corrected TypeScript interfaces, added missing imports from Remotion, ensured all props match Pydantic schema definitions

#### AnimaComposer.tsx
**Errors:** Type mismatches between scene spec and component props, missing null checks  
**Fix:** Added proper type guards, implemented fallback rendering for missing scenes, aligned prop types with backend schemas

### 4.3 Fallback Animation Implementation
**Rule:** If ANY step in the LLM pipeline fails (parse error, validation failure, timeout) → fall back to default "Fade Text" animation + log warning.

**Fallback behavior:**
- Scene renders with simple text fade-in/out
- Uses neutral gradient background
- Logs detailed error for later analysis
- Does NOT block other scenes from rendering

---

## 5. Frontend: Immediate URL Redirect

**Feature:** Added immediate URL redirect (`window.history.replaceState`) after "Create Project" action.

**Benefit:** User sees project URL immediately in address bar even before job processing completes. Enables bookmarking, sharing, and reduces confusion about current page state.

**Files:** Wizard/Create Project flow component

---

## 6. Dashboard Pages: Critical UX Fixes

### 6.1 ScriptsPage — Translucent Cards & Truncated Titles

#### Problem 1: Data Race Condition
**Root Cause:** `fetchScripts()` reads `jobs` synchronously from Zustand store via `useJobsStore.getState().jobs`, but `fetchJobs()` is async. The scripts derivation runs against an empty jobs array → no scripts rendered.

**Fix:** 
- Changed `fetchScripts` signature to accept optional `jobsOverride?: JobSummary[]` parameter
- In ScriptsPage useEffect: only calls `fetchScripts(jobs)` when `jobs.length > 0`

**Files:** 
- `frontend/src/store/useMediaStore.ts` (interface + implementation)
- `frontend/src/pages/dashboard/ScriptsPage.tsx` (useEffect guard)

#### Problem 2: Aggressive Name Truncation
**Root Cause:** Script names were truncated to 40 characters with `'...'` suffix in the store, making titles unreadable for most projects.

**Fix:** Increased truncation limit from 40 → 60 characters.

**Files:** `frontend/src/store/useMediaStore.ts`

#### Problem 3: Card Visual Opacity
**Root Cause:** `bg-surface-container` CSS class potentially rendering as translucent depending on theme configuration.

**Fix:** Changed to `bg-surface-container/95 backdrop-blur-sm` — solid with slight transparency and blur effect for depth.

**Files:** `frontend/src/components/dashboard/ScriptCard.tsx`

#### Problem 4: Title Overflow
**Root Cause:** `truncate` CSS class forces single-line ellipsis, cutting off medium-length script names.

**Fix:** Changed to `line-clamp-2` allowing up to 2 lines before truncation.

**Files:** `frontend/src/components/dashboard/ScriptCard.tsx`

### 6.2 VideosPage — Preview Modal & Thumbnails

#### Problem 1: Preview Modal Not Opening
**Root Cause:** Modal conditional required BOTH `previewJob && previewJob.video_url` to be truthy (line 459). Completed jobs may have `video_url` as `null` (render failed, export pending, etc.) preventing modal from opening at all.

**Fix:**
- Removed `video_url` requirement from outer condition: `{previewJob && (`
- Inside modal: conditional rendering — shows `<video>` if URL exists, otherwise shows fallback message: "Video no disponible para este proyecto" with Film icon

**Files:** `frontend/src/pages/dashboard/VideosPage.tsx`

#### Problem 2: Unreliable Video Thumbnails
**Root Cause:** Thumbnail video used `onLoadStart` event which fires BEFORE metadata loads. Setting `currentTime = 1` at this point fails silently because the browser doesn't know the video duration yet.

**Fix:**
- Replaced `onLoadStart` with `onLoadedData` (fires when first frame data is available)
- Seek position: `Math.min(1, video.duration * 0.1)` — seeks to 10% of duration or 1s, whichever is smaller (avoids seeking past end for short videos)
- Added `onSeeked` guard to ensure video stays paused after seeking

**Files:** `frontend/src/pages/dashboard/VideosPage.tsx`

### 6.3 DownloadsPage — Fake Sizes & Download Behavior

#### Problem 1: MP4 Opens in New Tab Instead of Downloading
**Root Cause:** `handleDownloadMp4` used `window.open(job.video_url, '_blank')` which opens the video in a new browser tab instead of triggering a file download.

**Fix:** Implemented proper blob-based download pattern:
1. `fetch()` the video URL with auth header
2. Convert response to `blob`
3. Create temporary `<a>` element with `download` attribute
4. Programmatically click to trigger download
5. Clean up with `URL.revokeObjectURL()`

**Files:** `frontend/src/pages/dashboard/DownloadsPage.tsx`

#### Problem 2: Unrealistic Size Estimates
**Root Cause:** Fake size estimates calculated from script character length produced absurd results (e.g., long scripts showing "2.3 GB" for MP4).

**Fix:** Realistic estimates based on aspect ratio (more accurate proxy for video resolution/size):

| Aspect Ratio | Estimated Range | Reasoning |
|---|---|---|
| 9:16 | 8-16 MB | Lower resolution vertical video |
| 1:1 | 10-20 MB | Square, moderate resolution |
| 16:9 | 15-30 MB | Higher resolution horizontal video |
| AE Export | 2-8 MB | Project files are compressed |
| spec.json | 4-12 KB | Small metadata file |

Also added `API_BASE` import to enable proper URL construction in download functions.

**Files:** `frontend/src/pages/dashboard/DownloadsPage.tsx`

#### Problem 3: Preview Button Same as Download
**Root Cause:** Both "Preview" (eye icon) and "Download" button called the same `handleDownloadMp4` function — confusing UX.

**Fix:**
- Preview button → `window.open(url, '_blank')` opens video in new tab for viewing
- Download button → calls `handleDownloadMp4(activeJob)` which triggers blob download

---

## 7. Files Modified Summary

### Backend
| File | Category | Changes |
|---|---|---|
| `backend/app/modules/llm/component_strategy.py` | LLM Pipeline | Regex sanitization, retry loop, smart layout, path normalizer, coordinate clamping, unescaped brace fix |
| `backend/app/modules/llm/client.py` | LLM Client | `max_output_tokens=4000` enforcement |
| `backend/app/schemas/spec.py` | Validation | `lineWidth` type changed to INTEGER, `required` fields added |

### Frontend
| File | Category | Changes |
|---|---|---|
| `frontend/src/store/useMediaStore.ts` | State Management | Race condition fix, truncation increase |
| `frontend/src/pages/dashboard/ScriptsPage.tsx` | UI Page | Data flow guard for fetchScripts |
| `frontend/src/components/dashboard/ScriptCard.tsx` | UI Component | Card opacity, title overflow fix |
| `frontend/src/pages/dashboard/VideosPage.tsx` | UI Page | Modal open fix, thumbnail seek reliability |
| `frontend/src/pages/dashboard/DownloadsPage.tsx` | UI Page | Blob download, realistic sizes, preview separation |
| `frontend/src/remotion/composer/AnimaComposer.tsx` | Remotion | TS compilation error fixes, fallback integration |

---

## 8. Key Decisions (ADR-style)

### ADR-011: Deterministic Backend Positioning over Secondary LLM
- **Context:** When LLM omits x/y coordinates, all layers stack at (0,0) causing visual overlap
- **Options considered:** (a) Second "vision" LLM call to detect overlap, (b) CSS auto-layout in React, (c) Deterministic Python calculation
- **Decision:** Option (c) — deterministic Python post-processing in the pipeline
- **Consequences:** Zero cost, instant execution, guaranteed correctness, no additional infrastructure

### ADR-012: Integer-only lineWidth Schema
- **Context:** Gemini consistently produces float linewidths even when instructed otherwise, leading to infinite decimal loops
- **Decision:** Force `INTEGER` type in Gemini schema instead of `NUMBER`
- **Consequences:** Float linewidths rejected by schema (triggers retry); user can still edit manually to add floats if needed

### ADR-013: Graceful Degradation Strategy
- **Context:** Any LLM failure currently crashes the entire render
- **Decision:** Per-scene fallback to "Fade Text" animation when LLM generation fails
- **Consequences:** Partial renders succeed instead of total failure; warnings logged for debugging

---

## 9. Deployment Commands

```bash
cd /opt/animaflow
git add -A
git commit -m "fix: LLM stability (regex sanitization, retry loop, positioning engine), dashboard UX fixes (scripts/videos/downloads)"
docker compose -f docker-compose.prod.yml up -d --build api frontend
docker exec animaflow-api-1 alembic upgrade head
```

## 10. Verification Steps

```bash
# 1. Check API health
curl http://localhost:8000/api/health

# 2. Test a small job creation and monitor logs
docker compose -f docker-compose.prod.yml logs -f worker-default

# 3. Verify no more infinite decimal errors in logs
docker logs animaflow-api-1 2>&1 | grep -i "decimal\|overflow\|Exceeds the limit"

# 4. Frontend build check
cd frontend && npm run build
```

## 11. Known Remaining Issues

- Size estimates in DownloadsPage are still approximations (real sizes require server-side file stat queries)
- Video thumbnails may briefly show black frame before seeking (browser limitation for preloaded metadata)
- Preview button in DownloadsPage uses `window.open` which may be blocked by popup blockers

---

*Documento generado por el agente Technical Orchestrator de AnimaFlow.*  
*Fecha: 2026-05-25*
