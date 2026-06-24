# ADR-009: Visual Quality Pipeline v5 — Multi-Line Auto-Fit, Audio Sync, Smart Positioning & Schema Fixes

**Date:** 2026-06-02
**Status:** Accepted
**Supersedes:** ADR-008 (v4 Single-Line Auto-Fit + Basic Sanitization)
**Trigger:** Production video render (job b946ae3f) with 3 scenes showing text overflow, audio truncation, position stacking, and schema conflicts.

---

## Context

After v4 (which added LLM output sanitization, single-line auto-fit, prop whitelisting, and post-validation), production videos still exhibited critical visual defects:

### Defects Observed in Production
| # | Defect | Example | Root Cause |
|---|--------|---------|------------|
| 1 | Text overflow left/right edges | "¿Sabías que los perro..." cut off | Auto-fit assumed single-line text, shrank fontSize to 29px |
| 2 | Audio cuts mid-sentence | Voice truncated at 2.74s | Scene duration = TTS duration exactly, no padding |
| 3 | All layers stacked at (0,0) | 3 layers overlapping | LLM outputs all x:0,y:0; redistribution was crude (200px fixed) |
| 4 | `size` field Pydantic rejection | `"size": "120"` → int 120 → validation error | Schema expected `str`, sanitizer coerced to `int` |
| 5 | Hallucinated components | `RippleEffect` not in registry | No component name validation |
| 6 | Group `items` → garbage children | `value: "center"` rendered as text | Crude conversion of label/value pairs |
| 7 | Typewriter erratic center growth | Text "jumps" instead of typing | `inline-block` + `translate(-50%)` shifts visual center |
| 8 | Unreadable fontSize (29px) | Text too small for mobile | `min_font_size = 28` in auto-fit |

### Why v4 Was Insufficient
v4's auto-fit algorithm calculated `estimated_width = len(text) * char_width` and compared against `max_text_width`. This assumes **single-line text**. For 52 chars at fontSize 96:
- Estimated: 2995px > 918px max → scaled to 29px
- Reality: Text wraps into ~4 lines at 918px width, fitting vertically

The frontend `fitText.ts` already handles multi-line correctly (binary search with `charsPerLine` + `lineCount`), but the backend pre-fit did not.

---

## Decision

Implement a **5-phase quality pipeline v5** that fixes the remaining defects without changing the LLM model or architecture:

### Phase 1: Multi-Line Auto-Fit (Backend)
Replace single-line estimation with binary search matching `fitText.ts` logic:
- Accounts for `line_count` and `total_height` (not just width)
- `min_font_size = 48` (was 28) — minimum readable for mobile video
- Text can use 60% of canvas height for wrapping
- Binary search: max 20 iterations, typically 8-12 (~5ms overhead)

**File:** `backend/app/modules/llm/component_strategy.py` (`_auto_fit_layer_text`)

### Phase 2: `size` Field Schema Fix
The `size` field has dual semantics: semantic labels ("sm", "md", "lg") AND pixel values (120). Fix:
- Schema: `size: Optional[Union[str, int, float]] = None`
- Pydantic validator normalizes all values to string before validation
- Remove `size` from `NUMERIC_KEYS` in sanitizer (no longer coerced to int)
- `spec_validator.py` handles semantic sizes separately from numeric fields

**Files:** `backend/app/schemas/spec.py`, `backend/app/modules/llm/component_strategy.py`, `backend/app/modules/llm/spec_validator.py`

### Phase 3: Intelligent Group Items Conversion
Replace crude `items` → `children` conversion with intelligent filtering:
- Layout hints ("center", "left", "right", "top", "bottom", etc.) → applied as `alignItems` on group, NOT as text children
- Duplicates matching scene text → skipped
- Only meaningful content (>5 chars) → converted to text children
- Groups default to `layout: "flex"` with `direction: "column"` and `alignItems: "center"`

**File:** `backend/app/modules/llm/component_strategy.py` (Fase 1.1 block)

### Phase 4: Component Name Validation
Validate `componentName` against `AVAILABLE_COMPONENTS` registry:
- Unknown components replaced with fallback mapping (e.g., `RippleEffect` → `ParticleField`)
- Unmapped unknown components → layer marked for removal
- Also validates children within groups

**File:** `backend/app/modules/llm/component_strategy.py` (new block after Fase 1.5)

### Phase 5: Smart Layer Redistribution
Replace crude 200px fixed redistribution with role-based positioning:
- **Decorative** (ParticleField, FloatingBlobs, etc.) → `x: 0, y: 0` (full canvas)
- **Text** (Typewriter, TextReveal, StyleTextBlock) → center zone, 250px spacing
- **Icons** (IconifyIcon, AnimatedIcon) → above text, horizontally distributed
- **UI** (SubscribeButton, StyleButton) → bottom zone, 120px spacing
- Only triggers when ALL non-background layers share the same position

