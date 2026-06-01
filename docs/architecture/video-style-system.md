# Video Style System — Declarative Styling for AnimaFlow

**Fecha:** 1 de Junio de 2026
**Tipo:** Architecture Decision Record
**Estado:** Implementado (Fase 1-25)

## Resumen

Se implementó un sistema de estilos declarativo para el `spec.json` de AnimaFlow, permitiendo que la IA aplique propiedades visuales (padding, margin, bordes, sombras, filtros, transforms) a cualquier capa sin necesidad de componentes personalizados.

## Problema

Antes del sistema de estilos:
- Las capas solo tenían propiedades básicas (x, y, width, height, fill, fontSize)
- No había soporte para padding, margin, bordes, sombras o filtros
- El Layout Solver no consideraba spacing al distribuir hijos flex
- Cada componente necesitaba props personalizados para estilos básicos

## Solución

### 1. LayerStyle Schema
Se creó `LayerStyle` como un modelo Pydantic (Python) e interfaz TypeScript con ~30 propiedades de estilo organizadas en categorías:

| Categoría | Propiedades |
|---|---|
| **Spacing** | `padding`, `margin` (single value o [top, right, bottom, left]) |
| **Borders** | `borderWidth`, `borderColor`, `borderStyle` |
| **Effects** | `boxShadow`, `opacity`, `blur`, `backdropBlur` |
| **Filters** | `brightness`, `contrast`, `saturate`, `grayscale`, `hueRotate`, `invert` |
| **Transforms** | `rotate`, `scale`, `transformOrigin` |
| **Typography** | `lineHeight`, `textShadow`, `textDecoration` |
| **Background** | `backgroundImage`, `backgroundSize`, `backgroundPosition`, `backgroundOpacity` |
| **Layout** | `overflow`, `aspectRatio`, `objectFit`, `flexWrap`, `flexGrow`, `flexShrink`, `order` |
| **SVG** | `strokeLinecap`, `strokeDasharray` |

### 2. Layout Solver Update
El solver ahora:
1. Extrae `padding` y `margin` del `style` de cada capa
2. Calcula el espacio disponible restando padding del contenedor
3. Distribuye hijos flex dentro del área con padding
4. Offsetea las posiciones de los hijos por padding_left y padding_top

### 3. Spacing Resolution
La función `_resolve_spacing` (Python) / `resolveSpacing` (TypeScript) normaliza valores de padding/margin:
- Single value: `20` → `[20, 20, 20, 20]`
- Two values: `[10, 20]` → `[10, 20, 10, 20]` (vertical, horizontal)
- Four values: `[10, 20, 30, 40]` → `[10, 20, 30, 40]` (top, right, bottom, left)

### 4. Video Style Components (Fase 3)
Se crearon componentes pre-construidos que usan el sistema de estilos:

| Componente | Variantes | Tamaños | Animación | Uso |
|---|---|---|---|---|
| **StyleButton** | primary, secondary, ghost, outline | sm, md, lg | Scale + fade (15 frames) | CTAs, "Suscríbete", "Link en bio" |
| **StyleCard** | elevated, filled, outlined, glass | custom | Slide-up + fade (20 frames) | Contenedores de info, agrupación |
| **StyleBadge** | success, warning, error, info, neutral | sm, md, lg | Scale bounce (16 frames) | Labels, precios, categorías |
| **StyleAvatar** | solid, ring, gradient | sm, md, lg | Scale bounce (20 frames) | Testimonios, perfiles, equipo |
| **StyleProgressBar** | linear, circular | custom | Animate 0→value (60 frames) | Estadísticas, encuestas, progreso |
| **StyleDivider** | solid, dashed, dotted, gradient | custom | Grow from center (20 frames) | Separadores, breaks visuales |
| **StyleChip** | filled, outlined, soft | sm, md, lg | Scale + fade (12 frames) | Tech stacks, filtros, categorías |
| **StyleTextBlock** | heading, body, caption, quote | width custom | Fade + slide-up (15 frames) | Títulos, descripciones, quotes |
| **StyleCallout** | arrow, circle, highlight | custom | Slide + fade (15 frames) | Anotaciones, tutoriales |
| **StyleWatermark** | icon, image | custom | Fade-in (20 frames) | Branding, logos, marcas de agua |
| **StyleVideoPlayer** | pip, fullscreen, inline | sm, md, lg | Scale + fade (15 frames) | B-roll, PiP, screen recordings |
| **StyleBarChart** | vertical, horizontal | custom | Bars grow 0→value (30 frames) | Comparaciones, rankings |
| **StyleLineChart** | line + dots + grid | custom | Path draw animation (40 frames) | Tendencias, growth, time series |
| **StylePieChart** | pie, donut | custom | Slices stagger (20 frames) | Porcentajes, distribución |
| **StyleAnimateNumber** | number, currency, percentage, compact | custom | Count 0→value (60 frames) | Estadísticas, métricas, revenue |
| **StyleScrambleText** | decode effect | custom | Char-by-char reveal | Tech intros, cybersecurity, suspense |
| **StyleTicker** | horizontal scroll | custom | Linear scroll (infinite loop) | Breaking news, crypto, stocks |
| **StyleSimulatedHover** | button, card, link | custom | Scale + shadow pulse | Demos de producto, tutoriales UI |
| **StyleFakeScroll** | scroll container | custom | Linear scroll + scrollbar | Feeds, testimonios, listas |
| **StyleCursor** | pointer + ripple | custom | Path animation + click | Tutoriales, demos, interacciones |
| **StyleBarRace** | horizontal race | custom | Bars grow + reorder | Rankings, competencias, top 10 |

