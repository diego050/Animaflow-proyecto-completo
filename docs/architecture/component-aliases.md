# Component Aliases System — AnimaFlow

**Fecha:** 1 de Junio de 2026
**Tipo:** Architecture Decision Record
**Estado:** Implementado
**Archivos:** `frontend/src/remotion/registry.ts`, `frontend/src/remotion/composer/AnimaComposer.tsx`

---

## Overview

The Component Aliases system maps 50+ legacy/specialized component names to their modern `Style*` equivalents. This ensures **backward compatibility** with existing `spec.json` files while guiding the LLM toward `Style*` components that support full `LayerStyle` overrides.

---

## Problem Statement

### Before
- 108 components existed with significant overlap (e.g., `BarChartReveal` and `StyleBarChart` did the same thing)
- `Style*` components support `LayerStyle` (30+ style properties: padding, borders, shadows, filters, transforms)
- Legacy components do NOT support `LayerStyle`
- LLM would randomly pick either version, creating inconsistent visual quality
- Existing `spec.json` files using legacy components would break if components were removed

### After
- `COMPONENT_ALIASES` map resolves legacy names → `Style*` equivalents at render time
- All specs (old and new) render with `Style*` quality
- LLM prompt guides toward `Style*` components
- Zero breaking changes for existing content

---

## Alias Map

### Charts (5 aliases)
| Deprecated | Style* Equivalent |
|---|---|
| `BarChartReveal` | `StyleBarChart` |
| `PieChartReveal` | `StylePieChart` |
| `FunnelChart` | `StyleFunnelChart` |
| `HorizontalBarRace` | `StyleBarRace` |
| `RadarSpiderChart` | `StyleRadarChart` |

### Counters (6 aliases)
| Deprecated | Style* Equivalent |
|---|---|
| `CounterNumber` | `StyleAnimateNumber` |
| `PercentageRing` | `StyleProgressBar` |
| `ScoreboardCounter` | `StyleAnimateNumber` |
| `FollowerCounter` | `StyleAnimateNumber` |
| `FlashSaleTimer` | `StyleAnimateNumber` |
| `CountdownTimer` | `StyleAnimateNumber` |

### Text (8 aliases)
| Deprecated | Style* Equivalent |
|---|---|
| `BreakingNewsTicker` | `StyleTicker` |
| `TextReveal` | `StyleTextBlock` |
| `Typewriter` | `StyleTextBlock` |
| `TextSwap` | `StyleTextBlock` |
| `SplitText` | `StyleTextBlock` |
| `GlitchTitle` | `StyleScrambleText` |
| `StrikethroughText` | `StyleTextBlock` |
| `UnderlineReveal` | `StyleTextBlock` |
| `HighlightText` | `StyleTextBlock` |

### Buttons/CTAs (3 aliases)
| Deprecated | Style* Equivalent |
|---|---|
| `SubscribeButton` | `StyleButton` |
| `AppStoreButtons` | `StyleButton` |
| `PromoCodeBanner` | `StyleCard` |

### UI Components (8 aliases)
| Deprecated | Style* Equivalent |
|---|---|
| `NotificationToast` | `StyleBadge` |
| `MessageBubble` | `StyleCard` |
| `TextBubble` | `StyleCard` |
| `FloatingBadge` | `StyleBadge` |
| `ProgressPill` | `StyleProgressBar` |
| `LoadingSpinner` | `StyleProgressBar` |
| `SocialProgressBar` | `StyleProgressBar` |
| `SocialSharePopup` | `StyleCard` |

### Cards & Mockups (12 aliases)
| Deprecated | Style* Equivalent |
|---|---|
| `PodcastGuestCard` | `StyleCard` |
| `TestimonialReview` | `StyleCard` |
| `PricingTableReveal` | `StyleCard` |
| `ProductCardReveal` | `StyleCard` |
| `CalendarDatePop` | `StyleCard` |
| `MediaFrame` | `StyleCard` |
| `ShoppingCartBadge` | `StyleBadge` |
| `SizeSelector` | `StyleChip` |
| `BrowserWindow` | `StyleCard` |
| `PhoneMockup` | `StyleCard` |
| `MusicPlayerUI` | `StyleCard` |
| `TerminalHacker` | `StyleCard` |

### Social Overlays (4 aliases)
| Deprecated | Style* Equivalent |
|---|---|
| `TinderSwipeCard` | `StyleCard` |
| `TweetCard` | `StyleCard` |
| `InstagramPost` | `StyleCard` |
| `TikTokOverlay` | `StyleCard` |
| `YouTubeEndScreen` | `StyleCard` |

