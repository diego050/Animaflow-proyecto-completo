# After Effects Export - Sesión Completa de Fixes (2026-05-16)

**Fecha:** 2026-05-16  
**Estado:** Documentación completa de todos los fixes aplicados  
**Referencia:** `after-effects-scripting-guide-master/`

---

## Resumen Ejecutivo

Durante esta sesión se resolvieron **16+ errores** en el pipeline de exportación a After Effects, cubriendo:
- Estructura correcta de Shape Layers
- Match names oficiales de After Effects
- Funciones built-in conflictivas
- Propiedades readOnly de TextDocument
- Regeneración forzada de scripts
- Formato de texto multi-línea

---

## 1. Estructura Correcta de Shape Layer

### Problema
Múltiples errores al crear shapes: "No se puede agregar una propiedad con el nombre 'ADBE Vectors Group'", "No se puede agregar 'ADBE Vector Fill'", etc.

### Causa
Confusión sobre la jerarquía interna de un Shape Layer en After Effects.

### Estructura Correcta (según `shapelayer.md`)
```
Shape Layer
└── ADBE Root Vectors Group (Contents)
    └── ADBE Vector Group (Group) ← addProperty("ADBE Vector Group")
        └── ADBE Vectors Group (Contents del grupo) ← .property("ADBE Vectors Group")
            ├── ADBE Vector Shape - Group (Path)
            ├── ADBE Vector Shape - Ellipse
            ├── ADBE Vector Shape - Rect
            ├── ADBE Vector Graphic - Fill
            ├── ADBE Vector Graphic - Stroke
            └── ADBE Vector Filter - Trim
```

### Patrón de Código Correcto
```javascript
var sl = comp.layers.addShape();
sl.name = "MyShape";
var g = sl.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vg = g.property("ADBE Vectors Group");  // ← OBLIGATORIO: acceder, NO agregar
var ps = vg.addProperty("ADBE Vector Shape - Group");
var f = vg.addProperty("ADBE Vector Graphic - Fill");
var st = vg.addProperty("ADBE Vector Graphic - Stroke");
```

### Archivos Modificados
| Archivo | Cambios |
|---------|---------|
| `backend/app/services/pipeline.py` | Prompt ejemplo + estructura en prompt |
| `backend/app/services/ae_export.py` | 7 funciones corregidas |
| `prueba-para-ae/script.jsx` | Script de test corregido |

---

## 2. Match Names Correctos

### Problema
Nombres incorrectos causaban errores "No se puede agregar una propiedad con el nombre..."

### Nombres Incorrectos vs Correctos
| Incorrecto | Correcto | Sección doc |
|------------|----------|-------------|
| `ADBE Vector Fill` | `ADBE Vector Graphic - Fill` | Fill |
| `ADBE Vector Stroke` | `ADBE Vector Graphic - Stroke` | Stroke |
| `ADBE Vector Trim` | `ADBE Vector Filter - Trim` | Trim Paths |
| `ADBE Vectors Group` (addProperty) | `ADBE Vectors Group` (property) | Group |

### Referencia
`after-effects-scripting-guide-master/docs/matchnames/layer/shapelayer.md`

---

## 3. generateRandomNumber → randomRange

### Problema
"No se puede llamar a 'generateRandomNumber' porque la llamada requiere 0 parámetros"

### Causa
`generateRandomNumber()` es una **función built-in de After Effects** (desde CC 2015) que retorna un float `[0..1]` sin parámetros. El LLM generaba una función custom con el mismo nombre.

### Fix
Renombrar a `randomRange(min, max)`:
```javascript
function randomRange(min, max) {
    return min + (Math.random() * (max - min));
}
```

### Post-processing Regla `f)`
Renombra automáticamente `generateRandomNumber` → `randomRange` en el output del LLM.

### Referencia
`after-effects-scripting-guide-master/docs/general/globals.md:64-94`

---

## 4. fontStyle → fauxBold

### Problema
"No se puede establecer 'fontStyle'. Es un atributo readOnly"

### Causa
Según `textdocument.md:859`, `fontStyle` es read-only en After Effects scripting.

### Fix
Usar `fauxBold = true`:
```javascript
// ❌ INCORRECTO:
td.fontStyle = "Bold";

// ✅ CORRECTO:
td.fauxBold = true;
```

