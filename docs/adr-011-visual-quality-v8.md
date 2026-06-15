# ADR-011 — Visual Quality v8: plan de calidad + Fases 0a/0b (infra del pipeline + wins visuales)

**Fecha:** 2026-06-15
**Estado:** Fases 0a, 0b, 1 **implementadas**. Fase 2 **parcial**. Fase 3 **núcleo resuelto**. Fase 4 **iniciada** (tokens + presets de spring + halo de texto + atenuado de decorativos; pendiente idle motion, exitDelay y auditoría de componentes). Fase 5 pendiente.
**Contexto previo:** [adr-010-visual-quality-v7.md](./adr-010-visual-quality-v7.md), [coordinate-contract.md](./coordinate-contract.md)
**Plan canónico (vivo):** [`../PLAN-MEJORA-CALIDAD.md`](../PLAN-MEJORA-CALIDAD.md) — este ADR resume; el plan tiene el detalle por fase.

---

## Contexto

Tras v7 (ADR-010) los videos seguían viéndose poco profesionales. Se hizo un
análisis completo del pipeline (frontend Remotion + backend LLM) partiendo de
videos reales y sus logs. Se identificaron 5 problemas de producto + varios bugs
de infraestructura ocultos. Todo el diagnóstico y el roadmap por fases viven en
`PLAN-MEJORA-CALIDAD.md` (secciones 1–14). Este ADR documenta **qué se ejecutó**.

### Problemas diagnosticados (resumen)
1. Animaciones/componentes poco profesionales (vocabulario de animación pobre, sin design tokens).
2. El **texto** es protagonista en vez de las animaciones (sesgo de tamaño + prompt contradictorio).
3. Posicionamiento con colisiones (solver ciego al tamaño real de los elementos).
4. Inputs del admin `/admin/animations` **hardcodeados** (no hay manifest de props).
5. Componentes **no responsivos** a distintos aspect ratios.
6. Transversales: contraste insuficiente, uso indebido de scramble, etc.

### Hallazgo de infraestructura crítico (de los logs)
- El RAG de selección de componentes **colapsaba a ~8 componentes fijos** en cada
  escena porque `embedding.py`/`iconify_search.py` leían `GEMINI_API_KEY` del
  `.env` (vacío/ inválido) en vez de la key del usuario en la DB que sí usa el
  resto del pipeline (`resolve_llm_credentials`). Causa #1 de "todo se ve igual".
- Listas de componentes **desincronizadas** (registry vs enum Pydantic vs
  sanitizeProps vs prompt vs DB) → `WordHighlight`/`KeywordPop` rechazados.
- Alucinación masiva de props + `thought_signature` de Gemini 3.x rompiendo el JSON.

---

## Decisiones / cambios implementados

### Fase 0a — Infraestructura / pipeline (correctitud)

| # | Causa | Decisión | Archivos |
|---|---|---|---|
| 0 | Embeddings usaban key del `.env` | Propagar la key resuelta (DB) a `get_relevant_components` y `find_best_icons` | `embedding.py`, `iconify_search.py`, `component_strategy.py` |
| 1 | Enum Pydantic desincronizado | `componentName`: `Literal[...]` → `Optional[str]` + `field_validator` contra `AVAILABLE_COMPONENTS` (pasa-desconocidos con warning) | `schemas/spec.py` |
| 2 | Parseo frágil del LLM | Stripping de `thought_signature`, extracción de JSON por llaves, `_coerce_number` robusto (`",180"`, `"160px"`, `"1,200"`) | `component_strategy.py` |
| 2b | Props basura | Limpieza **scoped a componentes de TEXTO** (no global) para no romper charts/contadores/grupos | `component_strategy.py` |
| 3 | Timing en escenas cortas | Guard que respeta el contrato del renderer: acota `entryDuration`/`exitDuration` (frames) y `entryDelay` (segundos) | `component_strategy.py` |

