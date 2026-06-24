# Implementation Plan v6 — Component Registry Sync, Group Items Fix, Audio Gap Elimination & Transition Cleanup

**Date:** 2026-06-03
**Status:** Draft — Pending Review
**Supersedes:** implementation_plan_v5.md
**Trigger:** Production video render (job 5f7396ef) with 3 scenes showing missing text, black screens, audio gaps, and dead transition code.

---

## Executive Summary

Production render of a 3-scene video ("¿Tu cuerpo se siente lento...?") revealed **4 critical root causes** introduced or exposed by v5 changes. The most severe: v5's Fase 4 component validation silently destroyed ALL text layers (`StyleTextBlock`) and ALL icon layers (`IconifyIcon`) because they were missing from the `VALID_COMPONENTS` set.

### Issues Observed
| # | Symptom | Severity | Root Cause |
|---|---------|----------|------------|
| 1 | Text missing in scenes 1, 2, 3 | 🔴 Critical | `StyleTextBlock` not in `VALID_COMPONENTS` → removed |
| 2 | Icons missing in scenes 1, 2 | 🔴 Critical | `IconifyIcon` not in `VALID_COMPONENTS` → removed |
| 3 | Group items → 0 children (empty groups) | 🔴 Critical | `value: "text"` picked over `label: "scene text"` → fails len>5 filter |
| 4 | 3.37s silence after audio in scene 1 | 🟡 High | Duration extended to 7.67s but TTS audio is only 4.30s |
| 5 | `out_transition` is dead code | 🟢 Medium | LLM generates transitions, frontend never renders them |

---

## Root Cause Analysis

### RC-1: VALID_COMPONENTS Missing 24 Frontend Components
**Location:** `component_strategy.py:202-219` (`AVAILABLE_COMPONENTS`), `component_strategy.py:1518` (`VALID_COMPONENTS = set(AVAILABLE_COMPONENTS)`)

The `AVAILABLE_COMPONENTS` list has 85 components. The frontend `COMPONENT_REGISTRY` in `registry.ts` has **109 components**. The 24 missing components include:

| Missing Component | Impact |
|---|---|
| `IconifyIcon` | ALL icons removed from every scene |
| `StyleTextBlock` | ALL styled text blocks removed |
| `StyleButton` | ALL styled buttons removed |
| `StyleBadge` | ALL badges removed |
| `StyleCard` | ALL cards removed |
| `StyleScrambleText` | ALL scramble text removed |
| `StyleAnimateNumber` | ALL animated numbers removed |
| `StyleAvatar` | ALL avatars removed |
| `StyleChip` | ALL chips removed |
| `StyleDivider` | ALL dividers removed |
| `StyleProgressBar` | ALL progress bars removed |
| + 13 more Style* components | Various UI elements removed |

**Evidence from logs:**
```
WARNING: Unknown component 'StyleTextBlock' — marking for removal
WARNING: Unknown component 'IconifyIcon' — marking for removal
```

### RC-2: Group Items Filter Prioritizes `value` Over `label`
**Location:** `component_strategy.py:1393-1411` (Fase 1.1, v5 Fase 3)

When the LLM generates:
```json
{"label": "y te está apagando por dentro. Tu comida es combustible, no un premio.", "value": "text"}
```

The code does:
```python
value = item.get("value", item.get("label", ""))
# value = "text" (4 chars)
# "text" is not in LAYOUT_HINT_VALUES → passes
# "text" != scene_text → passes
# len("text") > 5 → FALSE → item dropped
```

The meaningful content in `label` (the full scene text) is **never examined** because `value` exists and is truthy.

**Evidence from logs:**
```
Sanitized group: converted 'items' (1) to 'children' (0)
```

### RC-3: Scene Duration Extension Creates Audio Gaps
**Location:** `orchestrator.py:145-154` (Fase 8)

