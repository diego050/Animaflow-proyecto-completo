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
`FloatingBlobs` ✅ reescrito. `NetworkNodes`/`AbstractWave`/
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

### Refinamientos sobre Fases 1–4 (2da pasada de feedback) — ✅
Tras probar en el Playground, segunda ronda de arreglos a los efectos:
- **BreakingNewsAlert:** sombra/resplandor expuestos (`glowColor`/`glowSize`) + `borderWidth`.
- **BreakingNewsTicker:** ya no está clavado abajo a ancho completo; respeta x/y y
  `barWidth` (default 0 = ancho completo) → se puede mover arriba y achicar.
- **CursorClick:** el click se SINCRONIZA con la llegada del cursor (`clickDelay` tras
  completar el movimiento); se quitó el `clickFrame` fijo que disparaba antes de llegar.
- **GeometricShapes:** definido por geometría, no por nombre: `sides` (0=círculo/óvalo,
  3=triángulo, 4=rectángulo, 5+=polígono) y `points` (estrella), con `width`/`height`
  separados (óvalos/rectángulos estirados). Eliminado `ring` (= círculo sin relleno).
- **GitCommitGraph:** reescrito generativo en SVG; `commits` y `branches` ahora SÍ
  controlan cuántos se dibujan (antes hardcodeados a 3 trunk + 1 branch).
- **RippleEffect:** stagger repartido en el ciclo → subir `count` muestra más anillos
  simultáneos de verdad (tope 60, antes 10 e invisibles los altos).
- **SearchEngineTyping:** `width`/`height` independientes con mínimos; fuente/icono
  escalan con el alto y el anillo final cuadra exacto con la barra al redimensionar.
- **SoundWaveCircle:** ELIMINADO (registry + manifest + backend _FILL/_BUSY). Usar
  RippleEffect con `centerDot`. 121 → 120 componentes.
- **WaveformVisualizer:** `direction` (right/left/still) + `speed` para controlar el
  desplazamiento de la onda.

### Background/efectos full-screen + grupos (3ra ronda) — ✅
- **BrandOutro / LogoReveal:** BUG de posición arreglado — usaban x/y como *offset
  desde el centro* (con x=540 → esquina inferior derecha). Ahora x/y ABSOLUTO.
- **AbstractWave:** atómico (waveCount, color, amplitude, frequency, speed, direction,
  separation, strokeWidth, glow) + posicionable.
- **FloatingBlobs:** confinable a una región (x/y centro + width/height → media
  pantalla, subir, estirar/achicar) y hasta 20 blobs con `blobSize`/`sizeVariation`/
  3 colores alternados. (Limitación: color por-blob arbitrario no es exponible en el
  manifest; se alternan 3 colores.)
- **GlobalVFX:** reescrito como "TV analógica SIN SEÑAL" (estática/nieve animada,
  scanlines CRT, parpadeo, viñeta). Descripción explícita para que el embedding lo
  matchee como canal muerto/VHS y no como otro efecto.
- **CinematicBars:** tope de barra 25%→50%; respeta `disableEntry` → puede usar el
  fade-in/out del wrapper en vez de su slide; `duration` expuesto. (No reacomoda el
  contenido dentro de la banda visible — eso es trabajo del layout/safe-area.)
- **CameraShake POR GRUPO (nuevo):** una capa `group` puede llevar `cameraShake`
  (true u objeto con intensity/frequency/rotation/decay/seed) y SOLO ese grupo
  tiembla. Implementado en AnimaComposer (case 'group'). ⚠️ Pendiente backend: el
  schema de escena + el system prompt deben permitir/mencionar `cameraShake` en
  grupos para que el LLM lo use; hoy funciona si el spec lo trae.
- **Descripciones:** mejoradas (más específicas) las de estos componentes para que el
  embedding no sea ambiguo. Queda pendiente una pasada de auditoría al resto.

### Atomicidad de fondos (4ta ronda) — ✅
- **GradientOverlay:** lineal/radial, hasta 3 colores con `midPoint`, ángulo (lineal),
  centro+radio (radial = también lo posiciona). Acepta rgba()/transparent.
- **GridPerspective:** fondo transparente por defecto, `lineWidth`, `cellSize`
  (densidad), `direction` (forward/backward/left/right), `angle`, `perspective`.
- **KineticBackground:** lineal/radial, hasta 3 colores, `angle` y `speed` del vaivén
  (antes el movimiento estaba atado a la duración). Aclarado vs GradientOverlay/fondo.
