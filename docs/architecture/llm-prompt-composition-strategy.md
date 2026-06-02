# LLM Prompt Composition Strategy — AnimaFlow

**Fecha:** 1 de Junio de 2026
**Tipo:** Architecture Decision Record
**Estado:** Implementado
**Archivos:** `backend/app/modules/llm/component_strategy.py`

---

## Overview

The LLM prompt composition strategy defines how the AI constructs video scenes from available components. The system evolved from **artificially constrained** selection (2-4 components, 1 icon max) to **free composition** where the AI uses as many components as each scene needs.

---

## Evolution

### Phase 1: Constrained (Before June 2026)
```
PASO 2: "Elige 2-4 componentes de la lista disponible"
Íconos: "Máximo 1 ícono por escena"
```

**Problems:**
- Scenes with multiple buttons (e.g., pricing table with 3 plans) couldn't be composed
- Complex layouts (grid of cards + badges + icons) were impossible
- The AI was forced to oversimplify scenes that needed more elements

### Phase 2: Free Composition (June 2026)
```
PASO 2: "Selecciona TODOS los componentes necesarios. NO hay límite.
         Puedes usar 1 componente o 15 — lo que la escena necesite."
Íconos: "Usa tantos íconos como la escena necesite."
```

**Benefits:**
- AI can compose any scene complexity
- Multiple buttons, cards, badges per scene
- Rich visual hierarchies with icons, text, and data elements

---

## Composition Rules

### 10 Rules (Current)

| # | Rule | Purpose |
|---|---|---|
| 1 | **NO HAY LÍMITE DE COMPONENTES** — 1 a 20+ elementos | Remove artificial constraints |
| 2 | **Prefer Style* components** for generic UI | LayerStyle support (30+ props) |
| 3 | **Use specialized components** when scene matches | Context-appropriate (TikTokOverlay for TikTok) |
| 4 | **Use Text Effects** for animated text | Typewriter, GlitchTitle, TextReveal |
| 5 | **Use Transitions** for scene-to-scene | GlitchTransition, WipeTransition |
| 6 | **Use Backgrounds & VFX** for atmosphere | KineticBackground, FloatingBlobs |
| 7 | **Combine components** with flex/grid groups | Complex scene organization |
| 8 | **Íconos libres** — múltiples por escena | Visual concept representation |
| 9 | **Jerarquía visual** — zIndex, sizes, position | Most important = most prominent |
| 10 | **No sobre-cargar** — cada componente con propósito | Avoid decorative elements without function |

---

## Composition Examples in Prompt

The prompt includes 3 detailed JSON composition examples to teach the LLM how to build complex scenes:

### Example A: Multiple Buttons + Text
```json
{
  "layers": [{
    "type": "group",
    "layout": "flex",
    "direction": "column",
    "alignItems": "center",
    "gap": 30,
    "children": [
      {"type": "text", "text": "Elige tu plan", "fontSize": 48, "fontWeight": 900},
      {
        "type": "group",
        "layout": "flex",
        "direction": "row",
        "gap": 20,
        "children": [
          {"type": "component", "componentName": "StyleButton", "text": "Básico", "variant": "outline"},
          {"type": "component", "componentName": "StyleButton", "text": "Pro", "variant": "primary"},
          {"type": "component", "componentName": "StyleButton", "text": "Enterprise", "variant": "outline"}
        ]
      },
      {"type": "component", "componentName": "StyleBadge", "text": "Ahorra 50%", "variant": "success"}
    ]
  }]
}
```

### Example B: Cards Grid + Badges + Icons
```json
{
  "layers": [{
    "type": "group",
    "layout": "grid",
    "gridCols": 2,
    "gap": 24,
    "children": [
      {
        "type": "group",
        "layout": "flex",
        "direction": "column",
        "gap": 12,
        "children": [
          {"type": "component", "componentName": "IconifyIcon", "icon": "mdi:rocket-launch", "size": 48},
          {"type": "component", "componentName": "StyleCard", "title": "Rápido", "subtitle": "Deploy en segundos"},
          {"type": "component", "componentName": "StyleBadge", "text": "NEW", "variant": "info"}
        ]
      },
      // ... second card
    ]
  }]
}
```

### Example C: Data-Driven Scene
```json
{
  "layers": [{
    "type": "group",
    "layout": "flex",
    "direction": "column",
    "alignItems": "center",
    "gap": 20,
    "children": [
      {"type": "text", "text": "Resultados del trimestre", "fontSize": 42, "fontWeight": 900},
      {"type": "component", "componentName": "StyleBarChart", "data": [...]},
      {
        "type": "group",
        "layout": "flex",
        "direction": "row",
        "gap": 16,
        "children": [
          {"type": "component", "componentName": "StyleAnimateNumber", "value": 95, "suffix": "%"},
          {"type": "component", "componentName": "StyleAnimateNumber", "value": 2400, "prefix": "$"},
          {"type": "component", "componentName": "StyleProgressBar", "value": 73, "showLabel": true}
        ]
      }
    ]
  }]
}
```

