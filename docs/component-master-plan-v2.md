# 🎨 AnimaFlow — Master Plan de Componentes v2
**Última actualización:** 2026-05-22  
**Total actual:** 33 componentes  
**Target:** 80+ componentes  
**Arquitectura:** React (Remotion) → TSX Parser → ExtendScript → After Effects

---

## Estado de la Arquitectura

> ✅ **Parser Universal:** `_extract_universal_props()` captura cualquier prop automáticamente  
> ✅ **Composición Multi-Componente:** `elif` → `if` (31 bloques liberados)  
> ✅ **Props Dinámicas:** Todos los componentes extienden `UniversalProps` (color, bgColor, textColor, fontSize, delay)  
> ✅ **AE Dinámico:** El generador lee colores del parser via `hex_to_rgb_array()`

---

## COMPONENTES EXISTENTES (33)

### ✅ Cat. 1 — Tipografía y Texto (4)
| # | Componente | Estado | Props |
|---|---|---|---|
| 1 | `TextReveal` | ✅ Producción | color, animation, x, y, fontSize, delay |
| 2 | `Typewriter` | ✅ Producción | text, color, cursorColor, x, y, fontSize, delay |
| 3 | `GlitchTitle` | ✅ Producción | color, x, y, fontSize, delay |
| 4 | `HighlightText` | ✅ Producción | color, highlightColor, textColor, x, y, fontSize, delay |

### ✅ Cat. 2 — Fondos y Ambientes (6)
| # | Componente | Estado | Props |
|---|---|---|---|
| 5 | `KineticBackground` | ✅ Producción | color1, color2, theme, speed |
| 6 | `ParticleField` | ✅ Producción | color, count, speed, size |
| 7 | `RaysOfLight` | ✅ Producción | color, opacity, speed |
| 8 | `GridPerspective` | ✅ Producción | color1, color2, speed |
| 9 | `FloatingBlobs` | ✅ Producción | color1, color2, blur |
| 10 | `AbstractWave` | ✅ Producción | color, amplitude, frequency |

### ✅ Cat. 3 — UI Mockups (4)
| # | Componente | Estado | Props |
|---|---|---|---|
| 11 | `BrowserWindow` | ✅ Producción | url, bgColor, x, y |
| 12 | `SearchEngineTyping` | ✅ Producción | query, bgColor, textColor, delay |
| 13 | `CursorClick` | ✅ Producción | color, x, y, clickFrame |
| 14 | `PhoneMockup` | ✅ Producción | bgColor, screenColor, x, y |

### ✅ Cat. 4 — Data Visualization (3)
| # | Componente | Estado | Props |
|---|---|---|---|
| 15 | `BarChartReveal` | ✅ Producción | color, bgColor, delay |
| 16 | `TrendLine` | ✅ Producción | color, lineWidth, delay |
| 17 | `PercentageRing` | ✅ Producción | color, bgColor, textColor, targetPercentage, label |

### ✅ Cat. 5 — Formas y Abstractos (2)
| # | Componente | Estado | Props |
|---|---|---|---|
| 18 | `NetworkNodes` | ✅ Producción | color, lineColor, nodeCount, delay |
| 19 | `AbstractWave` | ✅ Producción | color, amplitude, frequency |

### ✅ Cat. 6 — Transiciones (4)
| # | Componente | Estado | Props |
|---|---|---|---|
| 20 | `ZoomBlurTransition` | ✅ Producción | intensity, delay |
| 21 | `GlitchTransition` | ✅ Producción | intensity, color, delay |
| 22 | `WipeTransition` | ✅ Producción | color, angle, speed |
| 23 | `LightLeakTransition` | ✅ Producción | color, intensity, delay |

### ✅ Cat. 7 — VFX Globales y Social (3)
| # | Componente | Estado | Props |
|---|---|---|---|
| 24 | `GlobalVFX` | ✅ Producción | grainIntensity, chromaticAmount, vignetteIntensity |
| 25 | `SocialProgressBar` | ✅ Producción | color, height |
| 26 | `SubscribeButton` | ✅ v2 Dinámico | color, textColor, clickedColor, text, clickedText, clickFrame, fontSize, delay |

### ✅ Cat. 8 — E-Commerce (4)
| # | Componente | Estado | Props |
|---|---|---|---|
| 27 | `ProductCardReveal` | ✅ v2 Dinámico | title, price, bgColor, priceColor, textColor, fontSize, delay |
| 28 | `TestimonialReview` | ✅ v2 Dinámico | author, review, rating, starColor, bgColor, textColor, fontSize |
| 29 | `ShoppingCartBadge` | ✅ v2 Dinámico | badgeColor, iconColor, triggerFrame, delay |
| 30 | `FeatureChecklist` | ✅ v2 Dinámico | itemsStr, checkColor, textColor, bgColor, fontSize, delay |

