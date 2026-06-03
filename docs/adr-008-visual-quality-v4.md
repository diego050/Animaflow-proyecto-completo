# ADR-008: Visual Quality Pipeline v4 — LLM Sanitization + Text Auto-Fitting + Post-Validation

**Date:** 2026-06-02
**Status:** Accepted
**Supersedes:** ADR-007 (v3 Data Transport Fixes)

---

## Context

After v3 (which fixed data transport via Pydantic `extra="allow"`, alias removal, and color propagation), production videos still exhibited unacceptable visual quality. Root cause analysis identified **8 distinct issues** operating at two levels:

### Level 1: LLM Output Structural Errors
1. **Wrong key:** LLM outputs `items` instead of `children`
2. **Type conflicts:** `type: "text"` with `animation: "fade"` — incompatible combinations
3. **Duplicate keys:** Multiple children with same `id` in a scene
4. **String numbers:** `"fontSize": "48"` instead of `"fontSize": 48`
5. **Garbage props:** LLM invents non-existent properties (`shadowColor`, `glow`, etc.)

### Level 2: Frontend Component Defense Gaps
6. **Width desync:** `AnimaText` width doesn't match parent container
7. **No prop filtering:** Components accept all props, including invalid ones
8. **Text overflow:** Long text exceeds container bounds with no auto-fit

These issues originate from the LLM's non-deterministic output and the frontend's lack of defensive validation. Neither the model nor the prompt alone can guarantee correct output.

## Decision

Implement a **5-phase quality pipeline** that intercepts, corrects, and validates spec data at multiple points in the rendering flow:

### Phase 1: LLM Output Sanitization
Backend sanitization layer that normalizes LLM output before it reaches the spec builder:
- Rename `items` → `children`
- Resolve type/animation conflicts (e.g., `text` + `fade` → `text` + `typewriter`)
- Deduplicate children by `id` (keep first occurrence)
- Coerce string numbers to actual numbers (`"48"` → `48`)
- Strip garbage properties not in the allowed schema

### Phase 2: Text Auto-Fitting
Two-layer approach to prevent text overflow:
- **Backend pre-fit:** Estimate character count per line based on container width and font size during spec generation
- **Frontend fitText utility:** Binary search algorithm that adjusts `fontSize` until text fits within `maxWidth` with a 10px safety margin

### Phase 3: Component Hardening
Defensive programming at the component level:
- **Width sync:** `AnimaText` reads parent width and constrains itself
- **sanitizeProps whitelist:** Filter incoming props to only allowed keys before rendering
- **AnimaText maxWidth:** Enforce `maxWidth` prop on all text primitives

### Phase 4: Post-Validation Engine
A dedicated `spec_validator.py` module that runs 8 validation checks after spec assembly:
1. Required fields present (`id`, `type`, `duration`)
2. Duration is positive number
3. Children array exists (even if empty)
4. No duplicate child IDs
5. Animation type is valid for the component type
6. Numeric fields are actually numbers
7. Color values are valid hex/rgb strings
8. Text content is non-empty for text-type components

Each check includes an auto-fix fallback where possible. Invalid scenes are logged and flagged rather than silently dropped.

### Phase 5: Prompt Refinement (Deferred)
Prompt improvements to reduce error rate at the source. **Deferred** because Phase 1-4 post-processing already handles all known error classes. Prompt refinement will be revisited after measuring error rates in production.

## Consequences

### Positive
- All 8 root causes addressed without changing the LLM model
- Zero additional latency (sanitization runs inline during spec assembly)
- No breaking changes to existing spec.json schema
- Validation is observable — all fixes are logged for monitoring
- Frontend utilities are reusable across components

### Negative
- Additional processing overhead (~50ms per scene for sanitization + validation)
- Increased codebase complexity (4 new files, 5 modified files)
- Whitelist approach requires maintenance as schema evolves

### Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Over-sanitization removes valid props | Low | Medium | Whitelist is derived from Pydantic schema; reviewed per release |
| fitText binary search is too slow | Low | Low | Max 20 iterations; typically converges in 8-12 |
| Validator auto-fix masks real bugs | Medium | Low | All auto-fixes are logged with WARN level; alerting on high rate |

## Files Changed

### Created
| File | Purpose |
|---|---|
| `backend/app/modules/llm/spec_validator.py` | Post-validation engine with 8 checks + auto-fix |
| `backend/tests/test_spec_validator.py` | Unit tests for spec validator (13 tests) |
| `frontend/src/remotion/utils/fitText.ts` | Binary search text auto-fit utility |
| `frontend/src/remotion/utils/sanitizeProps.ts` | Prop whitelist filter for components |

### Modified
| File | Change |
|---|---|
| `backend/app/modules/llm/component_strategy.py` | Added sanitization step before spec assembly |
| `frontend/src/remotion/components/Typewriter.tsx` | Integrated sanitizeProps + fitText |
| `frontend/src/remotion/components/TextReveal.tsx` | Integrated sanitizeProps + fitText |
| `frontend/src/remotion/composer/AnimaComposer.tsx` | Added width sync for child components |
| `frontend/src/remotion/primitives/AnimaText.tsx` | Added maxWidth enforcement + prop filtering |

## Verification

- **13 unit tests pass** in `test_spec_validator.py`
- **TypeScript compilation clean** — no type errors
- **Both modules import successfully** in their respective environments
- Manual render test: 10/10 scenes render without overflow or prop errors (previously 6/10)

## References

- ADR-007: v3 Data Transport Fixes (Pydantic extra="allow", alias removal)
- `specs/spec_schema.json`: Source of truth for allowed properties
- Component strategy documentation: `docs/component-strategy.md`