### Referencia
`after-effects-scripting-guide-master/docs/text/textdocument.md:604-630`

---

## 5. Texto Multi-línea

### Problema
Texto largo aparecía en una sola línea infinita en AE, cuando en el frontend se mostraba en 2-3 líneas.

### Causa
`comp.layers.addText()` crea "point text" que NO hace auto-wrap. `boxText` es read-only.

### Fix
El LLM debe insertar `\n` en los mismos puntos de quiebre que el TSX:
```javascript
var txt = comp.layers.addText("Tus plantas limpian el aire\ny reducen el estrés.");
```

### Regla del Prompt (línea 367)
```
7. TEXTO: Analiza el TSX para ver cómo se muestra el texto (cuántas líneas, saltos naturales).
   Replica los mismos saltos de línea en AE usando \n.
```

---

## 6. Regenerate Forzado

### Problema
El botón "Regenerate" no regeneraba nada porque `generate_ae_export_async` saltaba escenas que ya tenían `ae_script_code`.

### Fix
Agregado parámetro `force: bool = False`:
- Si `force=True`, limpia todos los `ae_script_code` existentes antes del loop
- Endpoint: `POST /api/jobs/{id}/export/after-effects?force=true`

### Archivos Modificados
| Archivo | Cambio |
|---------|--------|
| `backend/app/services/ae_export.py` | `def generate_ae_export_async(job_id: str, force: bool = False)` |
| `backend/app/api/exports.py` | `force: bool = False` como query param |
| `frontend/src/App.tsx` | Botón "Regenerar" envía `?force=true` |

---

## 7. Post-Processing Rules

Reglas aplicadas automáticamente al output del LLM en `pipeline.py`:

| Regla | Qué fixea |
|-------|-----------|
| `a)` | Elimina `randomRange()` duplicadas |
| `b)` | `layers.length` → `layers.numLayers` |
| `c)` | `ADBE Rotation` → `ADBE Rotate Z` |
| `d)` | Comenta `createPath()` si se coló |
| `e)` | Fix comillas sin cerrar en `.property("...))` → `.property("..."))` |
| `f)` | Renombra `generateRandomNumber` → `randomRange` |
| `g)` | Normaliza `randomRange(min, max)` |
| `h)` | Fix `s.closed = item.closed` → fallback a `false` si undefined |

---

## 8. Shape.closed Undefined

### Problema
"No se puede establecer 'closed'. El valor no está definido"

### Causa
Elementos de tipo `"line"` no tienen propiedad `closed` en el geometry array.

### Fix
```javascript
s.closed = item.closed !== undefined ? item.closed : false;
```

### Post-processing Regla `h)`
Fix automático aplicado al output del LLM.

---

## 9. Líneas: x1,y1,x2,y2 → vertices

### Problema
El LLM intentaba acceder a `item.vertices` para elementos de tipo `"line"`, pero las líneas usan `x1, y1, x2, y2`.

### Fix
```javascript
if (item.type === "line") {
    s.vertices = [[item.x1, item.y1], [item.x2, item.y2]];
    s.inTangents = [[0,0], [0,0]];
    s.outTangents = [[0,0], [0,0]];
    s.closed = false;
}
```

### Prompt Regla 5
```
5. LÍNEAS: comp.layers.addShape(); name="Line_N"; new Shape() con vertices=[[x1,y1],[x2,y2]], inTangents=[[0,0],[0,0]], outTangents=[[0,0],[0,0]], closed=false (siempre explícito, nunca undefined)
```

---

## 10. Prompt Completo Actualizado

El prompt del LLM en `pipeline.py` ahora incluye:

1. **TEXTO DE LA ESCENA:** El texto real se inyecta en el prompt
2. **ESTRUCTURA SHAPE LAYER:** Diagrama ASCII de la jerarquía correcta
3. **MATCH NAMES:** Lista de nombres correctos
4. **REGLAS 1-9:** Todas las reglas de generación
5. **EJEMPLO COMPLETO:** Código de referencia con shapes + texto

---

## Archivos Modificados (Resumen)