> **Nota de revisión:** la primera versión de la Fase 0a (generada por el modelo de
> apoyo) tenía 2 regresiones que se corrigieron en revisión: (a) un blacklist de
> props **global** que borraba props legítimas (`data`, `value`, `gap`, `maxValue`…)
> rompiendo charts/grupos → se acotó a componentes de texto; (b) conversión errónea
> de `entryDelay` segundos→frames (el renderer ya multiplica por fps) que hacía
> aparecer el elemento ~30× tarde → revertida. Ver `PLAN-MEJORA-CALIDAD.md` §10.9.

### Fase 0b — Wins visuales rápidos

| # | Causa | Decisión | Archivos |
|---|---|---|---|
| 1 | Texto ilegible por bajo contraste | Guardia de contraste **WCAG AA (≥4.5:1)** con auto-fix a blanco/negro | `spec_validator.py` |
| 2 | Texto siempre gigante (regla dura `>=80/96`) | Eliminada; tabla de tamaños **por rol** (protagonista 72-96 vs soporte 40-56) | `component_strategy.py` (prompt) |
| 3 | Scramble en contenido emocional | Restricción a moods tech + post-proceso que cambia `StyleScrambleText`→`StyleTextBlock` si no es tech | `component_strategy.py` |
| 4 | Iconos duplicados (grupo + suelto) | Dedup adicional (Post-validation 2b) además del dedup por posición | `component_strategy.py` |

### Fase 1 — Manifest de componentes (fuente única de verdad)

Resuelve el problema #4 (inputs admin hardcodeados) y unifica las **5 fuentes de
verdad** que estaban dispersas (interfaces TSX, `sanitizeProps`, enum Pydantic,
prompt LLM, seed de DB) en un único manifest.

| # | Cambio | Archivos |
|---|---|---|
| 1 | **Manifest** con 111 componentes (props con type/label/default/options, categoría, rol, descripción). Fuente canónica = el `.ts`; el `.json` es un **artefacto derivado** que consume el backend | `frontend/src/remotion/manifest.ts` (canónico), `backend/app/services/component_manifest.json` (generado), `backend/app/services/manifest.py` (loader Python con cache) |
| 2 | **Playground dinámico**: formulario schema-driven que genera inputs por tipo (color picker, select, textarea, toggle, número) leyendo `manifestEntry.props` | `frontend/src/pages/admin/AnimationPlayground.tsx` |
| 3 | Props antes hardcodeadas **expuestas** (APIRequestFlow: `requestBody`, `responseBody`) | `APIRequestFlow.tsx`, `manifest.ts` |
| 4 | **Backend conectado al manifest**: `AVAILABLE_COMPONENTS = get_component_names()` (el validator de Pydantic lo hereda); `sanitizeProps` usa `getAllowedProps` del manifest (cubre los 111, antes solo 8); seed idempotente desde el manifest | `component_strategy.py`, `schemas/spec.py`, `utils/sanitizeProps.ts`, `scripts/seed_components.py` |
| 5 | **Anti-divergencia (añadido en revisión):** generador `tsx` que deriva el JSON desde el `.ts` + modo `--check` para CI | `frontend/scripts/generate-manifest-json.ts`, scripts npm `generate:manifest` / `check:manifest` |

**Regla operativa:** `component_manifest.json` es un **artefacto generado** — NO
editar a mano. Editar `manifest.ts` y correr `npm run generate:manifest`.
`npm run check:manifest` falla si divergen (apto para CI/pre-commit).

**Nota de revisión:** la primera versión de la Fase 1 dejó el `.json` fuera de
sync con el `.ts` (APIRequestFlow tenía `requestBody`/`responseBody` solo en el TS)
porque no había generador. Se añadió el generador + `--check`, se regeneró el JSON
(0 drift en los 111) y se verificó: backend carga 111, validador OK, 17/17 tests.

### Fase 2 — Responsividad (foundation + núcleo hechos; resto documentado abajo)