### ✅ Cat. 9 — Interfaces Interactivas (4)
| # | Componente | Estado | Props |
|---|---|---|---|
| 31 | `TinderSwipeCard` | ✅ v2 Dinámico | name, subtitle, swipeFrame, bgColor, stampColor, stampText |
| 32 | `CalendarDatePop` | ✅ v2 Dinámico | targetDate, month, circleColor, bgColor, textColor |
| 33 | `SplitScreenGrid` | ✅ Producción | splitFrame |
| 34 | `MusicPlayerUI` | ✅ v2 Dinámico | songTitle, artist, progressColor, bgColor, albumColor |

---

## COMPONENTES NUEVOS POR CREAR (47)

### 🔵 Cat. 10 — Developer Tools & Tech (6)
Nicho: SaaS B2B, Product Demos, Tech YouTube

| # | Componente | Props | Descripción | Técnica AE |
|---|---|---|---|---|
| 35 | `TerminalHacker` | lines (array), textColor, bgColor, cursorColor, speed, delay | Terminal CMD/Bash escribiendo líneas de código | Text Layer con `sourceText` expression que avanza por un array de strings |
| 36 | `APIRequestFlow` | method, endpoint, responseCode, color, bgColor, delay | Flecha de GET/POST que viaja de izquierda a derecha con JSON response | Shape Layer (flecha) con Trim Paths + Text Layers para JSON |
| 37 | `GitCommitGraph` | branches (int), color, nodeColor, mergeFrame, delay | Ramas que se bifurcan y fusionan | Shape Layers con vértices calculados + elipses como nodos |
| 38 | `CodeBlockHighlight` | code, language, highlightLine, bgColor, textColor, accentColor | Bloque de código con resaltado de línea | Rect para fondo + Text Layers + Rect dorado en línea clave |
| 39 | `NotificationToast` | title, message, icon, color, bgColor, delay | Push notification estilo iOS/Android | Rect redondeado que entra desde arriba con ease-out |
| 40 | `LoadingSpinner` | color, speed, size, delay | Spinner circular o barra de progreso | Elipse con Trim Paths + Rotation expression |

### 🟣 Cat. 11 — Podcast & Audio (6)
Nicho: Podcasters, Músicos, Audio Creators

| # | Componente | Props | Descripción | Técnica AE |
|---|---|---|---|---|
| 41 | `AudioSpectrumBars` | color, barCount, barWidth, speed, delay | Barras ecualizador que saltan | Rects con Scale Y con `wiggle()` o Audio Keyframes |
| 42 | `PodcastGuestCard` | name, role, glowColor, bgColor, textColor, delay | Card de invitado con glow pulsante | Rect + Text + Drop Shadow animado en Opacity |
| 43 | `MessageBubble` | messages (array), senderColor, receiverColor, textColor, delay | Chat estilo WhatsApp/iMessage | Rects redondeados alternos izq/der + Text, stagger de entrada |
| 44 | `WaveformVisualizer` | color, lineWidth, amplitude, delay | Onda de audio continua tipo SoundCloud | Wave Warp en Shape Layer con stroke animado |
| 45 | `QuoteBlock` | text, author, color, bgColor, fontSize, delay | Cita elegante con comillas decorativas | Text Layer con comillas grandes (fontSize × 3) de fondo |
| 46 | `SoundWaveCircle` | color, rings, speed, delay | Círculos concéntricos pulsantes desde un centro | Múltiples Ellipses con Scale stagger + Opacity fade |

### 🔴 Cat. 12 — News, Broadcast & Sports (6)
Nicho: Periodismo digital, Deportes, Breaking News