Cada componente:
- Acepta `style` prop con LayerStyle overrides
- Usa `AnimatedWrapper` para animaciones de entrada
- Es compatible con Remotion y AE (vía `_style_to_ae`)
- Tiene tamaños predefinidos (sm/md/lg para Button/Badge)

### 7. Grid Layout (Fase 8)
Se agregó soporte para CSS Grid en el Layout Solver:
- `layout: "grid"` con `gridCols`, `gridRows`, `gap`
- Auto-cálculo de filas cuando `gridRows` no se especifica
- `justifyContent` y `alignItems` para alineación dentro de celdas
- Compatible con padding y spacing
- Renderizado en Remotion vía `display: grid`
- Coordenadas calculadas por solver para AE export

### 8. Chart Components (Fase 14)
Se crearon 3 componentes de visualización de datos animados:

**StyleBarChart:**
- Barras verticales u horizontales con animación staggered
- Cada barra crece desde 0 hasta su valor en 30 frames
- Soporta labels, valores, colores personalizados
- AE: Shape layers con `Rectangle Path` animado

**StyleLineChart:**
- Línea SVG con animación `stroke-dashoffset`
- Dots que aparecen con spring animation
- Grid lines opcionales, fill area con opacidad
- AE: Shape layer con `Path` + `Trim Paths` effect

**StylePieChart:**
- Sectores que aparecen uno por uno (staggered)
- Soporte para pie y donut variants
- `explodeSlice` para destacar un sector
- Leyenda automática con colores
- AE: Shape layers con `Ellipse Path` + `Trim Paths`

### 9. Media Components (Fase 13, 15, 16)
**StyleVideoPlayer:**
- Embed de video con Remotion `<Video>` component
- 3 tamaños, autoplay/loop/muted controls
- Border radius, shadow, border styling
- AE: Footage Layer import via `ImportOptions`

**StyleCallout:**
- Flecha SVG + texto que señala un área
- 3 variantes: arrow, circle, highlight
- Dirección-aware (left/right/top/bottom)
- AE: Shape layer + Text layer

**StyleWatermark:**
- Logo overlay con 5 posiciones predefinidas
- Soporte para imagen o Iconify icon
- Opacidad controlada (default 0.3)
- AE: Shape layer con opacity transform

### 10. Motion Effects (Fase 17-25)
Componentes inspirados en patrones de Framer Motion adaptados para video:

**StyleAnimateNumber:**
- Contador animado con formato configurable (número, moneda, porcentaje, compacto)
- Tabular nums para conteo suave sin saltos
- Prefijos y sufijos personalizables ($, +, %, K, M)
- AE: Text layer con `Source Text` keyframes frame por frame

**StyleScrambleText:**
- Efecto de decodificación desde caracteres aleatorios hasta el mensaje final
- Velocidad configurable (caracteres por frame)
- Set de caracteres personalizable (default: `#$%&@!?*+=^~01`)
- Modo loop para re-scramblear después de revelar
- AE: Text layer con scramble effect keyframes

**StyleTicker:**
- Texto scrolleable horizontalmente estilo noticias/bolsa
- Animación linear infinita con texto repetido
- Backdrop blur background, fuente monospace
- AE: Text layer con `Position` keyframes de derecha a izquierda

**StyleSimulatedHover:**
- Simula estado hover en un frame específico del video
- Animación de scale (1→1.05→1), shadow increase, translateY
- Variantes: button, card, link
- AE: `Scale` keyframes simulando hover pulse

