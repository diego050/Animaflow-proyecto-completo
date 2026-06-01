# Video Style System — Complete Documentation (Phases 1-31)

**Fecha:** 1 de Junio de 2026
**Tipo:** Architecture Decision Record
**Estado:** Implementado (Fase 1-31)
**Owner:** AnimaFlow Team

---

## Resumen Ejecutivo

Se implementó un sistema completo de estilos declarativos y componentes de video para AnimaFlow, permitiendo que la IA genere escenas de video frame-accurate con 24 componentes pre-construidos, sistema de layout flexbox/grid, 30+ propiedades de estilo, y export a After Effects.

---

## 1. Layout System (Fases 1-2, 8-9)

### Flexbox
- `layout: "flex"` con `direction: "row" | "column"`
- `justifyContent`: flex-start, center, space-between, space-around, space-evenly
- `alignItems`: flex-start, center, stretch, baseline
- `gap`: spacing entre hijos
- `flex`: factor de crecimiento proporcional

### Grid
- `layout: "grid"` con `gridCols`, `gridRows`
- Auto-cálculo de filas cuando `gridRows` no se especifica
- `justifyContent` y `alignItems` para alineación dentro de celdas
- Compatible con padding y spacing

### Absolute Positioning
- `position: "absolute"` con `top`, `right`, `bottom`, `left`
- Para overlays y elementos flotantes

### Spacing
- `padding`: single value o [top, right, bottom, left]
- `margin`: single value o [top, right, bottom, left]
- Normalización CSS-style: 1 valor → 4 iguales, 2 → vertical/horizontal, 4 → top/right/bottom/left

---

## 2. LayerStyle System (Fases 1-2, 4-6)

30+ propiedades de estilo organizadas en 9 categorías:

| Categoría | Propiedades |
|---|---|
| **Spacing** | `padding`, `margin` |
| **Borders** | `borderWidth`, `borderColor`, `borderStyle`, `borderRadius` |
| **Effects** | `boxShadow`, `opacity`, `blur`, `backdropBlur` |
| **Filters** | `brightness`, `contrast`, `saturate`, `grayscale`, `hueRotate`, `invert` |
| **Transforms** | `rotate`, `scale`, `transformOrigin` |
| **Typography** | `lineHeight`, `textShadow`, `textDecoration` |
| **Background** | `backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundOpacity` |
| **Layout** | `overflow`, `aspectRatio`, `objectFit`, `flexWrap`, `flexGrow`, `flexShrink`, `order` |
| **SVG** | `strokeLinecap`, `strokeDasharray` |

### Converters
- `layerStyleToCSS()` — Convierte LayerStyle a React.CSSProperties (Remotion)
- `_style_to_ae()` — Convierte LayerStyle a propiedades de After Effects

---

## 3. Component Registry (24 Componentes)

### UI Components (9)

| Componente | Variantes | Tamaños | Animación | Uso |
|---|---|---|---|---|
| **StyleButton** | primary, secondary, ghost, outline | sm, md, lg | Scale + fade (15f) | CTAs, "Suscríbete" |
| **StyleCard** | elevated, filled, outlined, glass | width custom | Slide-up + fade (20f) | Contenedores de info |
| **StyleBadge** | success, warning, error, info, neutral | sm, md, lg | Scale bounce (16f) | Labels, precios |
| **StyleAvatar** | solid, ring, gradient | sm, md, lg | Scale bounce (20f) | Testimonios, perfiles |
| **StyleProgressBar** | linear, circular | custom | Animate 0→value (60f) | Estadísticas, progreso |
| **StyleDivider** | solid, dashed, dotted, gradient | custom | Grow from center (20f) | Separadores |
| **StyleChip** | filled, outlined, soft | sm, md, lg | Scale + fade (12f) | Tech stacks, filtros |
| **StyleTextBlock** | heading, body, caption, quote | width custom | Fade + slide-up (15f) | Títulos, descripciones |
| **StyleCallout** | arrow, circle, highlight | custom | Slide + fade (15f) | Anotaciones, tutoriales |

### Media Components (3)

| Componente | Variantes | Tamaños | Animación | Uso |
|---|---|---|---|---|
| **StyleWatermark** | icon, image | custom | Fade-in (20f) | Branding, logos |
| **StyleVideoPlayer** | pip, fullscreen, inline | sm, md, lg | Scale + fade (15f) | B-roll, PiP |
| **AnimaImage** | (primitiva) | custom | N/A | Imágenes con filtros |

### Chart Components (6)

| Componente | Variantes | Animación | Uso |
|---|---|---|---|
| **StyleBarChart** | vertical, horizontal | Bars grow 0→value (30f) | Comparaciones, rankings |
| **StyleLineChart** | line + dots + grid | Path draw (40f) | Tendencias, growth |
| **StylePieChart** | pie, donut | Slices stagger (20f) | Porcentajes, distribución |
| **StyleBarRace** | horizontal race | Bars grow + reorder | Rankings, competencias |
| **StyleFunnelChart** | conversion stages | Staggered stages (8f each) | Embudos de conversión |
| **StyleRadarChart** | radar/spider | Points stagger (5f each) | Análisis multi-eje |

