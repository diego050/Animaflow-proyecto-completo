# Documentación de Cambios — After Effects Export

## 1. Error: `createPath` no está definida (Línea 110)

### Problema
El script generado usaba `createPath()` para crear paths SVG en After Effects:
```javascript
pathProp.property("ADBE Vector Shape").setValue(
    createPath([[0,0], [0,-120]], [[0,0],[0,0]], [[0,0],[0,0]], true)
);
```

### Causa
`createPath()` es una función de **expresiones** de After Effects, NO existe en ExtendScript (scripts .jsx).

### Solución
Usar el objeto `Shape` directamente:
```javascript
var myShape = new Shape();
myShape.vertices = [[0, 0], [0, -120]];
myShape.inTangents = [[0, 0], [0, 0]];
myShape.outTangents = [[0, 0], [0, 0]];
myShape.closed = true;
pathProp.property("ADBE Vector Shape").setValue(myShape);
```

### Referencia
- [AE Scripting Guide - Shape object](../../after-effects-scripting-guide-master/docs/other/shape.md)
- Para curvas bezier (C en SVG): ajustar `inTangents` y `outTangents` proporcionalmente a los puntos de control

---

## 2. Cambio de arquitectura: Eliminar ae_metadata

### Problema anterior
El flujo tenía una capa intermedia `ae_metadata` (JSON) que perdía información:
- Paths SVG complejos → se convertían en "círculos" y "rectángulos" genéricos
- El schema `AEElement` no soportaba `path_data`, `stroke`, `gradient`
- Dos LLMs independientes interpretaban el mismo contenido de forma distinta

### Nuevo flujo
```
ANTES:
media_query → LLM Remotion → TSX
media_query → LLM AE → ae_metadata (JSON) → ae_export.py → script.jsx

AHORA:
media_query → LLM Remotion → TSX
TSX → LLM → script.jsx directo (con new Shape() para paths)
```

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `backend/app/services/pipeline.py` | Nueva función `generate_ae_script_from_tsx()` |
| `backend/app/services/ae_export.py` | `create_ae_full_script()` usa `ae_script_code` directo |
| `backend/app/schemas/spec.py` | Agregado `ae_script_code: Optional[str]` |
| `frontend/src/types/spec.ts` | Compatible (no requiere cambios) |

### Cambios en ae_export.py
- `hex_to_rgb_array()`: Ahora limpia colores corruptos con `}` al final
- Color texto: Cambiado de `ADBE Text Fill Color 2` a `ADBE Text Fill Color`
- Fallback: Si no hay `ae_script_code`, genera desde `ae_metadata` (compatibilidad legacy)

### Cambios en pipeline.py
- `generate_ae_script_from_tsx()`: Traduce TSX → ExtendScript usando `new Shape()`
- `_process_chunks_async()`: Genera `ae_script_code` en vez de `ae_metadata`
- `_regenerate_scene_async()`: También usa el nuevo flujo
- Post-procesamiento TSX: Fix para llaves duplicadas en `Math.max()`

---

## 3. Error: `textFill` null no es un objeto (Línea 183)

### Problema
```javascript
var textFill = textLayer.property("ADBE Text Properties").property("ADBE Text Fill Color 2");
textFill.setValue([1, 1, 1]);  // Error: textFill es null
```

### Causa
La propiedad `ADBE Text Fill Color 2` no existe en After Effects.

### Solución
Usar `ADBE Text Fill Color`:
```javascript
textLayer.property("ADBE Text Properties").property("ADBE Text Fill Color").setValue([0.290, 0.871, 0.502]);
```

---

## 4. Error: textColor corrupto con `}` al final

### Problema
El LLM generaba `"textColor": "#4ade80}"` en el spec.json.

### Solución
`hex_to_rgb_array()` ahora limpia el color:
```python
hex_color = hex_color.lstrip('#').rstrip('}').strip()
```

---

## 5. Doble llave en TSX generado

### Problema
El LLM generaba código TSX inválido:
```tsx
r={Math.max(0, { Math.max(0, 300 * glowScale))}}
```

### Solución
Post-procesamiento con regex en `generate_remotion_component()`:
```python
code = re.sub(r'\{Math\.max\(0,\s*\{', '{Math.max(0, ', code)
code = re.sub(r'\)\)\}\}', '))}', code)
```

---

## 6. Aspect Ratio dinámico

