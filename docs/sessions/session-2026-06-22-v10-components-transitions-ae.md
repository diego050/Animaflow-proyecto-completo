# Session 2026-06-22 — v10: componentes "remocn", transiciones atómicas y export AE con timeline

Resumen de la sesión de trabajo sobre la galería de componentes Remotion, el
subsistema de transiciones y el export a After Effects.

Docs relacionados: `component-audit-v10-new-components.md`,
`component-audit-v9-new-components.md`, `coordinate-contract.md`,
`responsive-contract.md`.

---

## Resultado global

- **Galería: 119 → 163 componentes.** Build verde (`tsc -b`), manifest en sync
  (`check:manifest`), **cobertura AE 163/163**, smoke test **0 crashes**.
- **Transiciones: subsistema extendido y hecho atómico**, + transiciones reales
  de 2 escenas a nivel compositor.
- **Export AE de video completo**: el `.jsx` ahora reproduce el video entero
  (escenas encadenadas + transiciones), editable capa por capa.

> Pipeline por componente (recordatorio): `.tsx` (UniversalProps + `useCanvas()`
> + contrato de coordenadas + determinista + prop `style`) → `registry.ts`
> (import + COMPONENT_NAMES + COMPONENT_REGISTRY) → `manifest.ts` (props tipadas
> + descripción con keywords) → `generate:manifest`/`tsc -b`/`check:manifest` →
> bloque AE en `components_generator.py` (cobertura 1:1).

---

## Componentes nuevos (todos atómicos)

### Texto
`StaggeredFadeUp`, `MaskedSlideReveal`, `TrackingIn`, `ShimmerSweep`,
`SlotMachineRoll`, `PerspectiveMarquee`, `ChapterTitle`, `QuoteCard`.

### Fondos
`MeshGradientBg`, `DynamicGrid`, `InfiniteBentoPan`.

### UI
`SpotlightCard`, `DataFlowPipes`, `CodeDiffWipe`, `DragAndDropFlow`, `EndCard`,
`SubscribeReminder`.

### Mockups de IA
`ClaudeChat`, `ChatGpt`, `ClaudeCode`, `OpenCode`.

### Social / VFX / diagrama
`GitHubStars`, `XFollowCard`, `XFollowersOverview`, `Confetti`,
`EcosystemConstellation`.

> Además, en paralelo se agregaron `StyleShakeCard`, `StyleSpotlightReveal`,
> `StyleClockWipe`, `StyleLetterboxReveal` (se les completó el bloque AE para
> mantener cobertura 1:1).

### Fixes de build
- Prop `style?: Record<string, unknown>` en interfaces `Style*` que destructuraban
  `style` sin declararlo (TS2339).
- Tipo `defaultValue` del manifest extendido con `number[][]` (tuplas RGB).

---

## Transiciones

Subsistema en `frontend/src/remotion/transitions/`. Contrato extendido a
`({ progress, color, params }) => JSX`. Registro en `TransitionWrapper.tsx`
(`TRANSITION_MAP` + exports), `MainComposition.tsx` (`VALID_TRANSITIONS`),
`backend/app/schemas/spec.py` y `frontend/src/types/spec.ts`.

### Atomicidad
- Nuevo `transition_params` (dict) en el spec (frontend + backend), fluye
  escena → `MainComposition` → `TransitionWrapper` → transición.
- **Duración por corte** vía `transition_params.durationFrames` (default 18 ≈
  0.6s), respetada por preview y export AE.
- ⚠️ No hay aún UI de transiciones en el frontend: hoy salen del LLM o del
  auto-pick (`pickSceneTransition`). UI por-escena = tarea pendiente.

### Velos (overlay)
`FrostedGlassWipe`, `GridPixelateWipe`, `ChromaticAberrationWipe`,
`WhipPanTransition`, `SlideWipe`, `IrisTransition` (+ las previas Fade/Wipe/
Glitch/LightLeak/Gradient/ZoomBlur).

### Compositor (mezcla real de 2 escenas) — `CrossDissolveOut`
La escena saliente se re-renderiza alineada a su timeline y se transforma sobre
la entrante real (sin reiniciar animaciones):
- `CrossDissolve` → fundido.
- `ZoomThroughTransition` → zoom-in (`targetScale`, default 2.5).
- `MorphTransition` → zoom-out (`scaleTo`, default 0.5).
- `SpatialPush` → desliza fuera (`direction`), sin fundir.

Nota: estas mueven/transforman la **saliente** sobre la entrante (la entrante no
se mueve a la vez) — versión pragmática, consistente en preview y AE. Las que
mueven literalmente las dos escenas requerirían tocar el render de la entrante.

---

## Export AE — paridad de timeline (`script_builder.py`)

`create_ae_full_script(job)` ahora arma una **comp maestra** `AnimaFlow_Video`:

1. Cada escena se captura como **precomp** (`Scene 1`, `Scene 2`, …) con
   `__afFindNewComp` (mide `app.project.numItems` antes/después de cada bloque, sin
   depender del nombre de variable interno — incluido `ae_script_code` del LLM).
2. La maestra coloca cada precomp en su **offset temporal** (timeline contiguo).
3. **Transiciones por corte** (`_transition_layer_code`):
   - Velos → sólido de color con opacidad `0→100→0` (y barrido de posición para
     Wipe/SlideWipe/WhipPan).
   - Iris → sólido + máscara elíptica SUBTRACT animada (helper `__afCircleShape`).
   - Blend (CrossDissolve/ZoomThrough/Morph/SpatialPush) → precomp saliente
     duplicada con `timeRemapEnabled` (congela el último frame) + opacidad / escala
     / posición sobre la entrante.

La descarga **por componente** (`admin.py`) no cambia: sigue exportando una sola
escena/componente sin timeline.

> Recordatorio (usuario): el preview es el Player en vivo; el render a mp4 solo
> ocurre al pulsar "transformar". Misma composición en ambos.
> Las **transiciones no tienen `.jsx` por-componente**: solo aparecen dentro del
> export de video completo (comp maestra).

---

## Verificación

| Check | Estado |
|---|---|
| `npx tsc -b` (frontend) | ✅ |
| `npm run check:manifest` | ✅ 163 en sync |
| Cobertura AE (manifest ↔ generador) | ✅ 163/163 |
| Smoke test AE (163 con props default) | ✅ 0 crashes |
| `script_builder` (comp maestra + transiciones) | ✅ smoke OK |

---

## Pendiente

- **Re-embed / re-seed** (lo corre el usuario al final): hasta entonces el LLM no
  autoselecciona los componentes/transiciones nuevos.
- **UI de transiciones por escena** (elegir tipo/duración/color en el frontend).
- Opcional: versiones simétricas de las transiciones de compositor (mover también
  la escena entrante) — requiere tocar el loop de render de escenas.
- Ítems de `PENDING.md` (LLM clients OpenAI/Anthropic, Gemini TTS, split de
  archivos) — línea de trabajo aparte.
