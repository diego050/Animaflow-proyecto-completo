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
| `FloatingBlobs` | ✅ | ✅ | n/a | **reescrito ambiental**: glows radiales suaves (radial-gradient+blur) hacia los bordes, ya no elipses sólidas centradas; respeta opacity |

## Decorativos de fondo (atenuados a ≤0.30 con contenido encima)
`FloatingBlobs` ✅ reescrito. `NetworkNodes`/`SoundWaveCircle`/`AbstractWave`/
`RaysOfLight`/`GridPerspective`: son líneas/partículas finas (ya sutiles con el cap),
no requieren reescritura urgente.

## Backfill responsivo — ✅ COMPLETO (2026-06-16)

Todos los mockups/cards/charts con px de escala web fueron migrados a `useCanvas`
(detalle por tanda en ADR-011 §"Backfill responsive COMPLETO"). **53/120 .tsx usan
`useCanvas`** (eran 12). Resumen:
- **Gráficas:** `StyleBarChart`, `StyleLineChart`, `StylePieChart`, `BarChartReveal`,
  `FunnelChart`, `StyleFunnelChart`, `StyleBarRace`, `PieChartReveal`,
  `RadarSpiderChart` (+ `gridShape` polygon/circle), `HorizontalBarRace` (lista atómica).
- **Mockups/devices:** `PhoneMockup`, `BrowserWindow`, `TerminalHacker`,
  `MediaFrame`, `StyleVideoPlayer`, `CodeBlockHighlight`, `SplitScreenGrid`,
  `VersusScreen`, `SearchEngineTyping` (todos atómicos + responsive).
- **Sociales/engagement:** `TweetCard`, `InstagramPost`, `TikTokOverlay`,
  `YouTubeEndScreen`, `NotificationToast`, `FollowerCounter`, `MusicPlayerUI`,
  `TestimonialReview`, `SocialSharePopup`, `ShoppingCartBadge`, `TinderSwipeCard`,
  `FlashSaleTimer`, `StyleFakeScroll`.
- **Ventas/misc:** `ProductCardReveal`, `PromoCodeBanner`, `SizeSelector`,
  `CalendarDatePop`, `FeatureUnlock`, `PodcastGuestCard`, `AppStoreButtons`, `StyleAvatar`.
- Único `fontSize` numérico restante: `StyleTextBlock` (FALSO POSITIVO — núcleo, el
  fontSize lo controla el auto-fit del pipeline; renderiza grande).

## Overhaul atomicidad + transform universal (v8, Fases 1–4) — ✅

Raíz: muchos componentes "Cinematic/efectos" exponían 1–3 props (el resto
hardcodeado), las props de posición/animación no se aplicaban a capas tipo
`component`, y algunos chocaban su entrada propia con el `entry`/`exit` del wrapper.

- **Fase 1 — Transform universal.** `scale`/`rotation`/`opacity`/`zIndex` ahora son
  ATÓMICAS para cualquier componente vía `UniversalTransform.tsx` (ancla el
  `transform-origin` en x,y). Antes se descartaban en `AnimaComposer` (capas
  `component`) y el Playground forzaba x/y al centro. Estas 4 props son
  *wrapper-owned*: se quitan de las props del componente para no duplicar
  (GradientOverlay/StyleWatermark/AnimatedShape).
- **Fase 2 — Entrada propia + determinismo.** Nueva prop `disableEntry` (la activa
  el composer cuando hay `entry` explícito): BreakingNewsAlert/BreakingNewsTicker
  traen su entrada como default pero el wrapper la sobreescribe sin doble-animado.
  Quitadas las transiciones CSS no deterministas (AudioSpectrumBars, CursorClick,
  WaveformVisualizer). Arreglado el ⚠️ de SearchEngineTyping (default + guarda).
- **Fase 3 — Atomicidad.** Expuestas en el manifest las props antes hardcodeadas
  de los 10 efectos (colores, tamaños, grosores, conteos, timing). El editor ya
  muestra los colores porque ahora son props del componente (no del bloque
  universal oculto en `decorative`).
- **Fase 4 — Consolidación.** Nuevo `GeometricShapes` (circle/square/triangle/
  pentagon/hexagon/star/ring, con fill/stroke/cornerRadius/spin). `SoundWaveCircle`
  fusionado: ahora es un wrapper fino sobre `RippleEffect` (que ganó `centerDot`).

**Capas/posicionamiento manual:** mover algo es x/y (absoluto); apilar (p.ej.
RippleEffect detrás de un texto) es la prop universal `zIndex`. Bandas sugeridas:
fondo 0–9, contenido 10–49, overlay 50+.

## Pendientes (no responsividad)
- **idle motion** en otros hero (cards, mockups) tras validar que no distrae (opcional, "de gusto").
- **Reducir props booleanas** (`showX`, `fillArea`, etc.) → variantes/composición (opcional).
- **elevation()/radius() tokens** uniformes en cards/badges/buttons (hoy mezcla vmin ad-hoc + tokens).

## Cómo retomar
1. Toma un componente de la tabla/pendientes.
2. Aplica los 5 puntos de arriba (plantilla: `APIRequestFlow.tsx` para responsivo,
   `IconifyIcon.tsx` para idle, `StyleTextBlock.tsx` para halo/tokens).
3. `npx tsc -b` limpio + render de validación (la animación es "de gusto").
4. Marca el estado aquí.
