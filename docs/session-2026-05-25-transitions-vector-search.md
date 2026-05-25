# Session 2026-05-25: Transitions, Vector Search & Component Intelligence

**Date:** 2026-05-25
**Owner:** Technical Orchestrator
**Status:** Deployed

## Summary
Major improvements to AnimaFlow's component selection, transition system, audio segmentation, and LLM integration.

---

## 1. Infrastructure Fixes

### 1.1 Docker Network (UFW Bridge Blocking)
**Problem:** Containers couldn't reach internet (`Errno 101: Network is unreachable`)
**Root Cause:** UFW `deny (routed)` policy blocked Docker bridge traffic
**Fix:** Added `ufw-before-forward` ACCEPT rules for `br-*` interfaces
**Files:** VPS `/etc/ufw/before.rules`

### 1.2 Gemini Client Timeout
**Problem:** Instant timeouts on Gemini API calls
**Root Cause:** Invalid `http_options={'timeout': 120.0}` parameter in `genai.Client()`
**Fix:** Removed `http_options`, using default SDK timeout
**Files:** `backend/app/modules/llm/component_strategy.py`

### 1.3 Python Int Max Digits Limit
**Problem:** `Exceeds the limit (4300 digits) for integer string conversion`
**Root Cause:** Gemini SDK returns huge numbers; Python 3.11+ has 4300-digit safety limit
**Fix:** Added `sys.set_int_max_str_digits(0)` at app startup
**Files:** `backend/app/main.py`

---

## 2. Audio Segmentation Fixes

### 2.1 Audio Cutoff Prevention
**Problem:** Audio cuts off before text finishes speaking
**Root Cause:** 90% text match threshold + midpoint boundary calculation
**Fix:**
- Threshold: `0.9` → `0.98` (require near-full match)
- Buffer: `+0.4s` → `+0.8s` (generous margin after last word)
**Files:** `backend/app/modules/segmentation/timestamp_splitter.py`

---

## 3. LLM Integration Improvements

### 3.1 Detailed Response Logging
**Problem:** Hard to debug Gemini failures
**Fix:** Added logging for raw response text (first 2000 chars) and parsed result
**Files:** `backend/app/modules/llm/client.py`, `backend/app/modules/llm/component_strategy.py`

### 3.2 Background Type Validation
**Problem:** Gemini returns `"linear"`, `"radial"`, `"gradient"` but schema only accepted `"linear-gradient"`, `"radial-gradient"`
**Fix:** Added `field_validator` to normalize shorthand to full form
**Files:** `backend/app/schemas/spec.py`

### 3.3 Numeric Field Validators
**Problem:** Gemini returns absurd numbers (65,211-digit `lineWidth`)
**Fix:** Added `@model_validator(mode="before")` to clamp 21 numeric fields to ±10000
**Files:** `backend/app/schemas/spec.py`

### 3.4 Dynamic Subject Extraction
**Problem:** Hardcoded shape library didn't scale
**Fix:** Replaced with dynamic "PASO 1: Identifica el sujeto" + "PASO 2: Crea forma custom" instructions
**Files:** `backend/app/modules/llm/component_strategy.py`

---

## 4. Component Database & Vector Search

### 4.1 Components Table with Embeddings
**Created:** `components` table with:
- `id`, `name`, `slug`, `role`, `category`, `description`, `tags` (JSON), `tsx_path`, `props_schema` (JSONB), `embedding` (JSONB), `is_active`
- Indexes: name, slug, category, role, GIN on tags
**Files:** `backend/alembic/versions/c7d8e9f0a1b2_add_components_table_with_embeddings.py`, `backend/app/db/models.py`

### 4.2 Role & Category System
**Roles:** `background`, `text`, `transition`, `ui`, `dataviz`, `decorative`, `social`, `general`
**Categories:** Sub-classification within each role (e.g., background → kinetic, organic, particles, wave, gradient, grid, light)
**Files:** `backend/app/db/models.py`, `backend/scripts/seed_components.py`

