# Layout System — Flexbox Primitives for AnimaFlow

**Fecha:** 1 de Junio de 2026
**Tipo:** Architecture Decision Record
**Estado:** Implementado

## Resumen

Se implementó un sistema de layout basado en Flexbox para el `spec.json` de AnimaFlow, permitiendo que la IA organice elementos usando estructuras de layout (filas, columnas, superposiciones) en lugar de coordenadas absolutas hardcodeadas.

## Problema

Antes del sistema de layout:
- El LLM generaba coordenadas `x, y` absolutas para cada elemento
- Las posiciones no se adaptaban a diferentes aspect ratios
- El reformat (9:16 → 16:9) generaba layouts rotos
- No había soporte para overlays, grupos anidados o distribución flexible

## Solución

### 1. Schema Extension
Se agregaron propiedades de layout a `AnimaLayer` (Pydantic + TypeScript):

| Propiedad | Tipo | Descripción |
|---|---|---|
| `layout` | `"flex" \| "grid" \| "absolute"` | Tipo de layout |
| `direction` | `"row" \| "column"` | Dirección del flex |
| `justifyContent` | `"flex-start" \| "center" \| "space-between" \| "space-around"` | Alineación eje principal |
| `alignItems` | `"flex-start" \| "center" \| "stretch"` | Alineación eje cruzado |
| `gap` | `number` | Espaciado entre hijos |
| `flex` | `number` | Factor de crecimiento |
| `zIndex` | `number` | Orden de apilamiento |
| `position` | `"relative" \| "absolute"` | Tipo de posicionamiento |
| `top/right/bottom/left` | `number` | Offset para posición absoluta |
| `stagger` | `number` | Retraso entre animaciones de hijos |
| `exitStart` | `number` | Tiempo de inicio de animación de salida |

### 2. Layout Solver
Motor de cálculo que convierte instrucciones de layout en coordenadas absolutas:

**Archivos:**
- `backend/app/services/layout_solver.py` (Python — para AE Export)
- `frontend/src/remotion/utils/layoutSolver.ts` (TypeScript — para Remotion)

**Algoritmo:**
1. Recorre el árbol de capas recursivamente
2. Para cada grupo con `layout: "flex"`:
   - Calcula espacio disponible
   - Distribuye hijos según `direction`, `gap`, `justifyContent`, `alignItems`, `flex`
   - Asigna `x, y, width, height` absolutos
3. Para elementos con `position: "absolute"`:
   - Calcula posición relativa al padre usando `top/right/bottom/left`
4. Para elementos sin layout:
   - Convierte coordenadas basadas en centro a absolutas (backward compatibility)

### 3. Prompt Engineering
Se agregó sección de "Layout Patterns" al prompt del LLM con:
- 4 ejemplos concretos (fila, columna, overlay, absoluto)
- Lista de propiedades disponibles
- 6 reglas de uso

### 4. Frontend Rendering
`AnimaComposer.tsx` ahora:
1. Llama a `solveLayout` antes de renderizar
2. Renderiza grupos flex como `<div style={{ display: 'flex', ... }}>`
3. Usa coordenadas resueltas para todos los elementos

### 5. AE Export Integration
`ae_transformer.py` ahora:
1. Llama a `solve_layout` antes de generar el script JSX
2. Usa coordenadas absolutas calculadas para las capas de AE
3. Mantiene compatibilidad con specs antiguos

## Ejemplos de Uso

### Fila Horizontal
```json
{
  "type": "group",
  "layout": "flex",
  "direction": "row",
  "justifyContent": "space-between",
  "gap": 40,
  "children": [
    { "type": "component", "componentName": "IconifyIcon", "icon": "mdi:cat", "flex": 1 },
    { "type": "text", "text": "Los gatos son increíbles", "flex": 2 }
  ]
}
```

### Columna Vertical Centrada
```json
{
  "type": "group",
  "layout": "flex",
  "direction": "column",
  "justifyContent": "center",
  "alignItems": "center",
  "gap": 20,
  "children": [
    { "type": "component", "componentName": "PercentageRing", "value": 73 },
    { "type": "text", "text": "73% de los usuarios" }
  ]
}
```

### Overlay con Posición Absoluta
```json
{
  "layers": [
    { "type": "component", "componentName": "KineticBackground", "zIndex": 0 },
    { "type": "component", "componentName": "NotificationToast", "position": "absolute", "top": 20, "right": 20, "zIndex": 10 }
  ]
}
```

## Testing

22 tests creados en `backend/tests/test_layout_solver.py`:
- Flex row/column distribution
- Absolute positioning
- Nested groups
- Backward compatibility
- Edge cases (empty, single child, mixed strategies)

Todos los tests pasan: `22/22 passed in 0.09s`

## Impacto

| Métrica | Antes | Después |
|---|---|---|
| Posicionamiento | Coordenadas absolutas hardcodeadas | Layout flexbox dinámico |
| Responsive | Roto al cambiar aspect ratio | Automático vía solver |
| Overlays | Manual y propenso a errores | `position: absolute` nativo |
| Grupos anidados | No soportado | Soporte ilimitado de profundidad |
| AE Export | Coordenadas manuales | Coordenadas calculadas por solver |

## Archivos Modificados

| Archivo | Cambio |
|---|---|
| `backend/app/schemas/spec.py` | +16 propiedades de layout a `AnimaLayer` |
| `frontend/src/remotion/composer/AnimaComposer.tsx` | +Layout solver integration, flex rendering |
| `frontend/src/remotion/utils/layoutSolver.ts` | Nuevo: Layout Solver en TypeScript |
| `backend/app/services/layout_solver.py` | Nuevo: Layout Solver en Python |
| `backend/app/modules/llm/component_strategy.py` | +Layout patterns en prompt |
| `backend/app/modules/anima_composer/ae_transformer.py` | +Layout solver integration |
| `backend/tests/test_layout_solver.py` | Nuevo: 22 tests |

## Backward Compatibility

✅ Specs sin propiedades de layout siguen funcionando. El solver convierte coordenadas basadas en centro a absolutas automáticamente.