| # | Componente | Props | Descripción | Técnica AE |
|---|---|---|---|---|
| 47 | `LowerThird` | name, title, color, bgColor, textColor, fontSize, delay | Barra inferior de presentador | Rect + Trim Paths para wipe reveal + 2 Text Layers |
| 48 | `BreakingNewsTicker` | text, color, bgColor, speed, delay | Marquee de texto corriendo | Text Layer con Position X expression `time * speed` |
| 49 | `VersusScreen` | nameA, nameB, colorA, colorB, textColor, delay | Pantalla dividida A vs B con línea diagonal | 2 Rects + 1 línea diagonal + 2 Text Layers con stagger |
| 50 | `ScoreboardCounter` | valueA, valueB, labelA, labelB, colorA, colorB | Marcador deportivo con flip | Rect oscuro + Text con sourceText keyframes numéricos |
| 51 | `BreakingNewsAlert` | headline, color, bgColor, textColor, fontSize, delay | Banner "ÚLTIMA HORA" pulsante | Rect rojo + Text + Opacity wiggle rápido |
| 52 | `CountdownTimer` | seconds, color, bgColor, textColor, fontSize, delay | Cuenta regresiva 10…9…8… | Text Layer con expression de countdown basado en `time` |

### 📊 Cat. 13 — Data Viz Avanzado (6)
Nicho: Finanzas, Crypto, Consultoría, Reportes

| # | Componente | Props | Descripción | Técnica AE |
|---|---|---|---|---|
| 53 | `PieChartReveal` | values (array), colors (array), labels, delay | Gráfico circular con sectores que giran | Múltiples Shape Groups con Trim Paths rotados |
| 54 | `StockCandlestick` | data (array), upColor, downColor, bgColor, delay | Velas de trading Crypto/Forex | Rects de altura variable, verdes/rojos según dirección |
| 55 | `RadarSpiderChart` | values (array), color, fillColor, labels, delay | Telaraña comparativa | Líneas desde centro con vértices calculados + Fill semi-transparente |
| 56 | `FunnelChart` | values (array), colors (array), labels, delay | Embudo de conversión ventas | Trapecios (Shape paths) decrecientes con Trim Paths |
| 57 | `HorizontalBarRace` | items (array), colors, speed, delay | Barras horizontales que "compiten" | Rects con Scale X animado a distintas velocidades |
| 58 | `CounterNumber` | from, to, color, fontSize, suffix, prefix, delay | Número que sube de 0 a N (ej: "$0 → $1M") | Text Layer con expression `Math.round(linear(time,...))` |

### 🗺️ Cat. 14 — Geografía & Logística (5)
Nicho: Travel, Delivery, Aerolíneas, Logistics SaaS

| # | Componente | Props | Descripción | Técnica AE |
|---|---|---|---|---|
| 59 | `WorldMapPin` | pinColor, waveColor, x, y, delay | Pin cayendo del cielo con onda expansiva | Elipse + Scale animado para onda + Shape path para pin |
| 60 | `FlightPathLine` | fromX, fromY, toX, toY, color, dotColor, delay | Línea curva de vuelo con avión | Bezier Shape + Trim Paths + Null con position along path |
| 61 | `RadarScan` | color, dotColor, speed, delay | Radar giratorio con ping | Línea radial con Rotation expression + Elipses como blips |
| 62 | `RouteTimeline` | stops (array), color, dotColor, activeColor, delay | Ruta de paradas (ej: A→B→C→D) | Línea horizontal + Elipses como nodos + Trim Paths |
| 63 | `LocationCard` | city, country, emoji, bgColor, textColor, delay | Tarjeta de ubicación con bandera | Rect redondeado + Text Layers + emoji como pseudo-icono |

### 🎓 Cat. 15 — Educación & Tutorial (6)
Nicho: Cursos Online, Explainer Videos, Onboarding

| # | Componente | Props | Descripción | Técnica AE |
|---|---|---|---|---|
| 64 | `StepByStepGuide` | steps (array), color, bgColor, textColor, activeColor, delay | 1→2→3 con círculos numerados | Elipses numeradas con line connecting + highlight secuencial |
| 65 | `TooltipPopup` | text, targetX, targetY, color, bgColor, delay | Tooltip con flecha que aparece señalando | Rect redondeado + triángulo (3 vértices) + Text |
| 66 | `ProgressSteps` | current, total, color, bgColor, labels, delay | Barra de progreso Step 2/5 | Rects segmentados + Fill stagger + Text |
| 67 | `BeforeAfterSlider` | labelBefore, labelAfter, colorBefore, colorAfter, slideFrame | Comparación deslizante Antes/Después | 2 Rects lado a lado + Line divisoria con Position X animado |
| 68 | `KeyboardShortcut` | keys (array), bgColor, textColor, delay | Teclas de teclado (ej: ⌘+C) | Rects redondeados + Text por tecla + Scale stagger |
| 69 | `AnnotationArrow` | fromX, fromY, toX, toY, color, label, delay | Flecha curva señalando algo | Bezier path + Trim Paths + arrowhead (triángulo en punta) |