Objetivo: que los componentes no usen px estructurales fijos, sino tamaños
derivados del lienzo, y layouts adaptativos por orientación. Ver
[`responsive-contract.md`](./responsive-contract.md).

**Hecho:**
- **Foundation:** `frontend/src/remotion/utils/canvas.ts` (`useCanvas()` con
  `vmin/vw/vh/vmax` + `isLandscape/isPortrait`) + `docs/responsive-contract.md`.
- **Componente de referencia:** `APIRequestFlow.tsx` (responsivo + layout
  fila/columna por orientación).
- **Bloques core convertidos:** `StyleBadge`, `StyleChip`, `StyleButton`,
  `StyleCard` (este corregía bugs reales: `width:400` fijo y títulos 24/14px
  escala-web → ahora relativos al lienzo).
- **Playground:** selector de aspect ratio (9:16 / 4:5 / 1:1 / 16:9) para validar.
- **Bonus:** se arreglaron 4 errores de TS de la Fase 1 que rompían el build
  (`sanitizeProps` importaba `./manifest` en vez de `../manifest`; `defaultValue`
  no admitía arrays; cast faltante en el Player). `tsc -b` ahora pasa limpio.

**Hallazgo (acota el alcance real):** `vmin` equivale a los px de "escala 1080"
en TODOS los formatos estándar (la dimensión menor es 1080 en 9:16/4:5/1:1/16:9),
así que para **9:16** (formato dominante) la mayoría de componentes ya se veían
bien. El beneficio de convertir el resto es **16:9 / 1:1 y resolución (4K/720p)**.
Para las escenas reales del usuario (texto + badge + fondo) la responsividad **ya
está cubierta** (texto es prop-driven, fondos llenan al 100%).

**PENDIENTE — componentes con px fijos por convertir** (patrón: usar `useCanvas()`,
`vmin` para fontSize/iconos, `vw/vh` para anchos/altos, `isLandscape` para
fila/columna; plantilla = `APIRequestFlow.tsx`):

- **Prioridad ALTA (mockups/cards/charts estructurales que rompen cross-formato):**
  TikTokOverlay, MusicPlayerUI, TinderSwipeCard, PricingTableReveal, TweetCard,
  CodeBlockHighlight, InstagramPost, BrowserWindow, PhoneMockup, ProductCardReveal,
  PodcastGuestCard, TestimonialReview, YouTubeEndScreen, MessageBubble, TextBubble,
  StyleVideoPlayer, GitCommitGraph, StockCandlestick, CalendarDatePop,
  PieChartReveal, StyleBarChart, HorizontalBarRace, StyleFunnelChart, StylePieChart.
- **Prioridad MEDIA (badges/contadores/overlays, en parte ya a escala video):**
  FlashSaleTimer, SocialSharePopup, PromoCodeBanner, FeatureUnlock, AppStoreButtons,
  ScoreboardCounter, NotificationToast, StyleAvatar, LowerThird, FollowerCounter,
  SearchEngineTyping, VersusScreen, SizeSelector, FloatingBadge, ShoppingCartBadge,
  SubscribeButton, StyleProgressBar, StyleFakeScroll, BreakingNewsAlert.
- **Prioridad BAJA (fondos/transiciones/texto prop-driven; probablemente OK tal
  cual, revisar antes de tocar):** GridPerspective, LightLeakTransition,
  BreakingNewsTicker, TextReveal, StyleTextBlock, QuoteBlock, SoundWaveCircle,
  StyleBarRace, y los aliases de chart deprecados (BarChartReveal, FunnelChart).

**Criterio de aceptación por componente:** sin px estructurales (anchos/altos/
fontSize/gap/padding/radius vía `useCanvas`), layout adaptativo por orientación
donde aplique, `npx tsc -b` limpio, y verificado con render en 9:16 y 16:9.

