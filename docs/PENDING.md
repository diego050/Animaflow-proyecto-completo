# AnimaFlow — Pending Work

**Last Updated:** 1 Junio 2026
**Status:** MVP mostly complete. Below items are deferred to post-MVP or future versions.

---

## 🟡 HIGH — Should be done before scaling (3-5 days total)

### 1. Implement Gemini TTS Real (Google AI Studio)
**Effort:** 0.5 days
**Context:** Google AI Studio now offers Gemini TTS. The old stub was removed. Need to implement the real API.
**Files to create:** `backend/app/modules/tts/providers/gemini_tts.py` (new implementation)
**Files to update:** `backend/app/modules/tts/service.py`, `backend/app/schemas/job.py`, `frontend/src/types/job.ts`
**Priority:** Medium-High — gives users another TTS option

### 2. Implement OpenAI LLM Client
**Effort:** 1-2 days
**Context:** All infrastructure exists (API key storage, credential resolver, model fetcher). Missing: the actual `_call_openai()` function and dispatch logic.
**Files to modify:** `backend/app/modules/llm/client.py`, `backend/app/modules/llm/resolver.py`
**Priority:** Medium — gives users choice between Gemini and GPT-4o for animation generation

### 3. Implement Anthropic LLM Client
**Effort:** 1-2 days
**Context:** Same as OpenAI — infrastructure exists, client doesn't.
**Files to modify:** `backend/app/modules/llm/client.py`, `backend/app/modules/llm/resolver.py`
**Priority:** Medium — alternative LLM option for users

### 4. Split Large Files
**Effort:** 2-3 days
**Files to split:**
- `backend/app/api/admin.py` (715 lines) → `admin_stats.py`, `admin_users.py`, `admin_jobs.py`, `admin_settings.py`
- `backend/app/modules/llm/component_strategy.py` (628 lines) → extract prompts to `prompts.py`, layout to `layout.py`
- `backend/app/modules/parsers/tsx/components.py` (683 lines) → use registry pattern
- `backend/app/modules/anima_composer/ae_transformer.py` (551 lines) → extract layer generators
- `backend/app/api/jobs_pipeline.py` (411 lines) → extract scene editing
**Priority:** Low for MVP, High for maintainability

---

## 🟢 MEDIUM — Improvements (1-2 days total)

### 5. Extract Shared Constants
**Effort:** 0.5 days
**What:** `ASPECT_RATIOS` dictionary is duplicated in 7+ files. Extract to `app/core/constants.py`.
**Priority:** Low — maintenance burden but doesn't block functionality

### 6. Extract LLM Retry Logic
**Effort:** 0.5 days
**What:** Same retry pattern (exponential backoff for 429/500/503) is copy-pasted in 3 files. Extract to shared decorator.
**Priority:** Low — consistency improvement

### 7. Add Graceful Shutdown to Scheduler
**Effort:** 0.5 days
**What:** Add `shutdown()` method to Scheduler class. Call from FastAPI shutdown event.
**Files:** `backend/app/core/scheduler.py`, `backend/app/main.py`
**Priority:** Low — edge case for production deployments

### 8. Add TTS Provider Unit Tests
**Effort:** 2 hours
**What:** Mock `httpx.AsyncClient` for ElevenLabs, Google TTS, OpenAI TTS. Test error handling (401, 429, 500).
**Priority:** Low — reliability improvement

### 9. Standardize Error Response Format
**Effort:** 0.5 days
**What:** Create `ErrorResponse` model (already started in `error_codes.py`). Apply consistently across all endpoints.
**Priority:** Low — frontend DX improvement

### 10. Add `completed_at` to Admin Dashboard
**Effort:** 0.5 days
**Context:** Column exists (added today). Now use it to calculate avg render time in admin stats.
**Files:** `backend/app/api/admin.py`
**Priority:** Low — metrics improvement

---

## 🔵 LOW — Nice to Have (defer indefinitely)

### 11. Groq as LLM Provider
**Effort:** 1 day
**Context:** Currently only used for Whisper timestamps. Could add chat completion support.
**Priority:** Low — Gemini works well enough