### Misc (5 aliases)
| Deprecated | Style* Equivalent |
|---|---|
| `AnimatedShape` | `StyleDivider` |
| `AnimatedIcon` | `IconifyIcon` |
| `AnimatedArrow` | `StyleCallout` |
| `AnimatedLine` | `StyleDivider` |
| `VersusScreen` | `StyleCard` |
| `APIRequestFlow` | `StyleCard` |
| `CodeBlockHighlight` | `StyleCard` |

**Total: 51 aliases** mapping to 12 `Style*` targets.

---

## Implementation

### Registry (registry.ts)

```typescript
export const COMPONENT_ALIASES: Record<string, string> = {
  'BarChartReveal': 'StyleBarChart',
  'CounterNumber': 'StyleAnimateNumber',
  // ... 51 total mappings
};

export function resolveComponentAlias(name: string): string {
  return COMPONENT_ALIASES[name] ?? name;
}
```

### Composer Resolution (AnimaComposer.tsx)

```typescript
const resolvedName = resolveComponentAlias(componentName);
const ComponentToRender = COMPONENT_REGISTRY[resolvedName];

if (resolvedName !== componentName) {
  console.warn(`[AnimaComposer] Resolved alias: "${componentName}" → "${resolvedName}"`);
}
```

### Resolution Flow

```
spec.json: { "componentName": "CounterNumber" }
                    │
                    ▼
        resolveComponentAlias("CounterNumber")
                    │
                    ▼
        Returns: "StyleAnimateNumber"
                    │
                    ▼
        COMPONENT_REGISTRY["StyleAnimateNumber"]
                    │
                    ▼
        Renders: <StyleAnimateNumber value={...} prefix={...} />
                    │
                    ▼
        Supports: LayerStyle (padding, borders, shadows, etc.)
```

---

## Design Decisions

### Why Aliases Instead of Migration?
1. **Existing specs:** Users may have saved `spec.json` files with legacy component names
2. **LLM flexibility:** The LLM might still output legacy names if they appear in training data
3. **Zero breaking changes:** Old content continues to work without modification
4. **Gradual deprecation:** Can remove aliases in v2 when all content is migrated

### Why Keep Legacy Components in Registry?
Legacy components remain registered in `COMPONENT_REGISTRY` for:
- Direct rendering if someone explicitly uses them (bypassing alias resolution)
- Testing and debugging purposes
- Gradual migration path

### Alias Resolution is Transparent
- The LLM doesn't need to know about aliases
- The spec.json schema doesn't change
- Resolution happens at render time only
- Warning logs help debug which components were aliased

---

## LayerStyle Benefits

When a legacy component is resolved to its `Style*` equivalent, it gains access to:

| Category | Properties |
|---|---|
| **Spacing** | `padding`, `margin` (single value or [top, right, bottom, left]) |
| **Borders** | `borderWidth`, `borderColor`, `borderStyle`, `borderRadius` |
| **Effects** | `boxShadow`, `opacity`, `blur`, `backdropBlur` |
| **Filters** | `brightness`, `contrast`, `saturate`, `grayscale`, `hueRotate`, `invert` |
| **Transforms** | `rotate`, `scale`, `transformOrigin` |
| **Typography** | `lineHeight`, `textShadow`, `textDecoration` |
| **Background** | `backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundOpacity` |
| **Layout** | `overflow`, `aspectRatio`, `objectFit`, `flexWrap`, `flexGrow`, `flexShrink` |

**30+ style properties** that legacy components did NOT support.

---

## Future

- [ ] **Deprecation warnings:** Log when legacy components are used in new specs
- [ ] **Spec migration tool:** Batch-convert existing specs to use `Style*` names
- [ ] **Remove aliases in v2:** Once all content is migrated
- [ ] **LLM prompt cleanup:** Remove legacy component names from the prompt entirely

---

## Related Documents

- `component-catalog.md` — Full catalog of 108 components
- `video-style-system-complete.md` — Style* component documentation
- `vector-search-components.md` — How components are selected for each scene
- `frontend/src/remotion/registry.ts` — Alias map implementation
- `frontend/src/remotion/composer/AnimaComposer.tsx` — Resolution logic

---

## Changelog

| Date | Change | Author |
|---|---|---|
| 2026-06-01 | Initial implementation: 51 aliases, resolveComponentAlias() | Frontend Agent |
| 2026-06-01 | Documentation created | Backend Agent |