**Decisión:** se pausa el VOLUMEN de Fase 2 aquí (lo de alto impacto ya está) y se
prioriza la **Fase 3 (posicionamiento/colisiones) + bugs visuales de §10.10**, que
es lo que más se nota en los renders reales del usuario. Los pendientes de arriba
se retoman después en lotes (o cuando un componente concreto se necesite).

### Fase 3 — Posicionamiento robusto (en curso)

Objetivo: eliminar colisiones/solapamientos (el defecto más visible en los renders
reales del usuario, §10.10).

**Hecho:**
- **Motor de de-solapamiento por bounding box** (`component_strategy.py`:
  `_estimate_layer_height` + `_resolve_vertical_overlaps`, "Post-validation 3b").
  Estima la caja real de cada capa de contenido (texto multilínea por fontSize/
  ancho/maxLines; iconos por size; badges/cards) y separa verticalmente las que
  se pisan, **aunque estén en posiciones distintas** — el caso real que la lógica
  previa (solo "todo en el mismo punto") no detectaba. Respeta el orden, no mueve
  fondos/decorativos (`_FILL_COMPONENTS`) y mantiene la pila en la zona segura.
- **Bug §10.10 — alineación de texto:** `Typewriter` tenía `textAlign:'left'`
  hardcodeado (texto corrido a la izquierda en la escena 2) → ahora `'center'`.
  (`StyleTextBlock` ya centraba por defecto.)
- **Bug §10.10 — contraste de palabras atenuadas:** `WordHighlight` subía el dim
  de 0.4 → 0.55 (eran casi ilegibles sobre fondo oscuro).
- **Tests:** `backend/tests/test_collision_resolution.py` (5 casos: fill intacto,
  orden preservado, separación, zona segura, estimación multilínea).

**Validado con render (2 iteraciones):** escenas 1 y 2 correctas (centrado +
de-solapamiento). La escena 3 (texto sobre botón) destapó que el estimador de
altura subestimaba → **calibrado conservador** (default fontSize 84, ratio 0.6,
lineHeight 1.4; `min_gap` 40; botones/badges por keyword `size`). Test de
regresión añadido (`test_wordhighlight_over_button_separated`). 23/23 tests.

**Z-order — VERIFICADO, no requiere acción:** los decorativos/fondos ya usan zIndex
bajo (`ParticleField`/`KineticBackground`/`RaysOfLight` 0, `SoundWaveCircle` 1,
`AbstractWave` 2, `NetworkNodes`/`GradientOverlay` 5) y el contenido 10-50, así que
ya van detrás. `GlobalVFX` usa 9998 a propósito (overlay de grain/viñeta encima de
todo — correcto). El "choque" de la escena 3 era contraste/grain, no z-order.

**CTA duplicado (§10.10) — atacado en la raíz:** con la colisión arreglada, un
botón debajo del texto narrado ya no se solapa; pero para evitar la redundancia se
añadió una regla al prompt: no repetir literalmente en un botón la frase de CTA que
ya está en el texto hablado (se evita borrar botones post-hoc, que sería riesgoso).

**PENDIENTE (Fase 3, baja prioridad):**
- Colisión horizontal (eje X) y para hijos de grupos anidados (raro en vertical centrado).
- Consolidar los dos layout solvers (`layoutSolver.ts` vs `layout_solver.py` AE) — ADR-010 Fase C3.

**Estado:** el núcleo de Fase 3 (de-solapamiento vertical + z-order verificado +
alineación + contraste de texto atenuado) está resuelto para los casos comunes. Lo
pendiente es de baja frecuencia. Siguiente salto de calidad: Fase 4 (animación).

**Decisión:** se priorizó el de-solapamiento vertical (lo que más se nota) y los
2 bugs de texto. El z-order y la colisión horizontal van en la próxima iteración
de Fase 3.

### Fase 4 — Calidad de animación (iniciada)

Objetivo: el salto de "se ve profesional" (movimiento pulido + lenguaje visual
coherente + legibilidad sobre cualquier fondo).