The formula extends scene duration based on word count:
```python
min_duration_for_text = max(3.0, word_count / WORDS_PER_SECOND)
# Scene 1: max(3.0, 16 / 2.17) = 7.37s
# Extended: round(7.37 + 0.30, 2) = 7.67s
```

But the actual TTS audio is only **4.30 seconds**. Result: **3.37 seconds of dead silence** after the audio finishes.

The fundamental flaw: the extension formula ignores the actual TTS audio duration. It should be `max(actual_audio_duration + padding, min_duration_for_text)`, not `min_duration_for_text + padding` regardless of audio length.

### RC-4: `out_transition` Is Dead Code
**Location:** Entire pipeline

| Layer | Status |
|---|---|
| Backend LLM prompt asks for `out_transition` | ✅ YES |
| Backend Gemini schema includes `out_transition` | ✅ YES |
| Frontend TypeScript type defines `out_transition` | ✅ YES |
| `TransitionWrapper` component exists | ✅ YES |
| Individual transition components exist (5) | ✅ YES |
| `MainComposition` reads `out_transition` | ❌ NO |
| `AnimaComposer` reads `out_transition` | ❌ NO |
| `TransitionWrapper` imported anywhere | ❌ NO |
| Transitions actually rendered | ❌ NO |

The only visual transition between scenes is a 15-frame background color crossfade in `AnimaComposer` and per-layer exit animations via `AnimatedWrapper`.

---

## Implementation Plan

### Fase 1: Sync AVAILABLE_COMPONENTS with Frontend Registry
**Priority:** 🔴 Critical
**Files:** `backend/app/modules/llm/component_strategy.py`
**Estimated effort:** 15 min

**Problem:** `AVAILABLE_COMPONENTS` is missing 24 components that exist in the frontend registry.
**Fix:** Add all missing components to `AVAILABLE_COMPONENTS`.

Replace the `AVAILABLE_COMPONENTS` list (lines 202-219) with the complete list from `frontend/src/remotion/registry.ts`:

```python
AVAILABLE_COMPONENTS: list[str] = [
    "APIRequestFlow", "AbstractWave", "AnimatedArrow", "AnimatedIcon", "AnimatedLine", "AnimatedShape",
    "AppStoreButtons", "AudioSpectrumBars", "BarChartReveal", "BreakingNewsAlert", "BreakingNewsTicker",
    "BrowserWindow", "CalendarDatePop", "CodeBlockHighlight", "CountdownTimer", "CounterNumber",
    "CursorClick", "EmojiFloat", "EmojiReaction", "FeatureChecklist", "FeatureUnlock", "FlashSaleTimer",
    "FloatingBadge", "FloatingBlobs", "FollowerCounter", "FunnelChart", "GitCommitGraph", "GlitchTitle",
    "GlitchTransition", "GlobalVFX", "GradientOverlay", "GridPerspective", "HighlightText",
    "HorizontalBarRace", "IconifyIcon", "InstagramPost",
    "KineticBackground", "LightLeakTransition", "LoadingSpinner", "LowerThird",
    "MaskedReveal", "MediaFrame", "MessageBubble", "MusicPlayerUI", "NetworkNodes", "NotificationToast",
    "ParticleField", "PercentageRing", "PhoneMockup", "PieChartReveal", "PodcastGuestCard",
    "PricingTableReveal", "ProductCardReveal", "ProgressPill", "PromoCodeBanner", "QuoteBlock",
    "RadarSpiderChart", "RaysOfLight", "RippleEffect", "ScoreboardCounter", "SearchEngineTyping",
    "ShoppingCartBadge", "SizeSelector", "SocialProgressBar", "SocialSharePopup", "SoundWaveCircle",
    "SplitScreenGrid", "SplitText", "StockCandlestick", "StrikethroughText",
    "StyleAnimateNumber", "StyleAvatar", "StyleBarChart", "StyleBarRace", "StyleBadge",
    "StyleButton", "StyleCallout", "StyleCard", "StyleChip", "StyleCursor", "StyleDivider",
    "StyleFakeScroll", "StyleFunnelChart", "StyleLineChart", "StylePieChart", "StyleProgressBar",
    "StyleRadarChart", "StyleScrambleText", "StyleSimulatedHover", "StyleTextBlock", "StyleTicker",
    "StyleVideoPlayer", "StyleWatermark",
    "SubscribeButton", "TerminalHacker", "TestimonialReview", "TextBubble", "TextReveal", "TextSwap",
    "TikTokOverlay", "TinderSwipeCard", "TrendLine", "TweetCard",
    "Typewriter", "UnderlineReveal", "VersusScreen", "WaveformVisualizer", "WipeTransition",
    "YouTubeEndScreen", "ZoomBlurTransition",
]
```

