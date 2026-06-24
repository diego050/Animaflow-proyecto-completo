# Vector Search Component Selection — AnimaFlow

**Fecha:** 1 de Junio de 2026
**Tipo:** Architecture Decision Record
**Estado:** Implementado
**Archivos:** `backend/app/services/embedding.py`, `backend/app/modules/llm/component_strategy.py`

---

## Overview

AnimaFlow uses **semantic vector search** to select the most relevant components for each video scene. Instead of sending all 108 components to the LLM (which wastes ~2,800 tokens per scene), the system uses Gemini embeddings to find the 15 most contextually appropriate components.

---

## Problem Statement

### Before (Token Waste)
- The LLM prompt included a hardcoded `## Complete Component Library (108 Components)` section
- This added ~2,800 tokens per scene call regardless of relevance
- For a 10-scene video: ~28,000 wasted tokens (~$0.084 at Gemini pricing)
- The LLM received duplicate information: filtered list + full library

### After (Optimized)
- Vector search selects 15 relevant components based on scene text + media query
- Only those 15 are documented in the prompt (~375 tokens)
- **44% reduction** in prompt size vs. original (5,650 → 3,145 tokens)

---

## Architecture

### Flow Diagram

```
Scene Text + Media Query
         │
         ▼
┌─────────────────────────────────┐
│  1. Generate Query Embedding    │
│     (Gemini Embedding 2, 768d)  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  2. Query ComponentModel table  │
│     (pgvector cosine similarity)│
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  3. Apply Diversity Quotas      │
│     (background:2, text:3,      │
│      ui:4, decorative:3,        │
│      dataviz:2, social:1)       │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  4. Fill Remaining (2 phases)   │
│     Phase 1: UI components      │
│     Phase 2: Any best match     │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  5. Return 15 formatted comps   │
│     → LLM prompt injection      │
└─────────────────────────────────┘
```

---

## Diversity Quotas

### Why Quotas?
Without quotas, vector search might return 15 similar components (e.g., 10 text components + 5 backgrounds). Quotas ensure **compositional variety** so the LLM has options for every layer of a scene.

### Current Distribution (15 total)

| Role | Quota | Rationale |
|---|---|---|
| **background** | 2 | Always need 1 background; 2nd is alternative |
| **text** | 3 | Title + subtitle + body/caption hierarchy |
| **ui** | 4 | Buttons, cards, badges — most versatile components |
| **decorative** | 3 | Icons, avatars, chips, dividers for visual richness |
| **dataviz** | 2 | Charts, counters, progress rings for data scenes |
| **social** | 1 | Social media overlays (only if contextually relevant) |
| ~~transition~~ | **0** | Removed — transitions decided by scene continuity, not semantic search |

### Why UI = 4?
A single `StyleButton` component can serve multiple roles through different props:
- `variant="primary"` → CTA button
- `variant="outline"` → Secondary action
- `variant="ghost"` → Decorative element
- `icon="mdi:arrow-right"` → Directional indicator

So 4 UI slots doesn't mean "4 different buttons" — it means "4 UI slots the LLM can configure however needed."

---

## Two-Phase Fill Remaining

When quota-based selection doesn't fill all 15 slots, a two-phase fill kicks in:

### Phase 1: UI Priority
- Queries remaining UI components not yet selected
- Scores by cosine similarity to the scene query
- Fills available slots with the best UI matches
- **Why UI first?** Buttons, cards, and badges are the most context-agnostic and reusable components.

### Phase 2: General Fallback
- If UI components are exhausted and slots remain
- Queries ALL remaining components (any role)
- Scores by similarity and fills remaining slots
- Ensures we always return exactly 15 components

---

## Token Efficiency

### Before vs After

| Metric | Before (108 hardcoded) | After (15 dynamic) |
|---|---|---|
| Component library section | ~2,800 tokens | ~0 tokens (removed) |
| Dynamic component list | ~250 tokens | ~375 tokens |
| Selected component reference | ~0 tokens | ~225 tokens |
| Style* documentation | ~600 tokens | ~600 tokens (kept) |
| Other prompt sections | ~2,000 tokens | ~2,000 tokens |
| **Total per scene** | **~5,650 tokens** | **~3,145 tokens** |
| **Savings** | — | **~2,505 tokens (44%)** |