### Motion Effects (7)

| Componente | Variantes | Animación | Uso |
|---|---|---|---|
| **StyleAnimateNumber** | number, currency, %, compact | Count 0→value (60f) | Estadísticas, métricas |
| **StyleScrambleText** | decode effect | Char-by-char reveal | Tech intros, suspense |
| **StyleTicker** | horizontal scroll | Linear infinite loop | Breaking news, crypto |
| **StyleSimulatedHover** | button, card, link | Scale + shadow pulse | Demos de producto |
| **StyleFakeScroll** | scroll container | Linear scroll + scrollbar | Feeds, testimonios |
| **StyleCursor** | pointer + ripple | Path + click animation | Tutoriales, demos |
| **Improved Springs** | gentle, default, snappy, bouncy, stiff, slow | N/A | F = -kx - cv formula | Animaciones naturales, orgánicas |

---

## 4. After Effects Export

### Style → AE Mapping
| LayerStyle | AE Property |
|---|---|
| `borderWidth` | `strokeWidth` |
| `borderColor` | `strokeColor` |
| `borderRadius` | `roundedCorner` |
| `boxShadow` | `dropShadow` |
| `opacity` | `opacity` (0-1 → 0-100) |
| `blur` | `fastBlur` |
| `backdropBlur` | `compoundBlur` |
| `brightness` | `brightness` |
| `contrast` | `contrast` |
| `saturate` | `saturation` |
| `grayscale` | `tint` |
| `hueRotate` | `hueShift` |
| `rotate` | `rotation` |
| `scale` | `scale` [x, y] |
| `lineHeight` | `leading` |
| `textShadow` | `textDropShadow` |
| `overflow: hidden` | `trackMatte: alpha` |

### Component → AE Mapping
| Componente | AE Implementation |
|---|---|
| StyleBarChart | Shape layers con Rectangle Path animado |
| StylePieChart | Shape layers con Ellipse Path + Trim Paths |
| StyleLineChart | Shape layer con Path + Trim Paths |
| StyleVideoPlayer | Footage Layer import via ImportOptions |
| StyleWatermark | Shape layer con opacity transform |
| StyleCallout | Shape layer + Text layer |
| StyleAnimateNumber | Text layer con Source Text keyframes |
| StyleScrambleText | Text layer con scramble effect |
| StyleTicker | Text layer con Position keyframes |
| StyleSimulatedHover | Scale keyframes simulando hover pulse |
| StyleFakeScroll | Shape container + text layers con Position |
| StyleCursor | Shape layer con Position + Scale keyframes |
| StyleBarRace | Shape layers con width proporcional |
| StyleFunnelChart | Shape layers con width proporcional |
| StyleRadarChart | Shape layer con stroke/fill |

---

## 5. Testing

### Backend Tests
- 30 tests en `backend/tests/test_layout_solver.py`
- Cobertura: flex row/column, grid 2x2, auto-rows, padding, centered items, spacing resolution

### Playground Examples (25 total)
1. Card con Padding y Borde
2. Badge con Padding Asimétrico
3. Grupo con Flex y Padding
4. Imagen con Filtros
5. Texto con Sombra y Decoración
6. StyleButton CTA
7. StyleCard Container
8. StyleBadge Label
9. StyleAvatar (3 variantes)
10. StyleProgressBar (linear + circular)
11. StyleDivider (4 variantes)
12. Grid Layout (2x2)
13. StyleChip (Tags)
14. StyleTextBlock (4 variantes)
15. Full Composition (9 componentes)
16. StyleCallout (Annotations)
17. StyleWatermark (Branding)
18. StyleCharts (Data Viz)
19. Full Dashboard (15 componentes)
20. StyleAnimateNumber (Counters)
21. ScrambleText + Ticker
22. Simulated Hover + Fake Scroll + Cursor
23. StyleBarRace (Rankings)
24. StyleFunnelChart (Conversion)
25. StyleRadarChart (Multi-axis)
26. Improved Spring Physics — 4 badges comparando presets (gentle, snappy, bouncy, stiff)
27. Layout Transitions — 2 avatars con transiciones suaves entre posiciones

---

## 6. Archivos del Proyecto