### 4.3 Seed Script
**Created:** Script to populate 86 components with auto-inferred roles/categories and Gemini embeddings
**Usage:** `docker exec animaflow-api-1 python scripts/seed_components.py`
**Files:** `backend/scripts/seed_components.py`

### 4.4 Embedding Service
**Created:** Gemini-based embedding generation and cosine similarity search
**Model:** `gemini-embedding-001` (free tier)
**Files:** `backend/app/services/embedding.py`

### 4.5 Vector Search Activation
**Changed:** Pipeline now uses `get_relevant_components(db, text, media_query, top_k=10)` instead of hardcoded `AVAILABLE_COMPONENTS`
**Files:** `backend/app/modules/llm/component_strategy.py`, `backend/app/modules/pipeline/orchestrator.py`

### 4.6 Diversity-Aware Search
**Implemented:** Quota-based selection ensuring balanced mix:
- 2 Backgrounds, 2 Text, 2 Decorative, 1 Dataviz, 1 Social, 1 UI, 1 Transition
- Remaining slots filled with best general matches
**Files:** `backend/app/services/embedding.py`

### 4.7 Structured Prompt
**Changed:** Components sent to LLM grouped by role with emojis:
```
🎨 BACKGROUNDS: KineticBackground, FloatingBlobs
📝 TEXT: TextReveal, Typewriter
✨ DECORATIVE: RippleEffect, HeartBeat
```
**Files:** `backend/app/modules/llm/component_strategy.py`

---

## 5. Declarative Transitions

### 5.1 Schema
**Added:** `OutTransition` model with `type`, `duration_frames`, `target_scene`
**Added:** `out_transition` field to `AnimaComposerSpec`
**Types:** `ZoomBlurTransition`, `WipeTransition`, `LightLeakTransition`, `GlitchTransition`, `GradientOverlay`, `NONE`
**Files:** `backend/app/schemas/spec.py`

### 5.2 LLM Decision
**Added:** Prompt instructions for Gemini to decide transitions based on scene continuity
**Files:** `backend/app/modules/llm/component_strategy.py`

### 5.3 Remotion Integration
**Created:** `TransitionWrapper` component that dispatches to specific transition components
**Created:** `ZoomBlurTransition` (fully implemented), stubs for others
**Updated:** `MainComposition` to insert transitions between scenes
**Files:** `frontend/src/remotion/transitions/`, `frontend/src/remotion/MainComposition.tsx`

### 5.4 TypeScript Types
**Added:** `OutTransition` interface to `frontend/src/types/spec.ts`

---

## 6. Alembic Migration Chain Fix
**Problem:** Multiple head revisions due to incorrect `down_revision`
**Fix:** Updated `c7d8e9f0a1b2` to point to actual head `4def2g036362`
**Files:** `backend/alembic/versions/c7d8e9f0a1b2_add_components_table_with_embeddings.py`

---

## 7. Test Compatibility Fix
**Problem:** `ARRAY` type not supported in SQLite (used in tests)
**Fix:** Changed `tags` column from `ARRAY(String(100))` to `JSON`
**Files:** `backend/app/db/models.py`, migration file

---

## Deployment Commands

```bash
cd /opt/animaflow
git add -A
git commit -m "feat: transitions, vector search, diversity-aware components, audio fixes"
docker compose -f docker-compose.prod.yml up -d --build api frontend
docker exec animaflow-api-1 alembic upgrade head
docker exec animaflow-api-1 python scripts/seed_components.py
```

## Verification

```bash
# Check components in DB
docker exec animaflow-api-1 python -c "
from app.db.session import SessionLocal
from app.db.models import ComponentModel
db = SessionLocal()
print(f'Components: {db.query(ComponentModel).count()}')
db.close()
"

# Check logs for vector search
docker logs animaflow-api-1 2>&1 | grep "Vector search returned"
```