### Cost Impact

| Scenario | Before | After | Savings |
|---|---|---|---|
| 1 scene | $0.0017 | $0.0009 | $0.0008 |
| 10 scenes (1 video) | $0.017 | $0.009 | $0.008 |
| 1,000 videos | $17.00 | $9.00 | $8.00 |
| 100,000 videos | $1,700 | $900 | $800 |

---

## Implementation Details

### Embedding Generation
```python
# backend/app/services/embedding.py
def generate_embedding(text: str) -> list[float]:
    """Generate Gemini embedding (768 dimensions)."""
    client = genai.Client(api_key=api_key)
    response = client.models.embed_content(
        model="gemini-embedding-2",
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=768,
        ),
    )
    return response.embeddings[0].values
```

### Cosine Similarity
```python
def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0
```

### Quota-Based Selection
```python
quotas = {
    "background": 2,
    "text": 3,
    "ui": 4,
    "decorative": 3,
    "dataviz": 2,
    "social": 1,
}

for role, count in quotas.items():
    role_components = db.query(ComponentModel).filter(
        ComponentModel.is_active.is_(True),
        ComponentModel.role == role,
    ).all()
    
    scored = [(cosine_similarity(query_embedding, comp.embedding), comp) 
              for comp in role_components if comp.id not in seen_ids]
    scored.sort(key=lambda x: x[0], reverse=True)
    
    for sim, comp in scored[:count]:
        selected.append(_format_component(comp))
        seen_ids.add(comp.id)
```

### Prompt Injection
```python
# backend/app/modules/llm/component_strategy.py
relevant = get_relevant_components(db, text, media_query, top_k=15)

# Dynamic reference built from selected components only
selected_component_ref = "\n".join(
    f"- **{c['name']}** ({c.get('role', 'general')}): {c.get('description', '')}"
    for c in relevant
)
```

---

## Component Model Schema

Components are stored in the `ComponentModel` database table with:

| Field | Type | Purpose |
|---|---|---|
| `name` | string | Component name (e.g., "StyleButton") |
| `role` | string | Role category (background, text, ui, decorative, dataviz, social) |
| `category` | string | Sub-category for filtering |
| `description` | string | Human-readable description |
| `props_schema` | JSON | Component props definition for LLM |
| `embedding` | vector(768) | Gemini embedding for semantic search |
| `is_active` | boolean | Whether component is available |

---

## Fallback Behavior

If embedding generation fails (no API key, network error):
1. System falls back to random active components from the database
2. Logs a warning: `"No embedding available. Falling back to random selection."`
3. Pipeline continues without interruption

---

## Future Improvements

- [ ] **Adaptive top_k:** Dynamically adjust component count based on scene complexity (simple scenes → 10, complex → 20)
- [ ] **Cross-scene memory:** Track which components were used in previous scenes to avoid repetition
- [ ] **User preferences:** Allow users to weight certain roles higher (e.g., "I want more data viz")
- [ ] **A/B testing:** Compare render quality between different quota distributions
- [ ] **Cache embeddings:** Pre-compute component embeddings at startup instead of querying DB

---

## Related Documents

- `component-catalog.md` — Full catalog of 108 components
- `video-style-system-complete.md` — Style* component documentation
- `model_strategy.md` — Gemini model selection and fallback
- `backend/app/services/embedding.py` — Implementation source
- `backend/app/modules/llm/component_strategy.py` — Prompt construction source

---

## Changelog

| Date | Change | Author |
|---|---|---|
| 2026-06-01 | Initial implementation (top_k=10, 7 roles) | Backend Agent |
| 2026-06-01 | Remove hardcoded 108-component library from prompt (~2,800 tokens saved) | Backend Agent |
| 2026-06-01 | Increase to top_k=15, new quotas, remove transition role, two-phase fill | Backend Agent |
| 2026-06-01 | Add composition examples and free component selection rules to prompt | Backend Agent |