---

## Composition Ranges

The prompt teaches the LLM about different scene complexity levels:

| Level | Components | Example |
|---|---|---|
| **Simple** | 2-3 | 1 background + 1 text (minimalist scene) |
| **Medium** | 5-7 | 1 background + 2 buttons + 1 text + 1 badge (CTA with context) |
| **Complex** | 8-12 | 1 background + 3 cards grid + 2 badges + 1 title + 1 icon (comparison) |
| **Rich** | 12-15+ | 1 background + 1 chart + 2 texts + 1 progress bar + 2 icons + 1 watermark (data-driven) |

---

## Component Reuse Philosophy

A key insight: **the same component can serve multiple roles through different props**.

Example: `StyleButton` can be:
- `variant="primary"` → Main CTA
- `variant="outline"` → Secondary action
- `variant="ghost"` → Decorative element
- `icon="mdi:arrow-right"` → Directional indicator
- `text="Subscribe"` → Action button
- `text="Learn More"` → Informational link

This is why the vector search returns **4 UI slots** — not "4 different buttons" but "4 UI slots the LLM can configure however needed."

---

## Prompt Structure (Current)

The LLM prompt is organized in this order:

1. **Scene context** — text + media_query + timing info
2. **PASO 1** — Identify the subject/theme
3. **PASO 2** — Free composition (no limits)
4. **Available components** — Dynamic list from vector search (15 components)
5. **Icon suggestions** — From Iconify vector search
6. **Layout system** — Flex/grid examples
7. **Video Style System** — Style* component documentation
8. **Selected components** — Dynamic reference from vector search
9. **Composition examples** — 3 detailed JSON examples
10. **Selection rules** — 10 rules
11. **Spring physics** — 6 presets
12. **Layout transitions** — Auto-detect position changes
13. **Exit animations** — Per-layer exit transitions
14. **Scene transitions** — Between-scene transitions
15. **JSON schema** — Expected output format

---

## Token Efficiency

| Section | Tokens |
|---|---|
| System instructions + rules | ~1,200 |
| Dynamic component list (15 from vector search) | ~375 |
| Icon suggestions (~5 icons) | ~100 |
| Timing context + exit instructions | ~200 |
| Video Style System (Style* docs) | ~600 |
| Selected component reference (dynamic) | ~225 |
| Composition examples (3 JSON) | ~600 |
| Spring physics + layout transitions | ~200 |
| Positioning rules + JSON example | ~300 |
| **Total** | **~3,800 tokens** |

**Note:** This is 44% less than the original ~5,650 tokens (which included the hardcoded 108-component library).

---

## Design Decisions

### Why Free Composition?
1. **Real-world scenes are complex** — A pricing page needs 3 buttons + text + badges
2. **AI knows best** — The LLM understands scene context better than hardcoded limits
3. **Component reuse** — Same component, different props = different visual role
4. **Flexibility > Control** — Better to have too many options than too few

### Why Keep Composition Examples?
1. **Teach, don't restrict** — Examples show what's possible without limiting creativity
2. **JSON format guidance** — Ensures valid output structure
3. **Layout patterns** — Demonstrates flex/grid nesting for complex scenes

### Why 10 Rules?
1. **Rule 1** removes the old constraint (most important change)
2. **Rules 2-7** guide component category selection
3. **Rule 8** removes icon limit
4. **Rules 9-10** prevent abuse (hierarchy + no overloading)

---

## Future Improvements

- [ ] **Scene complexity detection:** Auto-detect if scene needs simple/medium/complex composition
- [ ] **Component usage analytics:** Track which components the LLM actually uses vs. what vector search returns
- [ ] **Adaptive quotas:** Adjust vector search quotas based on which components are most frequently used
- [ ] **Composition validation:** Post-render check to ensure scenes aren't over/under-composed
- [ ] **A/B test composition levels:** Compare engagement between simple vs. rich compositions

---

## Related Documents

- `vector-search-components.md` — How components are selected for each scene
- `component-aliases.md` — Legacy component → Style* mapping
- `component-catalog.md` — Full catalog of 108 components
- `video-style-system-complete.md` — Style* component documentation
- `layout-system.md` — Flex/grid layout system
- `backend/app/modules/llm/component_strategy.py` — Prompt construction source

---

## Changelog

| Date | Change | Author |
|---|---|---|
| 2026-06-01 | Remove "2-4 components" limit → free composition | Backend Agent |
| 2026-06-01 | Remove "max 1 icon" limit → free icons | Backend Agent |
| 2026-06-01 | Add 3 composition examples (buttons, cards, data-driven) | Backend Agent |
| 2026-06-01 | Expand selection rules from 6 to 10 | Backend Agent |
| 2026-06-01 | Replace hardcoded 108-component library with dynamic reference | Backend Agent |
| 2026-06-01 | Documentation created | Backend Agent |
