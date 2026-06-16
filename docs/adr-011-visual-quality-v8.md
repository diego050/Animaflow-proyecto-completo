# ADR-011 — Visual Quality v8: plan de calidad + Fases 0a/0b (infra del pipeline + wins visuales)

**Fecha:** 2026-06-15
**Estado:** Fases 0a, 0b, 1 **implementadas**. Fase 2 **parcial**. Fase 3 **núcleo resuelto**. Fase 4 **avanzada** (tokens, springs, idle, halo, FloatingBlobs ambiental, Playground Lotes A+B, fix flash de entrada). Fase 5 **avanzada** (transiciones: FadeThroughBlack + variedad rotada + eliminado el crossfade de color turbio; texto opcional por escena AHORA determinista; catálogo Cinematic: KenBurns + CinematicBars; fix colisión GlitchTitle escena 1).
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

**CTA duplicado (§10.10) — regla de prompt + dedup en post-proceso:** primero se
añadió una regla al prompt (blanda, el LLM la ignoró: en un render salió
`HighlightText "¡Empieza hoy y sígueme!"` + botón `StyleButton "Sígueme"`,
duplicado y solapado). Por eso se añadió `_dedup_cta_components`: si el texto de un
CTA (botón/badge) está contenido en el texto narrado, se ELIMINA el CTA (la
narración/karaoke ya lo transmite). Conservador (substring claro, ≥4 chars).

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

**Auditoría de componentes (en curso, ver [`component-audit-v8.md`](./component-audit-v8.md)):**
- **IconifyIcon:** idle breathe sutil determinista (`idleBreathe`) — el icono ya no
  queda muerto/estático tras la entrada (aparece en casi toda escena).
- **Halo de texto unificado** vía token `TEXT_HALO` en `StyleTextBlock`,
  `Typewriter`, `WordHighlight` (mejor separación figura-fondo, una sola fuente).
- **WordHighlight — fix de apretado/solape** (visto en render: "deporte**transforma**tu"
  sin espacio): `activeScale` 1.18→1.08 (la palabra resaltada ya no se ensancha y
  pisa a las vecinas) + `gap` entre palabras 0.25→0.34.

**Validación render (2ª iteración, 4 escenas):** confirmado en log que de-solapamiento,
atenuado de decorativos (FloatingBlobs/AbstractWave→0.30), halo e idle están desplegados
y funcionan. Bugs detectados y corregidos arriba (WordHighlight apretado; CTA duplicado
de la escena 4 → ahora `_dedup_cta_components`). Pendiente observado: `FloatingBlobs`
sigue prominente aun a 0.30 (formas sólidas/sharp centradas → mejorar el componente
para que sea ambiental/blurred); `HighlightText` renderiza muy alto (palabra-por-línea),
el estimador de colisión no lo predice bien.

**Auditoría (cont.):**
- **FloatingBlobs reescrito a AMBIENTAL** — antes eran 2 elipses sólidas con filtro
  "gooey" (alpha-contrast endurecía los bordes) centradas detrás del texto; ahora
  son glows radiales suaves (radial-gradient→transparente + blur) hacia los bordes,
  responsivos (`useCanvas`) y respetando `opacity` (el cap 0.30 los deja muy
  sutiles). Los demás decorativos (NetworkNodes/SoundWaveCircle/AbstractWave/
  RaysOfLight/GridPerspective) son líneas/partículas finas → OK con el cap.

**Playground — bugs corregidos (feedback de prueba real):**
- ⚠️ en `IconifyIcon`/`Typewriter`/`WordHighlight`: crasheaban por props requeridas
  sin default (`icon`/`text` undefined) → defaults seguros + guardas `Array.isArray`
  en `wordTimestamps`.
- Icono **se escapaba del Badge/Button/Chip** (IconifyIcon es `position:absolute`)
  → nuevo modo `inline` en IconifyIcon; Badge/Button/Chip lo usan inline.

**Playground — Lote A (profundización del editor):**
- **Universal props filtrados por rol:** "Posición y Animación" siempre; "Estilo"
  (color/fontSize/width/height) solo en componentes texto/UI → ya no aparecen
  inputs irrelevantes (p. ej. fontSize en FloatingBlobs).
- **entry/exit ahora SÍ se ven** en el preview: el componente se envuelve en
  `AnimatedWrapper` (las props de animación se quitan del interno para no animar
  doble).
- **Fondo del preview:** toggle **Transparente** (con tablero de ajedrez) + color
  picker, independiente de las props del componente.

**Playground — Lote B (props atómicos por componente, manifest+componente+regen):**
- **StyleTextBlock:** `truncate` (recortar con "…" vs dejar fluir). `fontSize`/`color`
  ya editables vía universales de Estilo (rol text) tras el Lote A.