- **NetworkNodes:** confinable a región (x/y/width/height ahora funcionan) + `nodeSize`,
  `lineWidth`, `drift`, `seed` expuesto. Aclarado que es random-determinista (no hardcode).
- **ParticleField:** región (x/y/width/height), `speed`, `particleSize`+`sizeVariation`,
  `glow`, `direction`, fondo transparente por defecto.
- **KenBurns:** descripción aclarada — es zoom/pan sobre una IMAGEN (no un degradado);
  el gradiente es solo fallback sin imagen. Se mantiene separado de GradientOverlay.
- **rgba/transparente:** ya soportado de punta a punta — los componentes pasan el color
  a CSS y el editor tiene un campo de texto que acepta `rgba()`/`transparent`/`#rrggbbaa`.

### Atomicidad RaysOfLight + Spotlight (6ta ronda) — ✅
- **RaysOfLight:** atómico (speed, numRays, rayWidth, rayOpacity, fade) + fondo
  transparente + origen posicionable (x/y); rayos por la diagonal (200vmax) →
  cubren esquinas en vertical (antes "perdía forma" al girar en 9:16).
- **Spotlight:** BUG x/y arreglado (trataba x/y como offset → se iba al borde con el
  x absoluto del Playground); ahora absoluto. + `softness`, `breatheSpeed`, iris-in
  (`irisIn`/`irisFrames`). `radius` chico = ilumina solo parte de la pantalla.

### ⚠️ Hallazgo: dos sistemas de transición en conflicto (PENDIENTE decidir)
- **Reales (auto):** `MainComposition` dibuja un overlay en CADA corte entre escenas
  vía `TransitionWrapper`, elegido por `pickSceneTransition` (solo FadeThroughBlack /
  ZoomBlurTransition / WipeTransition de `remotion/transitions/`). La IA NO las elige.
  LightLeak y Glitch existen en `transitions/` pero nunca se eligen.
- **Manifest "Transition" (`remotion/components/`):** WipeTransition, ZoomBlurTransition,
  GlitchTransition, LightLeakTransition, MaskedReveal. Son DUPLICADOS/legacy como capa
  dentro de UNA escena, con `triggerFrame` hardcodeado (130–140 → asume 150f) → en el
  Playground "no hacen nada". No pueden transicionar de verdad (una capa no ve la
  escena siguiente). Por eso "la IA nunca usa transiciones".
- Decisión: AMBAS + arreglar MaskedReveal. RESUELTO (7ma ronda, abajo).

### Transiciones: limpieza + sistema real atómico/dirigible (7ma ronda) — ✅
- **Quitados del manifest/registry** los 4 duplicados rotos como componente
  (WipeTransition, ZoomBlurTransition, GlitchTransition, LightLeakTransition de
  `components/`) + borrados sus archivos. 120 → **116 componentes**. (Las refs en el
  pipeline AE quedan inertes; paridad AE = follow-up.)
- **MaskedReveal:** reescrito como EFECTO (categoría Cinematic). Usa clip-path (no
  caja con overflow) → el texto largo hace wrap y no se recorta; entrada (reveal) +
  `exit` opcional. Props: direction, content, color, fontSize, width, exit, exitDuration.
- **Sistema real (`transitions/`) atómico:** FadeThroughBlack/WipeTransition/
  ZoomBlurTransition aceptan `color`; TransitionWrapper lo pasa. Glitch/LightLeak/
  GradientOverlay aceptan `color?` por consistencia (lo ignoran).
- **Usa las 5:** `pickSceneTransition` ahora varía entre Wipe/LightLeak/Glitch en cortes
  continuos (antes solo 3 tipos en total).
- **Dirigible por IA:** `MainComposition` respeta `scene.transition`/`transition_color`
  y `scene.anima_composer.transition`/`transition_color` (override); si no, auto.

### Wire transición IA + DESCUBRIBILIDAD de componentes (8va ronda) — ✅
- **Transición elegida por la IA (end-to-end):** `transition`/`transition_color` añadidos al
  `AnimaComposerSpec` (Pydantic + tipo frontend) y al `gemini_schema`; sección nueva en el
  prompt (`component_strategy`) que explica cuándo usar cada una por TONO. El LLM la emite
  dentro del anima_composer → `model_dump` → la lee `MainComposition`.
