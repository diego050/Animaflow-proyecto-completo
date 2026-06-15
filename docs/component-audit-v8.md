# Auditoría de componentes — Fase 4 (v8)

Tracker resumible de la auditoría de calidad de los componentes Remotion (Fase 4
del `PLAN-MEJORA-CALIDAD.md` / ADR-011). El objetivo por componente:

1. **Tokens:** consumir `utils/tokens.ts` (springs, `elevation()`, `radius()`,
   `TEXT_HALO`) en vez de sombras/radios/springs mágicos.
2. **Responsivo:** tamaños vía `useCanvas()` (`vmin/vw/vh`), nada de px estructural
   (ver `responsive-contract.md`).
3. **Movimiento:** entrada con spring tuneado (vía `AnimatedWrapper`) y, en
   componentes "hero", **idle motion** sutil (`idleBreathe`/`idleDriftY`).
4. **API:** reducir proliferación de props booleanas (variantes/composición).
5. **Determinismo:** sin `Math.random`/`Date.now`.

Estado: ✅ hecho · 🟡 parcial · ⬜ pendiente

## Núcleo / más usados

| Componente | Tokens | Responsivo | Idle | Notas |
|---|---|---|---|---|
| `IconifyIcon` | 🟡 | ✅ | ✅ | idle breathe; size por canvas |
| `StyleTextBlock` | ✅ (TEXT_HALO) | ✅ | ⬜ | halo por defecto; align center |
| `Typewriter` | ✅ (TEXT_HALO) | 🟡 | ⬜ | align center (Fase 3) |
| `WordHighlight` | ✅ (TEXT_HALO) | 🟡 | ⬜ | dim 0.55 (Fase 3) |
| `TextReveal` | 🟡 | 🟡 | ⬜ | usa glow propio; revisar halo |
| `StyleBadge` | 🟡 | ✅ | ⬜ | vmin (Fase 2) |
| `StyleChip` | 🟡 | ✅ | ⬜ | vmin (Fase 2) |
| `StyleButton` | 🟡 | ✅ | ⬜ | vmin (Fase 2) |
| `StyleCard` | 🟡 | ✅ | ⬜ | width relativo + títulos vmin (Fase 2) |
| `APIRequestFlow` | 🟡 | ✅ | ⬜ | referencia responsiva (Fase 2) |

## Pendientes destacados (resto del catálogo)
- **Mockups/cards/charts** (no responsivos aún — ver lista por prioridad en
  ADR-011 §"Fase 2"): TikTokOverlay, MusicPlayerUI, TweetCard, InstagramPost,
  BrowserWindow, PhoneMockup, CodeBlockHighlight, los `Style*Chart`, etc.
- **idle motion** en otros hero (cards, mockups) tras validar que no distrae.
- **Reducir props booleanas** (`showX`, `fillArea`, etc.) → variantes/composición
  (skill `composition-patterns`).
- **elevation()/radius() tokens** en cards/badges/buttons (hoy usan vmin ad-hoc).

## Cómo retomar
1. Toma un componente de la tabla/pendientes.
2. Aplica los 5 puntos de arriba (plantilla: `APIRequestFlow.tsx` para responsivo,
   `IconifyIcon.tsx` para idle, `StyleTextBlock.tsx` para halo/tokens).
3. `npx tsc -b` limpio + render de validación (la animación es "de gusto").
4. Marca el estado aquí.