**StyleFakeScroll:**
- Contenedor que simula scroll de items de abajo hacia arriba
- Scrollbar visual que se mueve proporcionalmente
- Items con icono, título y subtítulo
- AE: Shape container + text layers con `Position` keyframes

**StyleCursor:**
- Cursor SVG animado que se mueve entre puntos definidos
- Efecto ripple en puntos de click
- Scale animation para simular click (1→0.7→1)
- AE: Shape layer con `Position` + `Scale` keyframes

**StyleBarRace:**
- Gráfico de barras horizontales que compiten y se reordenan
- Barras crecen desde 0 hasta su valor con timing staggered
- Labels y valores integrados en las barras
- AE: Shape layers con width proporcional y color fill

### 5. LayerStyle → CSS Converter
Se creó `layerStyleToCSS()` en `AnimaComposer.tsx` que convierte LayerStyle a `React.CSSProperties`:
- Se aplica a las 8 primitivas (rect, circle, path, text, image, group, particles, component)
- Zero overhead cuando no hay style definido
- Combina múltiples filtros en un solo string `filter`
- Soporta backdropFilter para glassmorphism

### 6. LayerStyle → AE Converter
Se creó `_style_to_ae()` en `ae_transformer.py` que mapea LayerStyle a propiedades de After Effects:
- `boxShadow` → `dropShadow`
- `opacity` → `opacity` (0-1 → 0-100)
- `blur` → `fastBlur`
- `grayscale` → `tint`
- `overflow: hidden` → `trackMatte: alpha`

## Ejemplos de Uso

### Card con Padding y Borde
```json
{
  "type": "group",
  "layout": "flex",
  "direction": "column",
  "gap": 12,
  "style": {
    "padding": 24,
    "borderWidth": 2,
    "borderColor": "#334155",
    "borderRadius": 12,
    "boxShadow": { "x": 0, "y": 4, "blur": 12, "spread": 0, "color": "rgba(0,0,0,0.3)" }
  },
  "children": [
    { "type": "text", "text": "Título de la Card", "fontSize": 24, "fontWeight": 700 },
    { "type": "text", "text": "Descripción con padding interno", "fontSize": 16 }
  ]
}
```

### Badge con Padding Asimétrico
```json
{
  "type": "text",
  "text": "NUEVO",
  "style": {
    "padding": [6, 12, 6, 12],
    "borderRadius": 999,
    "backgroundColor": "#00FFAB",
    "color": "#0F172A",
    "fontWeight": 700
  }
}
```

### Imagen con Filtros
```json
{
  "type": "image",
  "src": "https://example.com/photo.jpg",
  "style": {
    "borderRadius": 16,
    "opacity": 0.8,
    "blur": 2,
    "saturate": 1.2,
    "boxShadow": { "x": 0, "y": 8, "blur": 24, "spread": 0, "color": "rgba(0,0,0,0.4)" }
  }
}
```

### Texto con Sombra y Decoración
```json
{
  "type": "text",
  "text": "Texto Importante",
  "style": {
    "textShadow": { "x": 2, "y": 2, "blur": 4, "color": "rgba(0,0,0,0.5)" },
    "textDecoration": "underline",
    "lineHeight": 1.5
  }
}
```

## Testing

Tests en `backend/tests/test_layout_solver.py`:
- `test_flex_row_with_padding`
- `test_flex_column_with_padding`
- `test_flex_with_asymmetric_padding`
- `test_resolve_spacing_helper`

Playground examples en `/admin/animations`:
- Card con Padding y Borde
- Badge con Padding Asimétrico
- Grupo con Flex y Padding
- Imagen con Filtros
- Texto con Sombra y Decoración
- **StyleButton (CTA)** — 2 botones con variantes primary/outline
- **StyleCard (Container)** — Card elevated con padding y boxShadow
- **StyleBadge (Label)** — 3 badges success/warning/error con stagger
- **StyleAvatar (Icon-based)** — 3 avatars (ring+badge, gradient, solid) con diferentes tamaños
- **StyleProgressBar** — Linear (73%) y circular (85%) con animación
- **StyleDivider** — 4 variantes (solid, dashed, gradient horizontal + vertical)
- **Grid Layout (2x2)** — 4 badges en grid con padding
- **StyleChip (Tags)** — 3 tech chips (React, TypeScript, Python) con variantes
- **StyleTextBlock** — 4 variantes de texto (heading, quote, body, caption)
- **Full Composition** — Escena completa combinando los 9 componentes
- **StyleCallout (Annotations)** — Card con flechas y círculos de anotación
- **StyleWatermark (Branding)** — 2 watermarks en esquinas opuestas
- **StyleCharts (Data Viz)** — BarChart + LineChart + PieChart en una escena
- **Full Dashboard** — Escena completa con los 15 componentes
- **StyleAnimateNumber (Counters)** — 3 contadores (percentage, compact, currency)
- **ScrambleText + Ticker** — 2 scramble texts + ticker de cripto
- **Simulated Hover + Fake Scroll + Cursor** — Demo completa con hover, scroll y cursor
- **StyleBarRace (Rankings)** — Top 6 frameworks con contador animado