- **Descubribilidad (causa raíz de "nunca veo muchos componentes"):** el retriever daba
  `top_k=15` con cuotas por rol (ui:4 de 49, dataviz:2 de 17, social:1 de 10, `general` sin
  cuota) → la mayoría nunca entraba al shortlist. Ahora **top_k=28** y cuotas rebalanceadas
  por tamaño de rol: background2/text4/ui8/decorative4/dataviz4/social2/general1 (resto por
  mejor coincidencia). Más variedad por escena. (El beneficio pleno llega con el re-embed,
  ya que las descripciones nuevas mejoran el ranking dentro de cada rol.)

### Retriever v2: escalable a miles (9na ronda) — ✅
Reescrito `get_relevant_components` para que no salgan siempre "los mejores" ni dependa de
cupos fijos:
- **Cupos BLANDOS adaptativos:** los slots se reparten proporcional a la relevancia de cada
  rol PARA ESA escena (media de top-3 sims, al cuadrado), con piso mínimo (`_ROLE_FLOORS`:
  bg1/text2/ui2/dec1) y tope por rol (`_ROLE_CAPS`). Una escena de datos trae más dataviz;
  una de cita, más text. Reparto greedy determinista.
- **MMR** (`_mmr_select`): dentro de cada rol evita componentes casi idénticos (relevancia −
  redundancia), así no se llenan los slots con clones.
- **Exploración con semilla por video:** `seed=job_id` enchufado por orchestrator (x2) +
  scene_manager → `generate_scene_composer` → retriever. Determinista dentro del video,
  distinto entre videos → rotan los componentes buenos. Sin job_id, fallback determinista
  por prompt.
- **Prompt:** regla 8 "Composición libre" — la lista es un catálogo; puede repetir (3 textos)
  y combinar (texto+decorativo); no rellenar de más.
- Pendiente (miles, fase futura): router de intención + retrieval híbrido (tags) +
  penalización por uso.

### Atomicidad de TODA la categoría Text (10ma ronda) — ✅
13 componentes de texto auditados y arreglados (patrón común: `text`→`text-long` para
saltos de línea, `whiteSpace: pre-wrap`+`wordBreak`+`maxWidth` para que el texto largo
BAJE en vez de salirse, y colores/tamaños expuestos).
- **GradientText:** BUG esquina inferior derecha → x/y absoluto; `color1/2/3` editables.
- **GlitchTitle:** `glitchColor1/2`, `glitchIntensity`, `glitchAmount`, color de letra.
- **HighlightText / StrikethroughText / UnderlineReveal:** ahora cubren TODAS las líneas
  (box-decoration-break) — antes solo la primera; + color de letra y maxWidth.
- **WordHighlight:** el resaltado YA se ve en preview (fallback por tiempo `speed` cuando
  no hay wordTimestamps; antes dependía 100% del audio).
- **Typewriter:** SIEMPRE termina dentro de la duración (usa `useVideoConfig().durationInFrames`
  como fallback en el preview); `speed` pasó a multiplicador de "terminar antes".
- **TextReveal:** fix del ⚠️ (default + guarda ante `text` undefined); `stagger` atómico.
- **TextSwap:** direcciones up/down/left/right + 3D falso; maxWidth/wrap.
- **SplitText:** dirección vertical/horizontal; `splitAmount`/`revealDelay`.
- **StyleScrambleText:** color/fontSize/maxWidth/wrap + toggle `uppercase` (estaba forzado).
- **QuoteBlock:** maxWidth/wrap, `authorColor`, `showQuoteMark`, tamaño.
- **StyleTextBlock:** confirmado standalone (NO es contenedor de otros textos); + pre-wrap.

### Atomicidad UI/Mockups — tanda 1 (11ma ronda) — ✅
- **AnimatedChecklist:** BUG esquina inferior derecha → x/y absoluto; variantes
  `card`/`minimal`/`numbered`; `cardColor`/`fontSize`.
- **AnimatedIcon:** animación `none` (estático) + `width`/`height` para deformar.
- **APIRequestFlow:** N cajas vía `steps` (cadena arbitraria) + `revealStyle`
  (sequence/instant/fade); antes 2 cajas hardcodeadas.
- **BrowserWindow:** variantes `browser` (mac/windows/minimal) + `barColor`.
- **CalendarDatePop:** vista `month`/`year` (resalta mes o día), `year`, colores
  expuestos (bg/text/circle/header) → se puede oscuro/rojo; `showWeekdays`.