### 12. Async LLM Client Activation
**Effort:** 0.5 days
**Context:** `_call_gemini_with_retry()` async version exists but is unused. Sync version works fine in RQ worker.
**Priority:** Low — no current benefit

### 13. Lambda Render Mode
**Effort:** 2-3 days
**Context:** `render_adapter.py` has `mode="lambda"` option but raises `NotImplementedError`. Planned for future AWS deployment.
**Priority:** Low — future infrastructure decision

### 14. Webhook/Callback System
**Effort:** 1-2 days
**Context:** Frontend currently polls via SSE. Webhooks would enable external integrations.
**Priority:** Low — not needed for MVP

### 15. Job Priority Queue
**Effort:** 1 day
**Context:** Scheduler picks jobs FIFO. No way to prioritize paid users.
**Priority:** Low — not needed until monetization

### 16. Usage Quotas Per User
**Effort:** 1 day
**Context:** `AdminSettings.max_jobs_per_user` exists but is never enforced.
**Priority:** Low — not needed until scale

### 17. Circuit Breaker for External Services
**Effort:** 1 day
**Context:** TTS, LLM, Render server have retry logic but no circuit breaker.
**Priority:** Low — not needed until scale

### 18. Migrate FastAPI `@app.on_event` to Lifespan
**Effort:** 0.5 days
**Context:** `@app.on_event("startup")` is deprecated. Use `@asynccontextmanager` lifespan pattern.
**Files:** `backend/app/main.py`
**Priority:** Low — cosmetic, works fine as-is

### 19. Consolidate Session Documentation
**Effort:** 1 day
**Context:** 30+ session files in `docs/sessions/`. Consolidate into weekly summaries.
**Priority:** Low — organizational

### 20. Update Architecture Documentation
**Effort:** 1 day
**Context:** `docs/architecture/` may be outdated. Regenerate from OpenAPI spec and current models.
**Priority:** Low — documentation hygiene

### 21. Create ADR Directory
**Effort:** 0.5 days
**Context:** AGENTS.md mentions "Living Documentation" but no `docs/adr/` exists.
**Priority:** Low — documentation hygiene

### 22. Job Pagination
**Effort:** 0.5 days
**Context:** Already implemented in `jobs_crud.py` with `page`/`per_page` params. Verify frontend uses it.
**Priority:** Low — already done, just needs frontend integration

---

## ✅ DONE — Recently Completed

| Item | Date |
|------|------|
| Pipeline race conditions fix | 1 Jun 2026 |
| Event loop management fix | 1 Jun 2026 |
| Scheduler error handling (failed status) | 1 Jun 2026 |
| asyncpg connection leak fix | 1 Jun 2026 |
| Token blacklist cleanup | 1 Jun 2026 |
| `completed_at` column + migration | 1 Jun 2026 |
| TTS error codes system | 1 Jun 2026 |
| Log rotation (10MB limit) | 1 Jun 2026 |
| `aspect_ratio` validation (ratio + pixels) | 1 Jun 2026 |
| SSE DB session leak fix | 1 Jun 2026 |
| bcrypt 72-byte limit fix | 1 Jun 2026 |
| Dead code removal (544 lines, 5 files) | 1 Jun 2026 |
| Pipeline status bug (completed → queued_render) | 1 Jun 2026 |
| Voicebox removal | 1 Jun 2026 |
| Gemini TTS stub removal | 1 Jun 2026 |
| OpenAI TTS export fix | 1 Jun 2026 |
| 42/42 tests passing | 1 Jun 2026 |

---

## 📊 Health Score

| Area | Score | Notes |
|------|:---:|-------|
| Core Pipeline | 9/10 | Functional, idempotent, well-tested |
| Auth & Security | 9/10 | JWT, blacklist, encryption, rate limiting |
| TTS Providers | 8/10 | 4 working providers, Gemini TTS pending |
| LLM Providers | 7/10 | Only Gemini works; OpenAI/Anthropic pending |
| Code Quality | 8/10 | Dead code removed; large files remain |
| Testing | 8/10 | 42 tests passing; TTS provider tests pending |
| Documentation | 7/10 | Session docs excessive; ADRs missing |
| **Overall** | **8/10** | **MVP ready** |