**Hecho (foundation + primeros wins):**
- **Design/Motion tokens** (`frontend/src/remotion/utils/tokens.ts`): presets de
  spring (`soft`/`pop`/`bouncy`/`gentle`), duraciones, elevación/sombras por nivel,
  `TEXT_HALO`, radios, y helpers de **idle motion** determinista (`idleBreathe`,
  `idleDriftY`) para futura "vida" sutil.
- **AnimatedWrapper** consume los presets de spring: las entradas `scale-in`/
  `spring-in`/`bounce-in` ahora tienen físicas tuneadas con leve overshoot (antes
  `scale-in` era lineal/plano). Aplica a TODOS los componentes de golpe.
- **Legibilidad sobre cualquier fondo:** `StyleTextBlock` tenía sombra `'none'` por
  defecto → ahora halo oscuro (`TEXT_HALO`). Separa el texto de rejillas/blobs/
  gradientes de color (arregla la escena 2: texto azul sobre rejilla azul).
- **Atenuar decorativos ruidosos** (`_tame_decorative_backgrounds`): FloatingBlobs/
  NetworkNodes/SoundWaveCircle/GridPerspective/AbstractWave/RaysOfLight se capan a
  opacity ≤0.30 cuando hay contenido encima (arregla el clutter de la escena 3).
- **Regla de prompt:** texto blanco/casi-blanco sobre componentes de fondo de color.
- **Tests:** +2 (`test_busy_decorative_dimmed...`, `test_decorative_not_dimmed...`).
  Total 25/25.

**PENDIENTE (Fase 4):**
- Cablear `idleBreathe`/`idleDriftY` en componentes hero (vida sutil tras la entrada).
- Cablear `exitDelay` en `AnimatedWrapper` (item 19b) para control fino de salida.
- **Auditoría componente por componente** (consumir tokens/elevation/radius;
  reducir props booleanas; pulir timing) — el grueso de la Fase 4.
- Adoptar dotLottie/skia para efectos premium (estratégico, §strategic-roadmap).

---

## Contratos reafirmados (no romper)

- **La IA orquesta, no dibuja:** `path`/`rect`/`circle` libres PROHIBIDOS para el
  LLM; visuales = componentes del registry + iconos Iconify. (de ADR-010)
- **Contrato de coordenadas (v7):** `x/y` = offset desde el centro; el solver emite
  el centro absoluto; cada componente aplica `translate(-50%,-50%)`. (ver `coordinate-contract.md`)
- **Contrato de timing del renderer (`AnimatedWrapper.tsx`):** `entryDelay` en
  **segundos** (hace `delay*fps`); `entryDuration`/`exitDuration` en **frames**;
  **`exitDelay` NO se usa** (la salida termina siempre en el corte de escena).
- **Determinismo** en todo componente de render (sin `Math.random`/`Date.now`).
- **RAG de selección:** se mandan ~15 componentes por escena (no los 112), con
  embeddings precalculados en `ComponentModel` (pgvector); el costo en tokens NO
  crece con el tamaño del catálogo. (ver `PLAN-MEJORA-CALIDAD.md` §11)

---

## Validación (render real, 2026-06-15)

Deploy a hosting OK. El log de un render de 3 escenas confirma que 0a/0b funcionan:
- `Vector search returned 15 relevant components` con componentes **variados por
  escena** (ya no los 8 fijos); `Found 5 relevant icons` (antes 1 default).
- `WordHighlight` aceptado sin regeneración.
- Garbage props limpiados **solo** en componentes de texto.
- `Spec validation: clean` (contraste OK).

**Bugs visuales pendientes detectados en el render** (registrados en
`PLAN-MEJORA-CALIDAD.md` §10.10, se resuelven en su fase, NO en 0a/0b):
- `WordHighlight` se renderiza con la palabra resaltada **superpuesta** → Fase 4.
- `Typewriter`/`StyleTextBlock` alinean a la **izquierda** en vez de centrado → Fase 4.
- Colisiones de capas (fondos/adornos sobre el texto) → Fase 3.
- CTA duplicado (texto + badge) → Fase 3/prompt.
- Contraste del color **atenuado** de WordHighlight no se valida → Fase 4.
- Elección floja de iconos (`heart-cog` para algo emocional) → Fase 5/prompt.

