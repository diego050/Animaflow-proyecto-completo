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

---

## Fase 2: Generación en 2 Fases + 5 Fixes Críticos (2026-05-16)

### Problema Identificado
El LLM generaba scripts incompletos o con bugs críticos:
1. **Fase 2 falló por 502** sin retry → Escena 1 sin animaciones
2. **Layers inventados en Fase 2**: `plant`, `sun`, `drop` no existían en Fase 1
3. **Círculos con tamaño [0, 0]** → invisibles en AE
4. **`closed = false`** en paths que deberían ser cerrados
5. **Glow usaba `ADBE Glow`** en lugar de `Glo2`

### Solución: Generación en 2 Fases

**Arquitectura:**
```
generate_ae_script_from_tsx()
  ├── parse_svg_from_tsx() + parse_tsx_animations()
  ├── FASE 1: generate_ae_structure() → ~3-4k chars (estructura estática)
  ├── _extract_layer_names() → ["Branch_L", "Leaf_1", "textLayer", ...]
  ├── FASE 2: generate_ae_animations() → ~4-6k chars (solo setValueAtTime)
  ├── Ensamblaje: structure + "\n// ANIMATIONS\n" + animations
  └── _post_process_script() → script final
```

### 5 Fixes Aplicados

#### Fix 1: `_extract_layer_names()` detecta geo arrays
**Problema:** El LLM usaba `createShapeLayer()` helper + array `geo[]` con nombres de layers que no se detectaban.
**Solución:** Agregar regex para extraer `{ name: "Branch_L", type: "path", ... }` del array geo.

```python
# Antes: solo detectaba var NAME = comp.layers.addShape()
# Ahora: también detecta { name: "Branch_L", type: "path" } en arrays geo
geo_name_pattern = r'\{\s*name:\s*"([^"]+)"\s*,\s*type:'
```

#### Fix 2: Prompt Fase 2 con restricción estricta de nombres
**Problema:** El LLM inventaba nombres como `plant`, `sun`, `drop` que no existían.
**Solución:** Agregar reglas explícitas:
- "USA EXACTAMENTE los nombres de layers de la lista"
- "NO inventes nombres como 'plant', 'sun', 'drop' si no están en la lista"
- "Si una animación no tiene un layer correspondiente, IGNÓRALA"
- Agregar mapeo de propiedades (positionY → ADBE Position, etc.)

#### Fix 3: Prompt Fase 1 prohíbe círculos [0, 0] y funciones helper
**Problema:** Círculos con tamaño [0, 0] invisibles, LLM usaba funciones helper y arrays geo[].
**Solución:** Agregar reglas:
- "CÍRCULOS/ELLIPSES: NUNCA uses [0, 0] como tamaño"
- "NO uses funciones helper (createShapeLayer, etc.)"
- "NO uses arrays geo[] con loops for. Cada layer creado individualmente"

#### Fix 4: Retry con 502 en ambas fases
**Problema:** Error 502 Bad Gateway no estaba en la lista de errores retryables.
**Solución:** Agregar "502" a la lista de códigos retryables en Fase 1 y Fase 2.

```python
is_retryable = any(code in error_str for code in ["429", "500", "502", "503", ...])
```

#### Fix 5: Post-processing para Effects y Glow
**Problema:** LLM usaba `layer.property("Effects")` y `"ADBE Glow"` incorrectos.
**Solución:** Agregar reglas de post-processing:
- `layer.property("Effects")` → `layer.property("ADBE Effect Parade")`
- `"ADBE Glow"` → `"Glo2"`
- `.property("Glow Radius")` → `.property(3)`

### Funciones Nuevas/Modificadas

| Función | Cambio |
|---------|--------|
| `generate_ae_structure()` | **NUEVA** - Fase 1: estructura estática |
| `generate_ae_animations()` | **NUEVA** - Fase 2: solo animaciones |
| `_extract_layer_names()` | **MODIFICADA** - Detecta geo arrays |
| `_post_process_script()` | **MODIFICADA** - +3 reglas (Effects, Glow, Glow Radius) |
| `generate_ae_script_from_tsx()` | **REFACTORIZADA** - Orquesta 2 fases |

### Prompts Actualizados

**Fase 1 (estructura):**
- Regla 6: Círculos NUNCA [0, 0]
- Regla 7: Paths cerrados con closed=true
- Regla 8: NO funciones helper
- Regla 9: NO arrays geo[]

**Fase 2 (animaciones):**
- Regla 2: USA EXACTAMENTE nombres de la lista
- Regla 3: IGNORA animaciones sin layer correspondiente
- Regla 9: Mapeo positionY → ADBE Position con [X_fijo, Y_variable]
- Sección: MAPEO DE PROPIEDADES explícito

### Resultado Esperado
- **Antes:** ~65% fidelidad visual, animaciones faltantes, layers inexistentes
- **Después:** ~85-90% fidelidad visual, animaciones completas, layers correctos

### Próximos Pasos
1. ✅ Todos los fixes aplicados
2. ⏳ Probar regenerate con `?force=true` en After Effects 2026
3. ⏳ Verificar que todas las animaciones se apliquen correctamente
4. ⏳ Verificar que círculos sean visibles (tamaño > 0)
5. ⏳ Verificar que glow funcione correctamente
6. ⏳ Medir fidelidad visual real vs Remotion
7. 🗑️ Borrar este documento temporal cuando todo esté confirmado