### 🏢 Cat. 16 — Branding & Corporate (6)
Nicho: Presentaciones, Pitch Decks, Videos Corporativos

| # | Componente | Props | Descripción | Técnica AE |
|---|---|---|---|---|
| 70 | `LogoReveal` | bgColor, flashColor, delay | Revelación de logo con flash blanco | Solid blanco con Opacity flash + Scale bounce |
| 71 | `TeamMemberCard` | name, role, bgColor, accentColor, textColor, delay | Tarjeta de equipo con borde de color | Rect + línea lateral de acento + 2 Text Layers |
| 72 | `TimelineVertical` | events (array), color, dotColor, textColor, delay | Línea temporal vertical con puntos | Línea + Elipses + Text stagger |
| 73 | `StatCard` | value, label, icon, color, bgColor, textColor, delay | Tarjeta de estadística (ej: "2.4M Users") | Rect + CounterNumber interno + Label |
| 74 | `ComparisonTable` | headers, rows, highlightCol, color, bgColor, delay | Tabla comparativa animada | Grid de Rects + Text Layers + highlight column |
| 75 | `CTABanner` | text, buttonText, color, bgColor, textColor, delay | Banner horizontal con botón CTA | Rect full-width + Text + Rect botón con Scale bounce |

### 🎮 Cat. 17 — Entretenimiento & Lifestyle (6)
Nicho: Gaming, Fitness, Recetas, Vlogs

| # | Componente | Props | Descripción | Técnica AE |
|---|---|---|---|---|
| 76 | `EmojiReaction` | emoji, x, y, triggerFrame, delay | Emoji que explota y desaparece (❤️🔥👏) | Text Layer con Scale overshoot + Opacity fade |
| 77 | `PollResults` | options (array), values (array), colors, delay | Encuesta con barras horizontales | Rects con Scale X stagger + porcentajes como Text |
| 78 | `RecipeStepCard` | stepNumber, instruction, bgColor, textColor, delay | Paso de receta numerado | Círculo numerado + Rect + Text |
| 79 | `AchievementBadge` | title, icon, color, bgColor, delay | Logro desbloqueado estilo gaming | Rect con bordes dorados + Text + Scale overshoot |
| 80 | `RatingSlider` | value, maxValue, color, bgColor, label, delay | Slider visual (ej: 8.5/10) | Rect track + Rect fill con Scale X proporcional |
| 81 | `SocialProofCounter` | count, label, icon, color, delay | "12,847 usuarios activos" con número subiendo | CounterNumber + Label + icono SVG simple |

---

## RESUMEN DE PLAN

| Categoría | Existentes | Nuevos | Total |
|---|---|---|---|
| Tipografía | 4 | 0 | 4 |
| Fondos | 6 | 0 | 6 |
| UI Mockups | 4 | 0 | 4 |
| Data Viz | 3 | 6 | 9 |
| Formas | 2 | 0 | 2 |
| Transiciones | 4 | 0 | 4 |
| VFX/Social | 3 | 0 | 3 |
| E-Commerce | 4 | 0 | 4 |
| Interfaces | 4 | 0 | 4 |
| Dev Tools | 0 | 6 | 6 |
| Podcast/Audio | 0 | 6 | 6 |
| News/Sports | 0 | 6 | 6 |
| Data Viz Avanzado | 0 | 6 | 6 |
| Geografía | 0 | 5 | 5 |
| Educación | 0 | 6 | 6 |
| Branding | 0 | 6 | 6 |
| Entretenimiento | 0 | 6 | 6 |
| **TOTAL** | **34** | **47** | **81** |

---

## ANIMACIONES Y EFECTOS DISPONIBLES

### Entradas (Entrance Animations)
| Efecto | Técnica Remotion | Técnica AE | Usado en |
|---|---|---|---|
| Bounce In | `spring({ damping: 12 })` | Position Y con Bezier overshoot | ProductCardReveal, TinderSwipeCard |
| Fade In | `interpolate(frame, [0,10], [0,1])` | Opacity keyframes 0→100 | FeatureChecklist, TextReveal |
| Scale Pop | `spring({ stiffness: 200 })` | Scale 0→120→100 | ShoppingCartBadge, SubscribeButton |
| Slide Up | `interpolate` en translateY | Position Y de abajo hacia arriba | TextReveal (animation="slide_up") |
| Typewriter | `substring(0, charIndex)` | `sourceText` expression | Typewriter, SearchEngineTyping |
| Draw On | `strokeDashoffset` | Trim Paths End 0→100 | FeatureChecklist, CalendarDatePop |