- **CodeBlockHighlight:** modo `typing` (escribe el código y el resaltado SIGUE la
  línea), colores `bgColor`/`accentColor`/`headerColor` expuestos.
- Patrón "default 0 = auto" en fontSize/width/height para los nuevos números.

### Atomicidad UI/Mockups — tanda 2 + consolidación (12va ronda) — ✅
- **CountdownTimer:** `color`/`trackColor`/`lineWidth` del anillo, `size`, `tick` toggle.
- **FeatureUnlock:** `label` editable, `lockColor`, `size` (escala el candado), `unlockDelay`, colores.
- **FlashSaleTimer:** ya no se sale de pantalla (tamaños + `size`); `title`/labels editables,
  `blockColor`/`labelColor`, `showMs`, `bounce` toggle.
- **FloatingBadge:** `width` (maxWidth → saltos de línea), `borderColor`, `cornerRadius`, `hoverAmount`.
- **CONSOLIDACIÓN (eliminar redundancia):**
  - **AnimatedIcon ELIMINADO.** Su animación continua (bounce/pulse/spin/float/shake) se
    movió a **IconifyIcon** (`animation`) → ahora los 200k+ iconos pueden animarse. No tenía
    sentido un set de 10 SVGs fijos. (No usamos "IA que dibuja iconos": caro/pobre; Iconify cubre.)
  - **FeatureChecklist ELIMINADO** en favor de **AnimatedChecklist** (variantes + ícono por fila).
  - 116 → **114 componentes**. (Refs inertes de "AnimatedIcon" en heurísticas backend/AE quedan;
    no molestan porque el LLM ya no lo emite.)

### Atomicidad UI — tanda 3 (13va ronda) — ✅
- **KeywordPop:** ⚠️ fix de crash (`icon` sin default → `icon.includes` reventaba; ahora
  default `mdi:fire` + `safeIcon`). Manifest ganó `color` (faltaba) y `glow`.
- **LoadingSpinner:** ahora atómico — `color`/`trackColor`/`lineWidth`/`arc`/`fadeDuration`
  editables (antes `color`/`bgColor` ni estaban en manifest y el fade-in era hardcodeado).
- **LowerThird:** salto de línea vía `width` (maxWidth, antes `nowrap` + ancho fijo 800);
  altura automática (antes fija 120); `bgColor`/`textColor`/`titleColor`/barra + `barWidth`
  expuestos (antes el subtítulo era `#64748b` fijo y bgColor no estaba en manifest).
- **MediaFrame:** `shape` rounded/rect/circle/triangle, `fullScreen` (cubre el lienzo),
  `placeholderColor`. Posición libre ya existía vía x/y + width/height.
- **MessageBubble:** colores de texto separados `senderTextColor`/`receiverTextColor`;
  `width`/`fontSize`/`stagger` en manifest. 1 o N mensajes (split por `;`).
- **MusicPlayerUI:** `progress` (0-100) + `paused` (congela barra, icono play/pause),
  `width`, `titleSize`/`artistSize` separados, `trackColor`/`textColor`/`artistColor`
  expuestos (antes track `#333`, título blanco y artista `#a3a3a3` hardcodeados).
- **Nota arquitectura (combinar en una escena):** las capas soportan `entry`/`exit`/
  `entryDelay`/`exitDuration` vía AnimatedWrapper → un componente puede aparecer, salir y
  dar paso a otro DENTRO de la misma escena (mismo fondo). Ej: spinner con `exit:fade-out`
  + otro componente con `entryDelay`. No requiere 2 escenas.

### Atomicidad UI — tanda 4 (14va ronda) — ✅
- **NotificationToast:** `bgColor`/`textColor`/`messageColor`/`iconBgColor` ahora en manifest
  (antes el mensaje era `#64748b` fijo y el cuadro del ícono era `${color}22` verde fijo);
  `showIconBox` (solo emoji o solo texto) y `width`. Descripción guía a la IA a textos
  cortos para formato móvil.
- **PhoneMockup:** `model` iphone/android/tablet/custom, `width`/`height`/`cornerRadius`,
  `showNotch` (quita la parte negra), `bezelColor`/`bezelWidth`, `shadow` toggle,
  `subtitleColor`. Fix: palabra larga se desbordaba → `overflowWrap/break-word`. Aclarado
  que `accentColor` solo colorea el ícono (por eso "no hacía nada" sin ícono).