---

## Fase 3: Fixes de Crash + Drop Shadow + Gradient Fill (2026-05-16)

### Problema: Crash en AE (Access Violation)
After Effects crashea al ejecutar el script con `.dmp` file.

**Causas:**
1. **Drop Shadow huérfano**: Se accede a `property("ADBE Drop Shadow")` sin haberlo creado con `addProperty`
2. **`.Effects.addProperty` vs `.property("ADBE Effect Parade").addProperty`**: APIs mixtas causan inconsistencia
3. **Gradient Colors formato incorrecto**: `[R, G, B]` en lugar de `[offset, R, G, B, offset, R, G, B]`

### Solución

#### Fix 1: Prompt Fase 1 - Reglas de efectos
```
EFECTOS (Drop Shadow, Glow, etc.):
- SIEMPRE usar: layer.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow")
- NUNCA usar: layer.Effects.addProperty()
- Drop Shadow: property(5)=Distance, property(2)=Softness, property(1)=Opacity, property(3)=Color
- Glow: property(3)=Radius, property(4)=Intensity

GRADIENT FILL:
- Usar: vg.addProperty("ADBE Vector Graphic - Grd Fill")
- Colores: property("ADBE Vector Grd Colors").setValue([offset1, R1, G1, B1, offset2, R2, G2, B2])
- Ejemplo: [0, 1.0, 0.0, 0.0, 1, 0.0, 1.0, 0.0] = rojo→verde
```

#### Fix 2: Post-processing - `.Effects.addProperty` → `.property("ADBE Effect Parade").addProperty`
Ya existía, pero ahora funciona con ambos tipos de comillas.

#### Fix 3: Post-processing - Expandir Gradient Colors
```python
# Detecta: .setValue([R, G, B]) después de ADBE Vector Grd Colors
# Convierte a: .setValue([0, R, G, B, 1, R, G, B])
```

#### Fix 4: Post-processing - Eliminar Drop Shadow huérfanos
Si `.property("ADBE Drop Shadow")` existe sin un `.addProperty("ADBE Drop Shadow")` antes, elimina el bloque completo.

### Resultado en script.jsx
| Línea | Antes | Después |
|-------|-------|---------|
| 181 | `.setValue([1.0, 0.376, 0.565])` | `.setValue([0, 1.0, 0.376, 0.565, 1, 1.0, 0.376, 0.565])` |
| 235 | `textLayer.Effects.addProperty(...)` | `textLayer.property("ADBE Effect Parade").addProperty(...)` |

### Próximos Pasos
1. ✅ Todos los fixes aplicados
2. ⏳ Probar script.jsx corregido en After Effects 2026
3. ⏳ Verificar que Drop Shadow se aplique correctamente
4. ⏳ Verificar que Gradient Fill se vea correctamente
5. ⏳ Verificar que todas las animaciones funcionen
6. ⏳ Medir fidelidad visual real vs Remotion
7. 🗑️ Borrar este documento temporal cuando todo esté confirmado

---

## Fase 4: Fixes de Fidelidad Visual + Crash (2026-05-16)

### Problemas Identificados

| # | Problema | Causa | Impacto |
|---|----------|-------|---------|
| 1 | Crash por Gradient Fill | ADBE Vector Grad Colors es NO_VALUE | Crash AE |
| 2 | Texto en borde superior | textY offsets usados como posiciones absolutas | Texto invisible |
| 3 | Hoja gigante (1400%) | rippleScale 1400px interpretado como 1400% scale | Fuera de pantalla |
| 4 | Circle_2 en [0,0] | Posicion base no aplicada | Elemento invisible |
| 5 | Sin Drop Shadow en shapes | Solo texto tiene drop shadow | Menor calidad visual |
| 6 | Animaciones faltantes Escena 2 | Fase 2 output 198 chars tras retry 502 | 7 de 9 animaciones perdidas |

### Soluciones Aplicadas

#### Fix 1: Gradient Fill -> Solid Fill
- Prompt Fase 1: Usar SOLO ADBE Vector Graphic - Fill (solido)
- Post-processing: Si detecta G-Fill/Grd Fill, convertir a Fill solido

#### Fix 2-3: Parser - Distinguir offsets vs posiciones absolutas
- Nuevos flags: isOffset (positionY/X con valores < 200), isPixelValue (scale con valores > 100)

#### Fix 4: Prompt Fase 2 - Instrucciones de coordenadas explicitas
#### Fix 5: Prompt Fase 1 - Drop Shadow en todos los shapes
#### Fix 6: Post-processing - Validar posiciones absurdas (Y < 100 -> sumar a base)
#### Fix 7: Fase 2 retry mas agresivo (hasta 2 retries si < 500 chars)

### Proximos Pasos
1. Todos los fixes aplicados
2. Probar script.jsx corregido en After Effects 2026
3. Regenerate con ?force=true para probar pipeline completo
4. Borrar este documento temporal cuando todo este confirmado