- **FloatingBlobs:** `count` (1-5 glows) + `blur`. `opacity` vía universal.
- **StyleBadge / StyleButton:** `shadow` (toggle boxShadow) + `borderRadius` (override).
- **APIRequestFlow:** `arrowSpeed` (velocidad de la flecha).
- Regenerado `component_manifest.json` (en sync, 111). tsc OK, 13 tests backend.

**Fixes de feedback (prueba en Playground):**
- **Flash pre-entrada (iconos "aparecen → desaparecen → entran"):** con `entryDelay>0`
  el elemento se mostraba a opacidad plena y luego saltaba a 0 para animar. Fix en
  `AnimatedWrapper`: se oculta (opacity 0) ANTES de que empiece la entrada
  (`frame < delayFrames`).
- **Playground — tamaño/scroll:** preview agrandado (16:9 ya no diminuto) y el área
  ahora hace scroll y alinea arriba para que los controles y el caption no se corten.

**PENDIENTE (Fase 4):**
- **Sistema de animación unificado:** algunos componentes tienen entrada PROPIA
  (AnimatedLine se "dibuja", Typewriter teclea) además de los entry genéricos del
  wrapper. Conviene declararlas en el manifest como "entrada disponible" por
  componente (genéricas + custom) para que se elijan en conjunto.
- **Diferido del Lote B (más complejo):** icono inline DENTRO del texto
  ("te quiero ❤ mucho" → parsear tokens en el texto); posición por-blob editable;
  cajas de tamaños distintos en APIRequestFlow.
- Distinción visual Card vs Button/Badge (se ven parecidos).
- Continuar auditoría (tokens/elevation/radius, props booleanas, idle en hero).
- Cablear `exitDelay` en `AnimatedWrapper` (item 19b).
- dotLottie/skia (estratégico).

### Fase 5 — Catálogo / transiciones (iniciada)