- **ProgressPill:** mantiene la simpleza (default `solid`/label `bottom`) + `variant`
  solid/gradient/striped/segmented y `labelPosition` top/bottom/inside/left/right,
  `barColor2`, `segments`, `fontSize`.
- **PromoCodeBanner:** atómico total — `discountBgColor`/`codeBgColor`/`discountTextColor`/
  `borderColor`, `fontSize`/`codeFontSize` separados, `direction` horizontal/vertical,
  `showDiscount` (quitar el cuadro 50% → solo cupón), `codeLabel`, `width`, `cornerRadius`,
  `shadow`, `wiggle`.
- **RotatingCarousel:** color por slide (`items[].color`), `transition` slide/fade/scale,
  `cardColor`/`dotColor`, `dots` inside/outside/none, `shadow` toggle, `width`.
- **Nota nullish-trap:** varios props nuevos con default 0 (`width`/`bezelWidth`/
  `cornerRadius`/`titleSize`…) usan el patrón `v && v > 0 ? v : fallback` (no `??`).

### Atomicidad UI — tanda 5 (15va ronda) — ✅
- **StyleAnimateNumber:** raíz del "Posición/Estilo no funciona" → leía todo de un objeto
  `style`. Pasado a **props planos** (`color`/`fontSize`/`fontWeight`/`letterSpacing`) +
  **`caption`** (texto debajo) con `captionColor`/`captionSize`. `style` queda como fallback
  legacy.
- **StyleAvatar:** BUG "no veo el icono" → `IconifyIcon` se renderizaba SIN `inline`, así
  que se posicionaba en la esquina con su propio x/y y lo recortaba `overflow:hidden`.
  Arreglado con `inline`. Props planos para TODO: `iconColor`, `bgColor`, `ringColor`/
  `ringWidth`, `gradColor1/2/3` (degradado), `badgeColor`/`badgeTextColor`, `nameColor`,
  `subtitleColor` (antes todos hardcodeados).
- **SplitScreenGrid:** rediseño completo. Antes era 1→2x2 fijo con 4 colores hardcodeados.
  Ahora **rejilla flexible**: `panels` (lista con color/text/icon/textColor/shape/span por
  panel), `columns` (cualquier nº), `entry` split/scale/fade/slide, `stagger` (aparición
  uno-a-uno), `gap`/`cornerRadius`/`gapColor`/`shadow`, `cover` (full screen) o caja con
  `width`/`height` en x/y. Cubre "1→4", "4→8", colores/animaciones/formas distintas.

### Atomicidad UI — tanda 6: Style* con `style` anidado (16va ronda) — ✅
Patrón común: estos leían colores/tamaños de un objeto `style` anidado (por eso el panel
"Posición/Animación/Estilo" no los afectaba) y traían su **entrada hardcodeada** que NO
respetaba `disableEntry` (se duplicaba con la del wrapper y siempre se veía en preview).
Fix transversal: **props planos** + nuevo `animateIn` (default true) que ADEMÁS respeta
`disableEntry` → si la capa define `entry`, la entrada propia se apaga y manda el wrapper.
- **StyleBadge:** `bgColor`/`textColor`/`iconColor`/`fontSize`/`width` (maxWidth→wrap)/
  `uppercase`/`borderWidth`/`borderColor`. `variant` queda como preset de color overridable.
- **StyleButton:** `bgColor`/`textColor`/`iconColor`/`fontSize` + `width`/`height` libres
  (manteniendo `size` como preset), `borderColor`/`borderWidth`/`borderRadius`.
- **StyleCallout:** era todo px hardcodeado (flecha "se perdía") → relativo al lienzo con
  `size`, `color`/`textColor`/`bgColor` (fill highlight), `fontSize`, `width` (wrap). Arrow
  con flexDirection por dirección.
- **StyleCard:** título/subtítulo ahora **hacen salto de línea** (`overflowWrap/break-word`,
  subtitle → text-long); `bgColor`/`titleColor`/`subtitleColor`/`titleSize`/`subtitleSize`/
  `borderColor`/`borderWidth`/`borderRadius`/`padding`/`shadow`.