### Cambios
- `backend/app/core/resolutions.py`: Nueva función `get_prompt_dimensions()`
- `backend/app/services/pipeline.py`: Todos los LLMs reciben `aspect_ratio` y dimensiones
- `backend/app/services/ae_export.py`: Todas las funciones reciben `width` y `height`
- `frontend/src/App.tsx`: Selector de aspect ratio en la UI
- `frontend/src/components/PreviewPlayer.tsx`: Dimensiones dinámicas
- `frontend/src/remotion/Root.tsx`: `calculateMetadata` dinámico
- Migración Alembic: `717efc8f1ad5_add_aspect_ratio.py`

### Aspect ratios soportados
| Ratio | Resolución | Uso |
|-------|-----------|-----|
| 9:16 | 1080x1920 | Stories/Reels/TikTok |
| 4:5 | 1080x1350 | Instagram Feed |
| 3:4 | 1080x1440 | Pinterest |
| 1:1 | 1080x1080 | Square |
| 16:9 | 1920x1080 | YouTube |

---

## 7. Error: "El objeto no es válido" al animar tamaño de elipse (Línea 35)

### Problema
```javascript
var ellipse = shapeGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
var sizeProp = ellipse.property("ADBE Vector Ellipse Size");
sizeProp.setValueAtTime(startTime, [20, 20]);  // Error: El objeto no es válido
sizeProp.setValueAtTime(startTime + (40/fps), [440, 440]);
```

### Causa
La propiedad `ADBE Vector Ellipse Size` **no soporta keyframes con `setValueAtTime()`** en ExtendScript. Retorna `null` cuando se intenta animar directamente.

### Solución
Animar la **escala del layer** en vez del tamaño de la elipse:
```javascript
// Fijar tamaño base de la elipse
ellipse.property("ADBE Vector Ellipse Size").setValue([100, 100]);

// Animar escala del layer (sí soporta keyframes)
var scaleProp = layer.property("ADBE Transform Group").property("ADBE Scale");
scaleProp.setValueAtTime(startTime, [20, 20]);
scaleProp.setValueAtTime(startTime + (40/fps), [440, 440]);
```

---

## 8. Error: `Math.random()` no funciona correctamente en ExtendScript

### Problema
```javascript
var x = 540 + (Math.random() - 0.5) * 300;  // Puede fallar o no ser aleatorio
```

### Causa
`Math.random()` tiene problemas de concurrencia en After Effects (CC 2015+) con múltiples hilos de CPU.

### Solución
Usar `generateRandomNumber()`:
```javascript
var x = 540 + (generateRandomNumber() - 0.5) * 300;
```

### Referencia
- [AE Scripting Guide - generateRandomNumber()](../../after-effects-scripting-guide-master/docs/general/globals.md#generaterandomnumber)

---

## 9. Error: Expresiones en scripts (.jsx)

### Problema
```javascript
heartScale.expression = "s = Math.sin(time * 30 * 0.15) * 5 + 100; [s, s]";
```

### Causa
Las expresiones pueden fallar o no ejecutarse correctamente cuando se asignan desde scripts .jsx, especialmente con referencias a `time` y funciones matemáticas complejas.

### Solución
Usar keyframes manuales con `setValueAtTime()`:
```javascript
// En vez de expresión sinusoidal, crear keyframes manuales
var scaleProp = layer.property("ADBE Transform Group").property("ADBE Scale");
scaleProp.setValueAtTime(0, [100, 100]);
scaleProp.setValueAtTime(0.5, [105, 105]);
scaleProp.setValueAtTime(1.0, [100, 100]);
scaleProp.setValueAtTime(1.5, [105, 105]);
scaleProp.setValueAtTime(2.0, [100, 100]);
```

---

## Resumen de reglas ExtendScript

| NO USAR | USAR EN SU LUGAR |
|---------|-----------------|
| `createPath()` | `new Shape()` con vertices, inTangents, outTangents, closed |
| `ellipse.property("Size").setValueAtTime()` | `layer.property("ADBE Scale").setValueAtTime()` |
| `Math.random()` | `generateRandomNumber()` |
| `layer.property().expression = "..."` | Keyframes manuales con `setValueAtTime()` |
| `ADBE Text Fill Color 2` | `ADBE Text Fill Color` |
| `addSolid()` para elementos | `addShape()` con ellipse/rect/path |