**Transiciones de escena — arreglo del "color raro" (feedback #3):**
Había DOS mecanismos a la vez y el culpable era el **crossfade de color de fondo**
en `AnimaComposer`: en los últimos 15 frames **cambiaba de golpe** el fondo de la
escena actual a los colores de la SIGUIENTE → salto turbio verde→marrón→azul.
- **Eliminado** ese crossfade: cada escena mantiene su propio fondo toda su duración.
- **Nueva transición `FadeThroughBlack`** (`transitions/FadeThroughBlack.tsx`):
  velo negro centrado en el corte (opacidad 0→1→0), cinematográfico y **sin colores
  raros**. Registrada en `TransitionWrapper` y puesta como **default** en
  `MainComposition` (antes `GradientOverlay`), ventana ~0.6s.
- tsc OK.

**Variedad de transiciones (feedback: "todas son fade a negro"):** `MainComposition`
ahora **rota** entre `FadeThroughBlack`, `ZoomBlurTransition` y `WipeTransition` por
corte (todas neutrales negro/blanco, sin colores raros).

**"Todo es texto" (feedback #3 — el problema de fondo de §2):** se reescribió la regla
del prompt: **el texto en pantalla es OPCIONAL y se decide por escena**. El audio ya
narra todo; mostrar texto solo en ganchos/cifras/CTA/frases de impacto, y al menos una
escena del medio debe ser **visual pura** (ícono grande + fondo) sin texto. Antes la
regla obligaba `"text":"{{text}}"` en CADA escena → muro de texto.

**Componentes de datos sin datos (feedback #1):** nueva regla — no usar barras de
progreso/charts/contadores como relleno (la "Progress 18%" sin sentido). Además
`StyleProgressBar` se hizo responsivo (height/width/labels vía `useCanvas`, antes px
de escala web diminutos).

**Refuerzo DETERMINISTA de "texto opcional" (render 2026-06-16: el prompt no pegó —
las 3 escenas salieron con texto):** la regla de prompt es blanda y el LLM pone texto
en TODAS. Ahora se fuerza por código (`component_strategy.py` +
`orchestrator.py`):
- `_visual_pure_indices(total)`: selección **determinista** de qué escenas van SIN
  texto. < 3 escenas → ninguna; nunca la 1ra (gancho) ni la última (CTA); ~1 de cada 3
  escenas del medio, repartidas uniformemente, **mínimo 1**. Escala: n=3→{1}, n=10→2,
  n=20→6, n=12→{1,5,10}.
- `_strip_text_for_visual_scene` / `apply_visual_pure_strip`: quita las capas de texto
  **solo si queda un visual real** (ícono/imagen/componente no-texto, no solo fondo);
  si lo único no-fondo es texto, NO toca (evita pantalla vacía). Si el héroe que queda
  es un único ícono, lo **centra (x/y=0) y lo agranda** (size ~0.32·min(w,h)) para que
  la escena se vea intencional.
- Se aplica en el orquestador tras `model_dump`, con `(i, len(scenes))`. Tests:
  `tests/test_visual_pure_scenes.py` (8) verdes.

**Fix colisión escena 1 — texto pisaba el ícono (feedback render 2026-06-16):**
causa raíz: `GlitchTitle` (y `HighlightText`) **faltaban** en
`COMPONENT_DEFAULT_WIDTHS` → el `layoutSolver` les pasaba `DEFAULT_LAYER_WIDTH=200px`
→ el título se comprimía a ~7 líneas altísimas, mientras el estimador de colisión
asumía 918px → calculaba ~4 líneas → subestimaba la altura → el de-solapado no
empujaba el ícono lo suficiente. Fix: añadidos `GlitchTitle` y `HighlightText` al mapa
(`int(cw*0.85)`), igual que los otros componentes de texto que sí se veían bien.
Tests de colisión 10/10 verdes.

**Catálogo Cinematic (net-new, soporta escenas visuales puras):**
- **`KenBurns`** (`components/KenBurns.tsx`, role `background`): efecto full-bleed de
  zoom/pan lento sobre una imagen (`url`), con **fallback a gradiente animado** cuando
  no hay imagen. 6 direcciones (`zoom-in/out`, `pan-left/right/up/down`), `intensity`
  acotada (0.05–0.4), `overlay` oscuro opcional para legibilidad de texto. Determinista
  (deriva de `frame`/`durationInFrames`), responsive por diseño (full-bleed, sin px).
  Es el mayor salto de "look profesional" que faltaba y el lienzo de las escenas visuales.
- **`CinematicBars`** (`components/CinematicBars.tsx`, role `background`): barras
  letterbox (top+bottom) para el look 2.39:1, con slide-in determinista. Combina con
  KenBurns. Overlay zIndex 9990 (debajo de GlobalVFX/transiciones).
- **Vignette + film grain + aberración cromática ya existían** en `GlobalVFX`
  (zIndex 9998) → NO se duplicaron. El catálogo Cinematic se completó con lo que faltaba.
- Registrados en `registry.ts` (import + lista + mapa) y `manifest.ts`; regenerado
  `component_manifest.json` (**113 componentes**, en sync), tsc OK, backend lee 113.
- NOTA de deploy: para que el LLM pueda **seleccionarlos vía RAG** hay que re-seedear
  los componentes (generan su embedding). Hasta entonces son usables manualmente en el
  Playground y vía props explícitas.

**PENDIENTE (Fase 5):**
- **Selección de iconos** (render 2026-06-16): match literal basura — "diez minutos"
  → `material-symbols:10mp-outline` (ícono de cámara "10 MP"); e iconos que no
  cargan → fallback a `mdi:star`. Revisar `iconify_search`/RAG de iconos.
- Elegir la transición por continuidad de escena (no solo rotación por índice).
- Categorías nuevas tipo ReactVideoEditor restantes: **Logo & Branding**, **Image & Media**.
- dotLottie / @remotion/skia para efectos premium.
- Re-embed final de iconos (43k) — ver §10.1.

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
**Fase 3 (refinamiento):** `component_strategy.py` (calibración de estimador +
`_tame_decorative_backgrounds`), regla de prompt anti-CTA-duplicado.

**Fase 4 (nuevos):** `frontend/src/remotion/utils/tokens.ts`, `docs/component-audit-v8.md`.
**Fase 4 (modificados):** `frontend/src/remotion/AnimatedWrapper.tsx` (springs),
`StyleTextBlock.tsx`/`Typewriter.tsx`/`WordHighlight.tsx` (TEXT_HALO),
`IconifyIcon.tsx` (idle breathe),
`backend/app/modules/llm/component_strategy.py` (`_tame_decorative_backgrounds`,
regla de prompt de contraste sobre fondos de color).

## Tests
- Suite relevante (registry_sync + spec_validator + collision_resolution) → **25/25 pasan**.
- `test_collision_resolution.py` cubre de-solapamiento (Fase 3) + atenuado de decorativos (Fase 4).
- `npx tsc -b` (frontend) → limpio (0 errores).

---

## Operación
- **Embeddings:** requiere `GEMINI_API_KEY` válida (o key de usuario en DB). Los
  componentes ya están en Gemini-768; los ~43k **iconos** siguen en `all-mpnet` y
  necesitan `python scripts/reembed_icons.py` una vez (ítem diferible — ver plan §10.1).
- **Deploy:** cambios de backend → redeploy del `api`. Frontend → rebuild de Remotion.