- **Duplicados revisados (decisión: mantener):** StyleBadge (estado, colores semánticos) ≠
  StyleChip (tag/filtro) ≠ FloatingBadge (sticker decorativo flotante grande) — 3 usos
  legítimos, descripciones ya los desambiguan. StyleCard es la única card genérica (las
  otras son específicas: PodcastGuestCard/TestimonialReview/ProductCardReveal).

### Atomicidad UI + fusiones (17va ronda) — ✅
- **StyleChip:** props planos (`bgColor`/`textColor`/`iconColor`/`closeColor`/`fontSize`/
  `width` wrap/borde) + `animateIn`. La X de borrar ahora es editable.
- **StyleDivider:** `color` ni estaba en el manifest (por eso no se cambiaba); agregado +
  límites de grosor (1→60) y largo (→1920) + `animateIn`. dotted ahora son puntos redondos.
- **StyleFakeScroll:** colores (bg/borde/título/subtítulo/iconBg/icono/scrollbar), `width`,
  `itemHeight`, tamaños de texto, `borderRadius`, `borderWidth`.
- **FUSIÓN cursores:** **CursorClick ELIMINADO** → **StyleCursor** sobrevive (multi-punto,
  ahora atómico: `color`/`rippleColor`/`size`/`speed`/`points`; un clic simple = 2 puntos).
  Actualizado prompt del LLM no aplica (CursorClick no estaba en prompt); alias inerte
  CursorClick→StyleCursor + parser/AE export quedan inertes.