### Efectos Continuos (Sustained)
| Efecto | Técnica Remotion | Técnica AE | Usado en |
|---|---|---|---|
| Float | `Math.sin(frame/15) * 10` | Position expression `Math.sin(time)` | ProductCardReveal |
| Rotate | `frame * speed` | Rotation expression `time * N` | FloatingBlobs, RaysOfLight |
| Pulse | `1 + Math.sin(frame) * 0.05` | Scale expression wiggle | SoundWaveCircle |
| Progress | `interpolate(frame, [0, duration], [0, 100])` | Scale X keyframes 0→100 | MusicPlayerUI, SocialProgressBar |
| Glitch | RGB offset + opacity flicker | Wiggle expressions en Position/Opacity | GlitchTitle, GlitchTransition |

### Transiciones (Scene Changes)
| Efecto | Técnica Remotion | Técnica AE | Usado en |
|---|---|---|---|
| Zoom Blur | Scale + blur | Radial Blur efecto | ZoomBlurTransition |
| Wipe | Rect con translateX | Position X con Bezier | WipeTransition |
| Light Leak | Gradient overlay + opacity | Shape Layer con blur + opacity | LightLeakTransition |
| Glitch Cut | Random offset + invert | Mosaic + Invert + Wiggle | GlitchTransition |
| Split | 4 panels scale down | Scale 100→49.5 + Position to corners | SplitScreenGrid |

### VFX Globales (Adjustment Layers)
| Efecto | Prop | Técnica AE |
|---|---|---|
| Film Grain | grainIntensity | Add Noise effect |
| VHS / Chromatic | chromaticAmount | Shift Channels |
| Lens Curve | vignetteIntensity | Optics Compensation |
| Vignette | vignetteIntensity | Ellipse con mask invertida |

---

## PRIORIDADES DE IMPLEMENTACIÓN

### Sprint 1 (Próximo): Dev Tools + Podcast (12 componentes)
Son los nichos con mayor demanda en el mercado de Video Ads SaaS.

### Sprint 2: News + Data Viz Avanzado (12 componentes)
Amplían la oferta hacia contenido informativo y financiero.

### Sprint 3: Educación + Branding (12 componentes)
Consolidan el producto para el mercado corporativo y de e-learning.

### Sprint 4: Geografía + Entretenimiento (11 componentes)
Cubren nichos especializados de alto valor (travel, gaming, lifestyle).

---

## ARQUITECTURA FUTURA: COMPONENTES DINÁMICOS GENERADOS POR IA

Para implementar la creación de componentes por usuarios en tiempo real (Nivel 3), se requiere abordar tanto el frontend web como el backend de After Effects.

### 1. Previsualización Dinámica en Web (Inmediata)
No necesitamos reconstruir toda la plataforma web con `vite build` para previsualizar código nuevo. Podemos usar el enfoque de **Evaluación Dinámica de JSX**:
- El navegador carga `@babel/standalone`.
- Cuando la IA genera el texto de un componente React (ej. `CoffeeBeans.tsx`), el frontend toma ese string de código, lo transpila con Babel a JavaScript puro y lo evalúa en un envoltorio usando `new Function()`.
- Remotion inyectaría los hooks `useCurrentFrame` en este entorno, permitiendo previsualizar el componente de forma **instantánea**.

### 2. El Cuello de Botella de After Effects (El verdadero reto)
El diferenciador core de AnimaFlow es su sistema de **Doble Exportación**. Actualmente, cuando renderizamos en AE, no ejecutamos React. Nuestro backend Python traduce componentes conocidos a **ExtendScript (JavaScript de After Effects)**. 
Si un usuario crea un componente en React de forma dinámica, After Effects **no sabrá cómo renderizarlo** a menos que la IA genere 3 cosas simultáneamente:
1. El código React (`.tsx`) para Remotion.
2. La lógica de extracción de propiedades en Python (`parsers/tsx/components.py`).
3. El código de dibujo de After Effects en ExtendScript (`ae_export/deterministic/components_generator.py`).

### Solución Propuesta (Fase de Implementación)
1. **Entorno Sandboxed**: La IA generará el `.tsx` y un bloque `.jsx` (ExtendScript) asociado.
2. **Evaluación Aislada**: El backend recibirá este script en Python y usará `eval()` en un entorno seguro o inyectará el bloque de código al archivo final `.jsx` que se envía a After Effects.
3. **Galería Comunitaria**: Los mejores componentes, tras ser validados manualmente por el Administrador, se "nativizan", es decir, se integran oficialmente al código fuente de la plataforma.