| Archivo | Propósito |
|---|---|
| `backend/app/schemas/spec.py` | Pydantic schemas (LayerStyle, AnimaLayer, componentName Literal) |
| `backend/app/services/layout_solver.py` | Python Layout Solver (flex, grid, spacing) |
| `backend/app/modules/anima_composer/ae_transformer.py` | AE JSX generator (_style_to_ae, _component_to_ae) |
| `backend/app/modules/llm/component_strategy.py` | LLM prompt con documentación de componentes |
| `frontend/src/types/spec.ts` | TypeScript interfaces (LayerStyle, AnimaLayer) |
| `frontend/src/remotion/utils/layoutSolver.ts` | TypeScript Layout Solver |
| `frontend/src/remotion/composer/AnimaComposer.tsx` | Remotion scene interpreter (layerStyleToCSS) |
| `frontend/src/remotion/registry.ts` | Component registry (24 componentes) |
| `frontend/src/remotion/components/Style*.tsx` | 24 componentes de video |
| `frontend/src/pages/admin/AnimationPlayground.tsx` | Playground con 27 ejemplos |
| `frontend/src/remotion/utils/springPhysics.ts` | Nuevo: Física de springs mejorada |
| `frontend/src/remotion/utils/layoutTransitions.ts` | Nuevo: Transiciones de layout |
| `backend/app/modules/anima_composer/ae_transformer.py` | +transitionDuration, transitionEasing, transitionSpring |
| `backend/tests/test_layout_solver.py` | 30 tests de layout |

---

## 7. Roadmap Completo

| Fase | Tarea | Estado |
|---|---|---|
| **1** | LayerStyle schema (30+ propiedades) | ✅ |
| **2** | Padding/margin en solver | ✅ |
| **3** | StyleButton, StyleCard, StyleBadge | ✅ |
| **4** | Integrar estilos en AnimaComposer | ✅ |
| **5** | Mapear estilos a AE | ✅ |
| **6** | Actualizar prompt del LLM | ✅ |
| **7** | StyleAvatar, StyleProgressBar, StyleDivider | ✅ |
| **8** | Grid layout support | ✅ |
| **9** | Responsive breakpoints (auto-adaptativo) | ✅ |
| **10** | Image component con filtros | ✅ |
| **11** | StyleChip | ✅ |
| **12** | StyleTextBlock | ✅ |
| **13** | StyleVideoPlayer | ✅ |
| **14** | StyleBarChart, StyleLineChart, StylePieChart | ✅ |
| **15** | StyleCallout | ✅ |
| **16** | StyleWatermark | ✅ |
| **17** | StyleAnimateNumber | ✅ |
| **18** | StyleScrambleText | ✅ |
| **19** | StyleTicker | ✅ |
| **20** | StyleSimulatedHover | ✅ |
| **21** | StyleFakeScroll | ✅ |
| **22** | StyleCursor | ✅ |
| **23** | StyleBarRace | ✅ |
| **24** | Improved Spring Physics | ✅ |
| **25** | Layout Transitions entre escenas | ✅ |
| **26** | StyleFunnelChart | ✅ |
| **27** | StyleRadarChart | ✅ |
| **28** | Funnel Chart | ✅ |
| **29** | Radar/Spider Chart | ✅ |
| **1-31** | Todas las fases completadas | ✅ Completado |

### 11. Improved Spring Physics (Fase 24)
Sistema de física de springs basado en la fórmula de Framer Motion:
- **Fórmula:** `F = -kx - cv` (Ley de Hooke + Amortiguamiento)
- **6 presets:** gentle (80/12/1.2), default (100/10/1), snappy (180/12/0.8), bouncy (120/6/0.6), stiff (260/20/0.9), slow (60/15/1.5)
- **generateSpringKeyframes():** Pre-calcula valores por frame para rendering determinista en Remotion
- **createSpringEasing():** Función de easing compatible con `interpolate()` de Remotion
- **Ventaja:** Movimiento más natural y orgánico vs springs básicos de Remotion

### 12. Layout Transitions (Fase 25)
Sistema que detecta cambios de posición entre escenas y genera transiciones suaves:
- **Detección automática:** Compara posiciones de elementos con mismo `id` entre escenas
- **Umbral:** Cambios >2px generan transición
- **Easing:** ease-out, ease-in-out, spring
- **Configurable:** `transitionDuration`, `transitionEasing`, `transitionSpring`
- **AE Export:** Mapea a `transitionDuration`, `transitionEasing` (Easy Ease Out, Easy Ease, Exponential Scale)

---

## 8. Decisiones de Arquitectura

### Por qué no Framer Motion
- Incompatible con Remotion (usa requestAnimationFrame, no frame-accurate)
- No determinístico (varía por CPU)
- No funciona con offline rendering
- Ya tenemos equivalente: AnimatedWrapper + interpolate() + spring()

### Por qué Flexbox/Grid sobre coordenadas absolutas
- Responsive: se adapta a diferentes aspect ratios automáticamente
- Mantenible: la IA genera estructuras de layout, no coordenadas hardcodeadas
- Reutilizable: mismos componentes funcionan en 9:16, 16:9, 1:1

### Por qué LayerStyle sobre props personalizados
- Unificado: un solo sistema de estilos para todos los componentes
- Extensible: agregar nuevas propiedades es trivial
- AE-compatible: mapeo directo a propiedades de After Effects

---

*Documento generado el 1 de Junio de 2026. Última actualización: Fase 31.*