**File:** `backend/app/modules/llm/component_strategy.py` (redistribution block)

### Phase 6: Typewriter Alignment Fix
Fix erratic center growth in Typewriter component:
- Remove `display: 'inline-block'` from inner div
- Change outer `textAlign` from `'center'` to `'left'`
- Text grows left-to-right within the centered container
- `minFontSize: 48` (was 28)
- Font changed from `monospace` to `Inter` for readability
- Added `wordBreak: 'break-word'` and `lineHeight: 1.3`

**File:** `frontend/src/remotion/components/Typewriter.tsx`

### Phase 7: Audio Duration Padding
Add 0.3s padding to scene duration to prevent audio truncation:
- Applied after TTS generation
- Applied in fallback path (when TTS fails)
- Imperceptible in video context

**File:** `backend/app/modules/pipeline/orchestrator.py`

### Phase 8: Minimum Scene Duration
Enforce minimum scene duration based on word count:
- `MIN_SCENE_DURATION = 3.0s`
- `WORDS_PER_SECOND = 2.17` (average speech rate)
- If `duration < max(3.0, word_count / 2.17)`, extend scene

**File:** `backend/app/modules/pipeline/orchestrator.py`

### Phase 9: Validator Updates
Add new validation checks to `spec_validator.py`:
- **Check 9:** Component name must be in registry
- **Check 10:** fontSize >= 48 for text components (auto-fix to 48)
- **Check 4 updated:** Exclude `size` from numeric coercion, handle semantic sizes separately

**File:** `backend/app/modules/llm/spec_validator.py`

### Phase 10: TextReveal Alignment Fix
Apply same fixes as Typewriter to TextReveal component:
- `minFontSize: 48`
- `textAlign: 'left'`
- Remove `inline-block`, add `wordBreak: 'break-word'`
- Font changed to `Inter`

**File:** `frontend/src/remotion/components/TextReveal.tsx`

---

## Consequences

### Positive
- All 8 production defects addressed without model change
- Multi-line auto-fit produces readable text (fontSize >= 48) for texts up to 120 chars
- Audio no longer truncates at scene boundaries
- Layers distributed logically by role (text center, icons above, UI below)
- Schema accepts both semantic and numeric sizes without validation errors
- Unknown components replaced with fallbacks instead of crashing
- Typewriter text grows smoothly left-to-right

### Negative
- Additional processing overhead (~5ms per layer for multi-line auto-fit)
- Audio padding adds 0.3s of silence per scene (imperceptible)
- Smart redistribution may override intentional LLM layouts (only when all layers at same position)
- Component fallback mapping is incomplete (logs warning for unmapped components)

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Multi-line auto-fit is slower than single-line | Low | Low | Max 20 iterations, typically 8-12. ~5ms per layer |
| `size` Union type breaks downstream code | Low | Medium | Validator normalizes to string, downstream sees same type |
| Smart redistribution breaks intentional layouts | Medium | Medium | Only triggers when ALL non-bg layers at same position |
| Audio padding accumulates across scenes | Low | Low | 0.3s × 10 scenes = 3s total, imperceptible in 30s+ video |
| Component fallback mapping incomplete | Medium | Low | Log warning; expand mapping based on production data |

---

## Files Changed

### Modified
| File | Phases | Lines Changed |
|------|--------|--------------|
| `backend/app/modules/llm/component_strategy.py` | 1, 2, 3, 4, 5 | ~150 lines |
| `backend/app/schemas/spec.py` | 2 | ~10 lines |
| `backend/app/modules/llm/spec_validator.py` | 2, 9 | ~40 lines |
| `backend/app/modules/pipeline/orchestrator.py` | 7, 8 | ~20 lines |
| `frontend/src/remotion/components/Typewriter.tsx` | 6 | Full replacement |
| `frontend/src/remotion/components/TextReveal.tsx` | 10 | ~15 lines |

### No New Files
All changes are modifications to existing files.

---

## Verification

- **Backend imports:** All 4 modules import successfully (`component_strategy`, `spec`, `spec_validator`, `orchestrator`)
- **TypeScript compilation:** Zero errors (`npx tsc --noEmit`)
- **Unit tests:** 13 existing tests in `test_spec_validator.py` still pass
- **Production test:** Pending — deploy to Testing branch and render test video

---

## Migration Notes

- No database migrations required
- No API contract changes
- Existing spec.json files remain valid
- `size` field backward compatible: numeric values normalized to string by validator

---

## References
- ADR-008: v4 Visual Quality Pipeline (single-line auto-fit, basic sanitization)
- ADR-007: v3 Data Transport Fixes (Pydantic extra="allow", alias removal)
- Production log: `resultado.md` (job b946ae3f-3288-424c-87be-36932c697bb8)
- Implementation plan: `implementation_plan_v5.md`
- Component catalog: `docs/component-master-plan-v2.md`