**Key additions:** `IconifyIcon`, all 22 `Style*` components, `EmojiReaction`.

**Also update `spec_validator.py` Check 9** to use the same list:
```python
# Import from component_strategy or duplicate the set
from app.modules.llm.component_strategy import AVAILABLE_COMPONENTS
VALID_COMPONENTS = set(AVAILABLE_COMPONENTS)
```

### Fase 2: Fix Group Items — Read `label` When `value` Is Too Short
**Priority:** 🔴 Critical
**Files:** `backend/app/modules/llm/component_strategy.py`
**Estimated effort:** 15 min

**Problem:** `value: "text"` is picked over `label: "scene text"`, resulting in 0 children.
**Fix:** When `value` is too short (< 5 chars), fall back to `label`.

Replace the `elif "label" in item or "value" in item:` block (lines 1393-1411):

```python
elif "label" in item or "value" in item:
    # Try value first, then label — pick whichever has meaningful content
    raw_value = item.get("value", "")
    raw_label = item.get("label", "")
    
    # Pick the longer, more meaningful string as the text content
    if isinstance(raw_value, str) and len(raw_value) > 5:
        text_content = raw_value
    elif isinstance(raw_label, str) and len(raw_label) > 5:
        text_content = raw_label
    else:
        # Both too short — check if either is a layout hint
        for candidate in [raw_value, raw_label]:
            if isinstance(candidate, str) and candidate.strip().lower() in LAYOUT_HINT_VALUES:
                if "alignItems" not in layer:
                    layer["alignItems"] = candidate.strip().lower()
                break
        continue  # Skip this item — no meaningful text content
    
    # Skip layout hints that slipped through
    if isinstance(text_content, str) and text_content.strip().lower() in LAYOUT_HINT_VALUES:
        if "alignItems" not in layer:
            layer["alignItems"] = text_content.strip().lower()
        continue
    
    # Skip if text matches scene text (duplicate)
    if text_content and scene_text and text_content.strip() == scene_text.strip():
        continue
    
    # Add as text child
    children.append({
        "type": "text",
        "text": text_content,
        "x": 0, "y": 0,
        "fontSize": 48,
    })
```

**Key changes:**
- Tries `value` first, falls back to `label` if `value` is too short
- Both are checked for layout hints
- Duplicate detection still works
- Meaningful content from either field is preserved

### Fase 3: Fix Scene Duration — Use Actual TTS Duration, Not Word Count
**Priority:** 🟡 High
**Files:** `backend/app/modules/pipeline/orchestrator.py`
**Estimated effort:** 15 min

**Problem:** Duration extended to 7.67s based on word count, but TTS audio is only 4.30s → 3.37s silence.
**Fix:** Use `max(actual_audio_duration + padding, min_duration_for_text)` instead of `min_duration_for_text + padding`.

Replace the duration extension block (lines 145-154):

