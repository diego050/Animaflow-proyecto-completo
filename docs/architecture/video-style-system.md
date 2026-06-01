# Video Style System — Declarative Styling for AnimaFlow

**Fecha:** 1 de Junio de 2026
**Tipo:** Architecture Decision Record
**Estado:** Implementado (Fase 1+2)

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

Tests agregados en `backend/tests/test_layout_solver.py`:
- `test_flex_row_with_padding`: Verifica que padding offsetea hijos en row
- `test_flex_column_with_padding`: Verifica que padding offsetea hijos en column
- `test_flex_with_asymmetric_padding`: Verifica arrays [top, right, bottom, left]
- `test_resolve_spacing_helper`: Verifica la normalización de spacing

## Archivos Modificados

| Archivo | Cambio |
|---|---|
| `backend/app/schemas/spec.py` | +LayerStyle model, +style field en BaseAnimaLayer |
| `backend/app/services/layout_solver.py` | +_resolve_spacing, _apply_flex/distribute row/column actualizados |
| `frontend/src/types/spec.ts` | +LayerStyle interface, +style field en AnimaLayer |
| `frontend/src/remotion/utils/layoutSolver.ts` | +resolveSpacing, applyFlex/distributeRow/distributeColumn actualizados |
| `backend/tests/test_layout_solver.py` | +4 tests para padding/margin |

## Próximas Fases

| Fase | Tarea | Estado |
|---|---|---|
| **3** | Crear componentes Button, Card, Badge | Pendiente |
| **4** | Integrar componentes en AnimaComposer | Pendiente |
| **5** | Mapear estilos a AE (ae_transformer.py) | Pendiente |
| **6** | Actualizar prompt del LLM | Pendiente |