- **FUSIÓN progress bars:** **StyleProgressBar ELIMINADO** → **ProgressPill** sobrevive como
  la única, con `variant` solid/gradient/striped/segmented + **circular** (absorbe el ring),
  `size`/`strokeWidth`. Actualizado el **prompt del LLM** (component_strategy.py: bloque
  ### , ejemplo de spec, regla 2.1) de StyleProgressBar→ProgressPill — es live, NO requiere
  re-embed. spec.py/AE export quedan con refs inertes.
- 114 → **112 componentes**. Patrón `animateIn`+`disableEntry` extendido a Chip/Divider.

### Atomicidad UI — tanda 7 (18va ronda) — ✅
- **TerminalHacker:** fix del `~` que se centraba al envolver una línea (`alignItems:flex-start`
  + cursor inline dentro del texto que ahora hace wrap). `headerColor` editable (el bgColor
  no cambiaba la cabecera, estaba `#1e293b` fija).
- **StyleWatermark:** fix de posición — las esquinas centraban en el punto (se salía media marca
  por la izquierda). Ahora anclan por BORDES con `margin`; x/y manual = centro absoluto.
  Agregado `color` (ícono) y `monochrome` (filtro B/N opcional, antes forzado en imágenes).
- **StyleTicker:** props del objeto `style` → planos (color/bgColor/fontSize/fontWeight);
  loop **continuo sin huecos** (módulo) con `loop` toggle y `direction`; `separator` con
  `separatorColor` propio.
- **StyleVideoPlayer:** cambiado `Video`→`OffthreadVideo` (robusto con URLs externas, por eso
  "no funcionaba"); recorte `trimStart`/`trimEnd` en segundos→frames; `width`/`height` libres
  (preset `size` como default); borde editable; `animateIn`. (loop no soportado por
  OffthreadVideo en esta versión → removido.)
- **StyleSimulatedHover:** props planos + `hoverScale`/`hoverLift`/`repeat` + `animateIn`.
  ACLARACIÓN: es un elemento **autocontenido** (button/card/link), NO envuelve otros
  componentes. Aplicar hover a cualquier componente sería un efecto universal (cambio mayor,
  no hecho).

### Atomicidad UI + dataviz (19va ronda) — ✅
- **TestimonialReview:** `shape` star/circle/heart, colores editables (bg/texto/autor/vacías,
  ya estaban en código pero no en manifest), salto de línea (overflowWrap), `width`/`fontSize`.
- **TextBubble:** colores/`fontSize`/`width`(wrap)/`borderRadius` en manifest, `animateIn`
  (la pop dejó de ser obligatoria).
- **TinderSwipeCard:** `direction` left/right/up/down; salto de línea en name/subtitle; **pila
  de cartas** (`cards` lista, cada una con su dirección/stamp) que se pasan en secuencia
  (`interval`). Stamp ocultable con texto vacío.
- **VersusScreen:** `cover`/`width`/`height` (mitad de pantalla posible), `vsText`/`vsColor`/
  `badgeColor`/`borderColor`, `divider` straight/diagonal/curved (+`curveAmount`), `showVs`,
  `textColor`/`fontSize`.
- **BarChartReveal:** adaptado el código de referencia del usuario respetando el contrato JSON:
  **color por barra** (`data[].color` o `colors[]`), **etiquetas** (`data[].label`/`labels`),
  valor encima (`showValues`), eje, `title`/`subtitle`, `maxValue`, `barRadius`/`gap`. **AE
  export actualizado** para data variable + colores por barra (normaliza a maxValue).
- Fix incidental: StylePulseText/StyleSpringText (componentes nuevos) destructuraban `style`
  sin declararlo → añadido a su interface (rompían `tsc -b`).

### AE export: refresco de los ~47 bloques placeholder viejos (23va ronda) — ✅
- **El problema:** ~47 bloques viejos generaban una sola capa de texto literal "X Component"
  (p.ej. "Versus Screen Component"), ignorando todas las props. Al descargar el .jsx no se
  veía el componente, solo un cartel.
- **Ahora leen props reales** y emiten capas representativas. Helpers nuevos: `_ae_card`
  (rrect+título+subtítulo), `_hexc` (color HEX usable o fallback; antes `rgba()`/vacío caía a
  gris), `_split`/`_nums` (parsear "a,b,c" / "1,2,3"). Refrescados por grupo:
  - **Dev/tech:** TerminalHacker (bg+header+líneas), APIRequestFlow, GitCommitGraph (nodos
    elipse), CodeBlockHighlight, NotificationToast (caja+icono+título+msg), LoadingSpinner
    (anillo + `time*360`).
  - **Audio:** AudioSpectrumBars/WaveformVisualizer (barras deterministas), PodcastGuestCard
    (avatar+nombre+rol), MessageBubble (2 burbujas), QuoteBlock.
  - **News/sports:** LowerThird (barra+bg+nombre+título), BreakingNewsTicker (barra+badge),
    VersusScreen (2 mitades+nombres+VS), ScoreboardCounter, BreakingNewsAlert, CountdownTimer.
  - **Data viz:** PieChartReveal/RadarSpiderChart (elipse), StockCandlestick (velas),
    FunnelChart (rects decrecientes), HorizontalBarRace (barras horizontales), CounterNumber.
  - **Social:** TweetCard, InstagramPost, TikTokOverlay, YouTubeEndScreen (+botón subscribe),
    FollowerCounter, SocialSharePopup.
  - **E-commerce:** PromoCodeBanner, SizeSelector (cajas), AppStoreButtons (2 botones),
    FeatureUnlock, FlashSaleTimer (3 bloques H:M:S), PricingTableReveal (3 columnas).
  - **Primitivas:** AnimatedShape (rrect/elipse en endX/endY), AnimatedLine/AnimatedArrow
    (rect rotado por longitud), FloatingBadge (pill+texto), EmojiFloat, GradientOverlay
    (solid+opacity), TextBubble, RippleEffect (elipse+scale+fade), MaskedReveal, ProgressPill
    (track+fill según endPercent).
- **0 placeholders "X Component" restantes** (verificado con regex sobre la escena combinada).
  Smoke test: **119/119** generan .jsx; combinada genera 176 shape layers + 108 text layers
  (antes ~todo era texto plano). Sin bloques huérfanos (todos los `if 'X' in components`
  corresponden a componentes del manifest).

### AE export: cobertura 119/119 + fix crashes individuales (22va ronda) — ✅
- **Cierre de cobertura:** agregados los 13 bloques no-Style que faltaban (GradientText,
  WordHighlight, IconifyIcon, KeywordPop, KenBurns, CinematicBars, Spotlight, CameraShake,
  AnimatedChecklist, RotatingCarousel, LogoReveal, BrandOutro, GeometricShapes). Usan los
  helpers `_ae_text`/`_ae_rrect`/`_ae_ellipse` + keyframes (pop de escala en KeywordPop,
  zoom Ken Burns, fade de LogoReveal, spin de GeometricShapes) y un null+`wiggle()` para
  CameraShake. **Cobertura AE real: 119/119.**
- **2 bugs latentes arreglados** (rompían la descarga individual):
  - `safe_text` solo se definía dentro del bloque TextReveal; 6 bloques viejos (Typewriter,
    GlitchTitle, HighlightText, BrowserWindow, PhoneMockup, SearchEngineTyping) lo usaban
    asumiendo que ya existía → `UnboundLocalError` al descargar solos. Fix: definir `safe_text`
    una vez al inicio de `generate_component_script`.
  - MediaFrame era un placeholder de texto que concatenaba `props.get('url','')` → con el
    default `url=None` lanzaba `TypeError`. Reescrito como frame real (rrect/ellipse según
    `shape`/`fullScreen`/`placeholderColor`).
- Smoke test: **119/119** generan .jsx con props por defecto y la escena combinada (los 119
  juntos) también genera OK (2548 líneas, sin colisión de variables).

### AE export: limpieza + cobertura familia Style* (21va ronda) — ✅
- **Limpieza:** eliminados los 8 bloques AE huérfanos (AnimatedIcon, CursorClick,
  FeatureChecklist, SoundWaveCircle, Wipe/ZoomBlur/Glitch/LightLeakTransition).
- **Cobertura Style\*:** agregados bloques AE para los ~29 `Style*` que faltaban (eran comp
  vacía). Helpers nuevos `_ae_text`/`_ae_rrect`/`_ae_ellipse`/`_ae_bars`/`_norm_values`.
  Representaciones: texto → text layer; badge/chip/button/card/statcard/hover → rrect+texto;
  divider → línea; avatar/cursor/pie/donut/radar → ellipse; bar/multibar/race/line/comparison
  → barras desde `data`; funnel → rrects decrecientes; videoplayer → frame; ticker/animatenumber
  → texto. Probado: 10/10 generan .jsx sin error.
- Cobertura AE real: **106/119** (faltan 13 no-Style: AnimatedChecklist, BrandOutro,
  CameraShake, CinematicBars, GeometricShapes, GradientText, IconifyIcon, KenBurns, KeywordPop,
  LogoReveal, RotatingCarousel, Spotlight, WordHighlight). Los 91 detectables por regex + 15
  Style* manejados en bucles.
- ⚠️ Pendiente (no hecho, decisión del usuario "Style* primero"): refrescar los bloques AE
  VIEJOS para que lean las props atómicas nuevas (hoy muchos son placeholders/hardcode).

### Descarga de AE (.jsx) por componente en /admin/animations (20va ronda) — ✅
- **BUG CRÍTICO arreglado:** `generate_component_script(components,...)` referenciaba una
  variable inexistente `parsed_components` en ~80 de sus ~85 bloques → lanzaba `NameError`
  apenas se llamaba, y el worker lo tragaba con `except Exception` (AE export de componentes
  parseados fallaba EN SILENCIO y caía al fallback SVG). Fix: alias `parsed_components =
  components` al inicio de la función. Ahora TODOS los bloques funcionan.
- **Nuevo endpoint** `POST /api/admin/components/{name}/ae-script` (require_admin): genera y
  descarga el ExtendScript (.jsx) de UN componente con props arbitrarias (determinista, sin
  LLM). Si el componente no tiene bloque AE, devuelve comp vacío con un comentario-aviso.
- **Frontend:** `frontend/src/api/aeScript.ts` (fetch→blob→download). Botón "Descargar AE
  (.jsx)" en el Playground (`AnimationPlayground`, usa las props actuales + aspect) y un
  ícono de descarga por card en la galería (`AnimationsGallery`, usa props por defecto).
- Sirve para verificar en After Effects, componente por componente, que el export funciona.

### Auditoría de descripciones para embeddings (5ta ronda) — ✅ COMPLETA
Reescritas las 120 descripciones del manifest con criterio: (1) qué es en lenguaje
llano, (2) sinónimos que un creador buscaría, (3) caso de uso, (4) qué la distingue de
sus hermanas. En inglés (gemini-embedding es multilingüe). Todas ≥95 chars (antes
muchas eran 45–70 secas). Se desambiguaron pares casi-duplicados que confundían al
embedding (StyleBarChart↔BarChartReveal, StylePieChart↔PieChartReveal,
StyleFunnelChart↔FunnelChart, StyleRadarChart↔RadarSpiderChart,
StyleBarRace↔HorizontalBarRace, CursorClick↔StyleCursor, TextBubble↔MessageBubble,
CountdownTimer↔FlashSaleTimer, StyleBadge↔StyleChip, BreakingNewsAlert↔Ticker,
GradientOverlay↔KineticBackground↔KenBurns). ⚠️ Surten efecto en el matching del LLM
solo TRAS el re-embed (pendiente, "para el final").

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