```python
# ── Fase 8: Ensure minimum scene duration ──
MIN_SCENE_DURATION = 3.0  # seconds
WORDS_PER_SECOND = 2.17  # Average speech rate

word_count = len(scene_text.split())
min_duration_for_text = max(MIN_SCENE_DURATION, word_count / WORDS_PER_SECOND)

# Use the ACTUAL TTS duration as the base, not the word-count estimate
actual_duration = scene["duration_seconds"]  # Already includes AUDIO_PADDING

if actual_duration < min_duration_for_text:
    # Only extend if the actual audio is genuinely too short
    # Add a small buffer (0.5s) for readability pause after audio ends
    extended = round(min_duration_for_text + 0.5, 2)
    logger.info(
        "Scene %d duration %.2fs too short for %d words — extending to %.2fs",
        i + 1, actual_duration, word_count, extended,
    )
    scene["duration_seconds"] = extended
    # Recalculate offset with the extended duration
    current_offset = scene["start_time_seconds"] + scene["duration_seconds"] + (GAP_MS / 1000)
```

**Key changes:**
- Compares `actual_duration` (TTS + padding) against `min_duration_for_text`
- Only extends if actual audio is genuinely too short
- Adds 0.5s buffer (not 0.3s) for readability pause
- For Scene 1: actual=4.60s, min=7.37s → extends to 7.87s (still has gap, but the formula is now correct)

**Wait — this still creates a gap.** The real issue is that `WORDS_PER_SECOND = 2.17` is too conservative. Piper TTS speaks at ~3.7 wps (16 words in 4.30s). The formula should use the ACTUAL speech rate from the TTS, not a fixed constant.

**Better fix:** Remove the word-count extension entirely. Trust the TTS duration.

```python
# ── Remove Fase 8 word-count extension ──
# The TTS audio duration IS the correct scene duration.
# Piper TTS speaks at the natural rate for the text.
# Extending based on word count creates silence gaps.
# AUDIO_PADDING (0.3s) already provides a small buffer.
```

**Decision:** Remove the word-count extension block entirely. The TTS duration + 0.3s padding is the correct scene duration. If the text is too long for the scene, the solution is to split the text into more scenes (segmentation), not to extend the scene duration.

### Fase 4: Remove `out_transition` from LLM Prompt and Post-Processing
**Priority:** 🟢 Medium
**Files:** `backend/app/modules/llm/component_strategy.py`
**Estimated effort:** 20 min

**Problem:** LLM generates `out_transition` specs that are never rendered. This wastes tokens and creates confusion.
**Fix:** Remove `out_transition` from the LLM prompt, schema, and post-processing.

**Step 1:** Remove `out_transition` instructions from the prompt (lines ~1008-1016 in `_build_strategy_prompt`).

**Step 2:** Remove `out_transition` from the Gemini response schema (lines ~1289-1301 in the Pydantic model or JSON schema).

**Step 3:** Remove `out_transition` from the `AnimaComposerSpec` Pydantic model in `backend/app/schemas/spec.py`.

**Step 4:** Remove `out_transition` from the frontend TypeScript type in `frontend/src/types/spec.ts`.

**Step 5:** Ensure exit animations are applied to ALL layers (already done in v5 post-validation 1).

**Step 6:** The background crossfade (15 frames) in `AnimaComposer.tsx` remains as the only scene-to-scene transition mechanism.

### Fase 5: Ensure Exit Animations on Groups and Their Children
**Priority:** 🟡 High
**Files:** `backend/app/modules/llm/component_strategy.py`
**Estimated effort:** 10 min

**Problem:** Exit animations are added to top-level layers but not to group children. When a group has `entry: "spring-in"` but no `exit`, the children stay visible until the scene ends.
**Fix:** Recursively add exit animations to group children.

Update the exit animation block (post-validation 1, lines ~1575-1588):