---

## Pendiente (roadmap, detalle en el plan)

- ✅ **Fase 1 — Manifest de componentes:** completada (ver sección arriba).
- **Fase 2 — Responsividad:** inyectar tamaño de canvas a los componentes; px
  relativos; layouts adaptativos por orientación.
- **Fase 3 — Posicionamiento robusto:** bounding boxes + detección de colisiones +
  safe zones; z-order coherente. (= ADR-010 Fase C3)
- **Fase 4 — Calidad de animación:** presets de movimiento (`@remotion/animated`),
  design tokens, staging/idle motion, **auditoría componente por componente**
  (incluye los bugs de §10.10: WordHighlight, alineación, contraste secundario),
  y cablear `exitDelay` en `AnimatedWrapper`.
- **Fase 5 — Expansión del catálogo:** categorías faltantes (Cinematic, Logo &
  Branding, Transitions, Image & Media) tipo ReactVideoEditor; dotLottie/skia;
  re-embed final de iconos.

---

## Archivos modificados / creados
**Fases 0a + 0b:** `backend/app/services/embedding.py`, `iconify_search.py`,
`backend/app/modules/llm/component_strategy.py`, `spec_validator.py`,
`backend/app/schemas/spec.py`.

**Fase 1 (nuevos):** `frontend/src/remotion/manifest.ts`,
`backend/app/services/component_manifest.json` (generado),
`backend/app/services/manifest.py`,
`frontend/scripts/generate-manifest-json.ts`.
**Fase 1 (modificados):** `frontend/src/pages/admin/AnimationPlayground.tsx`,
`frontend/src/remotion/utils/sanitizeProps.ts`,
`frontend/src/remotion/components/APIRequestFlow.tsx`,
`backend/scripts/seed_components.py`, `backend/app/modules/llm/component_strategy.py`,
`frontend/package.json` (scripts `generate:manifest` / `check:manifest`).

**Fase 2 (nuevos):** `frontend/src/remotion/utils/canvas.ts`, `docs/responsive-contract.md`.
**Fase 2 (modificados):** `frontend/src/remotion/components/APIRequestFlow.tsx`,
`StyleBadge.tsx`, `StyleChip.tsx`, `StyleButton.tsx`, `StyleCard.tsx`,
`frontend/src/pages/admin/AnimationPlayground.tsx` (selector de aspect ratio).
Fixes de build (TS de Fase 1): `manifest.ts`, `sanitizeProps.ts`, `AnimationPlayground.tsx`.

**Fase 3 (modificados):** `backend/app/modules/llm/component_strategy.py`
(`_estimate_layer_height`, `_resolve_vertical_overlaps`, Post-validation 3b),
`frontend/src/remotion/components/Typewriter.tsx` (align center),
`frontend/src/remotion/components/WordHighlight.tsx` (dim 0.4→0.55).
**Fase 3 (nuevos):** `backend/tests/test_collision_resolution.py`.

## Tests
- `tests/test_component_registry_sync.py` + `tests/test_spec_validator.py` → 17/17 pasan.
- `tests/test_collision_resolution.py` → 5/5 pasan.
- `npx tsc -b` (frontend) → limpio (0 errores).

---

## Operación
- **Embeddings:** requiere `GEMINI_API_KEY` válida (o key de usuario en DB). Los
  componentes ya están en Gemini-768; los ~43k **iconos** siguen en `all-mpnet` y
  necesitan `python scripts/reembed_icons.py` una vez (ítem diferible — ver plan §10.1).
- **Deploy:** cambios de backend → redeploy del `api`. Frontend → rebuild de Remotion.
