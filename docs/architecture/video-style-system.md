# Video Style System — Declarative Styling for AnimaFlow

**Fecha:** 1 de Junio de 2026
**Tipo:** Architecture Decision Record
**Estado:** Implementado (Fase 1-7)

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
Se crearon 3 componentes pre-construidos que usan el sistema de estilos:

| Componente | Variantes | Tamaños | Animación | Uso |
|---|---|---|---|---|
| **StyleButton** | primary, secondary, ghost, outline | sm, md, lg | Scale + fade (15 frames) | CTAs, "Suscríbete", "Link en bio" |
| **StyleCard** | elevated, filled, outlined, glass | custom | Slide-up + fade (20 frames) | Contenedores de info, agrupación |
| **StyleBadge** | success, warning, error, info, neutral | sm, md, lg | Scale bounce (16 frames) | Labels, precios, categorías |
| **StyleAvatar** | solid, ring, gradient | sm, md, lg | Scale bounce (20 frames) | Testimonios, perfiles, equipo |
| **StyleProgressBar** | linear, circular | custom | Animate 0→value (60 frames) | Estadísticas, encuestas, progreso |
| **StyleDivider** | solid, dashed, dotted, gradient | custom | Grow from center (20 frames) | Separadores, breaks visuales |

Cada componente:
- Acepta `style` prop con LayerStyle overrides
- Usa `AnimatedWrapper` para animaciones de entrada
- Es compatible con Remotion y AE (vía `_style_to_ae`)
- Tiene tamaños predefinidos (sm/md/lg para Button/Badge)

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

## Próximas Fases

| Fase | Tarea | Estado |
|---|---|---|
| **1-6** | Fases anteriores | ✅ Completado |
| **7** | Avatar, ProgressBar, Divider | ✅ Completado |
| **8** | Grid layout support | Pendiente |
| **9** | Responsive breakpoints por aspect ratio | Pendiente |
| **10** | Image component con filtros avanzados | Pendiente |
| **11** | Chip component | Pendiente |
| **12** | TextBlock component | Pendiente |