## Archivos Modificados

| Archivo | Cambio |
|---|---|
| `backend/app/schemas/spec.py` | +LayerStyle model, +style field en BaseAnimaLayer |
| `backend/app/services/layout_solver.py` | +_resolve_spacing, _apply_flex/distribute row/column actualizados |
| `frontend/src/types/spec.ts` | +LayerStyle interface, +style field en AnimaLayer |
| `frontend/src/remotion/utils/layoutSolver.ts` | +resolveSpacing, applyFlex/distributeRow/distributeColumn actualizados |
| `backend/tests/test_layout_solver.py` | +4 tests para padding/margin |
| `frontend/src/remotion/components/StyleButton.tsx` | Nuevo: Componente Button con variantes y tamaños |
| `frontend/src/remotion/components/StyleCard.tsx` | Nuevo: Componente Card con glassmorphism |
| `frontend/src/remotion/components/StyleBadge.tsx` | Nuevo: Componente Badge pill-shaped |
| `frontend/src/remotion/registry.ts` | +3 componentes registrados |
| `frontend/src/remotion/composer/AnimaComposer.tsx` | +layerStyleToCSS(), style en todas las primitivas |
| `backend/app/modules/anima_composer/ae_transformer.py` | +_style_to_ae() para mapeo a AE |
| `backend/app/modules/llm/component_strategy.py` | +Video Style System docs en prompt |
| `frontend/src/remotion/components/StyleAvatar.tsx` | Nuevo: Avatar con anillo animado y badge |
| `frontend/src/remotion/components/StyleProgressBar.tsx` | Nuevo: Barra de progreso linear/circular |
| `frontend/src/remotion/components/StyleDivider.tsx` | Nuevo: Separador con 4 estilos |
| `backend/app/services/layout_solver.py` | +_apply_grid() para distribución 2D |
| `frontend/src/remotion/utils/layoutSolver.ts` | +applyGrid() para grid en TypeScript |
| `frontend/src/remotion/components/StyleChip.tsx` | Nuevo: Chip/tag con 3 variantes |
| `frontend/src/remotion/components/StyleTextBlock.tsx` | Nuevo: Text block con 4 variantes |
| `frontend/src/remotion/components/StyleCallout.tsx` | Nuevo: Anotación con flechas |
| `frontend/src/remotion/components/StyleWatermark.tsx` | Nuevo: Watermark/branding |
| `frontend/src/remotion/components/StyleVideoPlayer.tsx` | Nuevo: Video embed PiP |
| `frontend/src/remotion/components/StyleBarChart.tsx` | Nuevo: Bar chart animado |
| `frontend/src/remotion/components/StyleLineChart.tsx` | Nuevo: Line chart animado |
| `frontend/src/remotion/components/StylePieChart.tsx` | Nuevo: Pie/donut chart animado |
| `backend/app/modules/anima_composer/ae_transformer.py` | +_component_to_ae() para 6 componentes |
| `frontend/src/remotion/components/StyleAnimateNumber.tsx` | Nuevo: Contador animado con formatos |
| `frontend/src/remotion/components/StyleScrambleText.tsx` | Nuevo: Texto decodificado |
| `frontend/src/remotion/components/StyleTicker.tsx` | Nuevo: Ticker scrolleable |
| `frontend/src/remotion/components/StyleSimulatedHover.tsx` | Nuevo: Simulación de hover |
| `frontend/src/remotion/components/StyleFakeScroll.tsx` | Nuevo: Scroll simulado |
| `frontend/src/remotion/components/StyleCursor.tsx` | Nuevo: Cursor animado con clicks |
| `frontend/src/remotion/components/StyleBarRace.tsx` | Nuevo: Bar race chart |

## Próximas Fases

| Fase | Tarea | Estado |
|---|---|---|
| **1-25** | Todas las fases completadas | ✅ Completado |
| **26** | Improved Spring Physics | Pendiente |
| **27** | Layout Transitions entre escenas | Pendiente |
| **28** | Funnel Chart | Pendiente |
| **29** | Radar/Spider Chart | Pendiente |