```python
# Post-validation 1: Ensure exit animations on ALL non-background layers (recursive)
def _add_exit_animations(layers: list[dict]) -> None:
    for layer in layers:
        is_bg = (
            layer.get("type") == "component"
            and layer.get("componentName") in ("KineticBackground", "ParticleField", "FloatingBlobs", "RaysOfLight", "AbstractWave", "GlobalVFX")
        )
        if not is_bg and "exit" not in layer:
            layer["exit"] = "fade-out"
            layer["exitDelay"] = 0.3
            layer["exitDuration"] = 0.5
            logger.info(
                "Added default exit animation to layer: %s",
                layer.get("componentName", layer.get("type")),
            )
        # Recurse into group children
        children = layer.get("children", [])
        if children:
            _add_exit_animations(children)

_add_exit_animations(result.get("layers", []))
```

---

## Implementation Order

| Step | Fase | Priority | Dependencies | Est. Time |
|------|------|----------|-------------|-----------|
| 1 | Fase 1 (Sync AVAILABLE_COMPONENTS) | 🔴 Critical | None | 15 min |
| 2 | Fase 2 (Fix group items filter) | 🔴 Critical | None | 15 min |
| 3 | Fase 3 (Remove word-count extension) | 🟡 High | None | 15 min |
| 4 | Fase 5 (Recursive exit animations) | 🟡 High | Fase 1 | 10 min |
| 5 | Fase 4 (Remove out_transition) | 🟢 Medium | Fase 5 | 20 min |

**Total estimated time:** ~1.25 hours

---

## Testing Plan

### Unit Tests
1. **`test_available_components_complete`:** Verify `AVAILABLE_COMPONENTS` contains all components from frontend registry
2. **`test_group_items_label_fallback`:** Verify `{"label": "long text", "value": "text"}` creates a text child with the label content
3. **`test_group_items_layout_hint`:** Verify `{"label": "container", "value": "center"}` applies alignItems to group
4. **`test_scene_duration_no_extension`:** Verify scene duration = TTS duration + 0.3s padding (no word-count extension)
5. **`test_exit_animations_recursive`:** Verify group children get exit animations

### Integration Tests
1. **End-to-end render test:** Generate a 3-scene video and verify:
   - Text is visible in all scenes
   - Icons are visible where specified
   - No silence gaps after audio
   - Exit animations play on all layers

### Manual Verification
1. `StyleTextBlock` renders text correctly
2. `IconifyIcon` renders icons correctly
3. Group items with `label`/`value` create proper children
4. Audio plays to completion without silence gaps
5. All layers fade out before scene ends

---

## Files Changed Summary

### Modified
| File | Changes |
|------|---------|
| `backend/app/modules/llm/component_strategy.py` | Fase 1 (AVAILABLE_COMPONENTS), Fase 2 (group items), Fase 4 (remove out_transition), Fase 5 (recursive exit) |
| `backend/app/modules/pipeline/orchestrator.py` | Fase 3 (remove word-count extension) |
| `backend/app/modules/llm/spec_validator.py` | Fase 1 (import AVAILABLE_COMPONENTS for Check 9) |
| `backend/app/schemas/spec.py` | Fase 4 (remove out_transition from schema) |
| `frontend/src/types/spec.ts` | Fase 4 (remove out_transition from type) |

### No New Files
All changes are modifications to existing files.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AVAILABLE_COMPONENTS gets out of sync again | Medium | Critical | Add CI check that compares backend list vs frontend registry |
| Removing word-count extension makes scenes too short | Low | Medium | TTS duration IS the correct duration; if text is too long, split into more scenes |
| Removing out_transition breaks existing specs | Low | Low | Old specs with out_transition are simply ignored (field is optional) |
| Recursive exit animations on deep groups | Low | Low | Max recursion depth is 3 (groups rarely nest deeper) |

---

## References
- Production log: `resultado.md` (job 5f7396ef-3f7f-4e39-9c82-40e2ee4e8e3c)
- Previous plan: `implementation_plan_v5.md`
- ADR: `docs/adr-009-visual-quality-v5.md`
- Frontend registry: `frontend/src/remotion/registry.ts` (109 components)
- Backend list: `backend/app/modules/llm/component_strategy.py` (85 components → 109 after fix)