| Archivo | Cambios |
|---------|---------|
| `backend/app/services/pipeline.py` | Prompt completo + 8 reglas de post-processing |
| `backend/app/services/ae_export.py` | 7 funciones corregidas + parámetro `force` |
| `backend/app/api/exports.py` | Query param `force` agregado |
| `frontend/src/App.tsx` | Botón "Regenerar" envía `?force=true` |
| `prueba-para-ae/script.jsx` | Script de test corregido completamente |

---

## Lecciones Aprendidas

1. **Siempre consultar la documentación oficial de AE** antes de asumir match names
2. **Las funciones built-in de AE** no se pueden override (generateRandomNumber)
3. **Algunas propiedades de TextDocument son readOnly** (fontStyle, boxText)
4. **Point text NO hace auto-wrap** en AE; usar `\n` explícito
5. **El post-processing es esencial** para corregir errores comunes del LLM
6. **El regenerate necesita force mode** para realmente regenerar

---

## Próximos Pasos

1. ✅ Todos los fixes aplicados
2. ✅ Fase 1: Parser de animaciones TSX implementado
3. ⏳ Probar `script.jsx` corregido en After Effects 2026
4. ⏳ Si funciona, regenerar script desde backend con `?force=true`
5. ⏳ Verificar shapes visibles con fills/strokes correctos
6. ⏳ Verificar texto en múltiples líneas con fauxBold
7. ⏳ Verificar animaciones replicadas fielmente (timing, posición, efectos)
8. 🗑️ Borrar este documento temporal cuando todo esté confirmado

---

## Fase 1: Parser de Animaciones TSX (2026-05-16)

### Problema
El LLM solo recibía geometría SVG pero no las animaciones exactas del TSX (timings, easing, transforms, efectos). Esto resultaba en ~65% de fidelidad visual.

### Solución
Creado `tsx_animation_parser.py` que extrae:

| Dato | Qué extrae | Ejemplo |
|------|------------|---------|
| `interpolate()` calls | Keyframes exactos con tiempos y valores | `leafY: [0s→1400, 2s→960]` |
| `spring()` calls | Animaciones spring con damping/stiffness | `leafScale: [0, 0%], [0.1s, 120%], [0.3s, 100%]` |
| `<g transform>` | Group transforms (translate, scale) | `translate(540, leafY) scale(leafScale)` |
| Text animation | Posición, estilo, keyframes de texto | `bottom: 15%, fontSize: 68px, fontWeight: 900` |
| Effects | Gradients, glow, dropShadow, textShadow | `feGaussianBlur stdDeviation="8"` |

### Cómo se inyecta en el prompt

```
GEOMETRÍA EXACTA EXTRAÍDA DEL SVG:
[... svg_elements ...]

ANIMACIONES EXACTAS EXTRAÍDAS DEL TSX:
{
  "animations": [
    {"variable": "leafY", "type": "positionY", "keyframes": [{"time": 0, "value": 1400}, {"time": 2, "value": 960}]},
    {"variable": "leafScale", "type": "spring", "keyframes": [{"time": 0, "value": 0}, {"time": 0.1, "value": 1.2}, {"time": 0.3, "value": 1.0}]}
  ],
  "text_animation": {
    "position": {"bottom": "15%", "left": "50%"},
    "style": {"color": "#2ecc71", "fontSize": "68px", "fontWeight": 900}
  },
  "effects": [
    {"type": "glow", "id": "glow", "stdDeviation": 8},
    {"type": "textShadow", "value": "0 0 30px rgba(46, 204, 113, 0.4)"}
  ]
}

INSTRUCCIONES:
- Replica CADA animación con setValueAtTime() usando los tiempos y valores exactos
- Para spring animations: usa keyframes [0s, 0%], [0.1s, 120%], [0.3s, 100%]
- Mantén el orden de entrada/salida de elementos como en el TSX
```

### Impacto esperado
- **Antes:** ~65% fidelidad visual (animaciones aproximadas)
- **Después:** ~80-85% fidelidad visual (animaciones exactas)

### Archivos creados/modificados
| Archivo | Cambio |
|---------|--------|
| `backend/app/services/tsx_animation_parser.py` | **NUEVO** - Parser completo de animaciones TSX |
| `backend/app/services/pipeline.py` | Integrado parser + inyección de `animation_context` en prompt |
