# After Effects Shape Layer - Estructura Correcta y Fixes

**Fecha:** 2026-05-16  
**Estado:** Temporal (borrar después de confirmar fixes)  
**Referencia:** `after-effects-scripting-guide-master/docs/matchnames/layer/shapelayer.md`

---

## Estructura Correcta de un Shape Layer

Según la documentación oficial de After Effects, la jerarquía correcta es:

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
var shapeLayer = comp.layers.addShape();
shapeLayer.name = "MyShape";

// 1. Crear grupo de nivel superior
var group = shapeLayer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");

// 2. Acceder al contenedor de vectores (OBLIGATORIO)
var vg = group.property("ADBE Vectors Group");

// 3. Agregar shapes, fills, strokes DENTRO de vg
var pathShape = vg.addProperty("ADBE Vector Shape - Group");
var fill = vg.addProperty("ADBE Vector Graphic - Fill");
var stroke = vg.addProperty("ADBE Vector Graphic - Stroke");

// 4. Configurar propiedades
pathShape.property("ADBE Vector Shape").setValue(shapeObj);
fill.property("ADBE Vector Fill Color").setValue([R, G, B]);
stroke.property("ADBE Vector Stroke Color").setValue([R, G, B]);
stroke.property("ADBE Vector Stroke Width").setValue(2);
```

---

## Match Names Correctos (verificados en shapelayer.md)

| Elemento | Match Name Correcto | Sección en doc |
|----------|---------------------|----------------|
| Shape Layer | `ADBE Vector Layer` | Layer |
| Contents (root) | `ADBE Root Vectors Group` | Contents |
| Group | `ADBE Vector Group` | Group |
| Contents (dentro de Group) | `ADBE Vectors Group` | Group |
| Path | `ADBE Vector Shape - Group` | Path |
| Ellipse | `ADBE Vector Shape - Ellipse` | Ellipse |
| Rect | `ADBE Vector Shape - Rect` | Rectangle |
| Fill | `ADBE Vector Graphic - Fill` | Fill |
| Stroke | `ADBE Vector Graphic - Stroke` | Stroke |
| Trim Paths | `ADBE Vector Filter - Trim` | Trim Paths |
| Transform (group) | `ADBE Vector Transform Group` | Group |
| Fill Color | `ADBE Vector Fill Color` | Fill |
| Stroke Color | `ADBE Vector Stroke Color` | Stroke |
| Stroke Width | `ADBE Vector Stroke Width` | Stroke |
| Ellipse Size | `ADBE Vector Ellipse Size` | Ellipse |
| Rect Size | `ADBE Vector Rect Size` | Rectangle |
| Rect Roundness | `ADBE Vector Rect Roundness` | Rectangle |

---

## Objecto Shape (new Shape())

Según `shape.md`, el objeto Shape se crea así:

```javascript
var s = new Shape();
s.vertices = [[x1,y1], [x2,y2], [x3,y3]];
s.inTangents = [[0,0], [0,0], [0,0]];
s.outTangents = [[0,0], [0,0], [0,0]];
s.closed = true; // o false
```

### Para Paths
```javascript
s.vertices = item.vertices;
s.inTangents = item.inTangents || [[0,0],[0,0],[0,0]];
s.outTangents = item.outTangents || [[0,0],[0,0],[0,0]];
s.closed = item.closed || false;
```

### Para Líneas (convertir x1,y1,x2,y2 a vertices)
```javascript
s.vertices = [[item.x1, item.y1], [item.x2, item.y2]];
s.inTangents = [[0,0], [0,0]];
s.outTangents = [[0,0], [0,0]];
s.closed = false;
```

### Para Círculos (usar Ellipse, NO Shape)
```javascript
// NO usar new Shape() para círculos
var ellipse = vg.addProperty("ADBE Vector Shape - Ellipse");
ellipse.property("ADBE Vector Ellipse Size").setValue([diametro, diametro]);
```

---

## Errores Comunes y Fixes

### Error 1: "No se puede agregar una propiedad con el nombre 'ADBE Vectors Group'"

**Causa:** Intentar agregar `ADBE Vectors Group` con `addProperty()` cuando ya existe.

**Fix:** Usar `.property()` para acceder, no `.addProperty()`:
```javascript
// ❌ INCORRECTO:
var vg = group.addProperty("ADBE Vectors Group");

// ✅ CORRECTO:
var vg = group.property("ADBE Vectors Group");
```

### Error 2: "No se puede agregar una propiedad con el nombre 'ADBE Vector Fill'"

**Causa:** Agregar fill/stroke directamente al `ADBE Vector Group` sin acceder al `ADBE Vectors Group` intermedio.

**Fix:** Siempre acceder a `vg` primero:
```javascript
// ❌ INCORRECTO:
var fill = group.addProperty("ADBE Vector Fill");

// ✅ CORRECTO:
var vg = group.property("ADBE Vectors Group");
var fill = vg.addProperty("ADBE Vector Graphic - Fill");
```

### Error 3: "No se puede establecer 'vertices'. El valor no está definido"

**Causa:** Intentar acceder a `item.vertices` cuando el elemento es de tipo `"line"` (usa `x1, y1, x2, y2`).

**Fix:** Separar el manejo de `path` y `line`:
```javascript
if (item.type === "path") {
    s.vertices = item.vertices;
    s.inTangents = item.inTangents;
    s.outTangents = item.outTangents;
    s.closed = item.closed;
} else if (item.type === "line") {
    s.vertices = [[item.x1, item.y1], [item.x2, item.y2]];
    s.inTangents = [[0,0], [0,0]];
    s.outTangents = [[0,0], [0,0]];
    s.closed = false;
}
```

### Error 4: Match names incorrectos

| Incorrecto | Correcto |
|------------|----------|
| `ADBE Vector Fill` | `ADBE Vector Graphic - Fill` |
| `ADBE Vector Stroke` | `ADBE Vector Graphic - Stroke` |
| `ADBE Vector Trim` | `ADBE Vector Filter - Trim` |
| `ADBE Vectors Group` (addProperty) | `ADBE Vectors Group` (property) |

---

## Post-Processing Rules (pipeline.py)

Reglas aplicadas automáticamente al output del LLM:

| Regla | Qué fixea |
|-------|-----------|
| `a)` | Elimina `randomRange()` duplicadas |
| `b)` | `layers.length` → `layers.numLayers` |
| `c)` | `ADBE Rotation` → `ADBE Rotate Z` |
| `d)` | Comenta `createPath()` si se coló |
| `e)` | Fix comillas sin cerrar en `.property("...))` → `.property("..."))` |
| `f)` | Renombra `generateRandomNumber` → `randomRange` (evita conflicto con built-in de AE) |
| `g)` | Normaliza `randomRange(min, max)` — LLM a veces genera sin parámetros |
| `h)` | Fix `s.closed = item.closed` → fallback a `false` si undefined |

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `backend/app/services/pipeline.py` | Prompt ejemplo actualizado + reglas de post-processing + estructura completa en prompt |
| `backend/app/services/ae_export.py` | 7 funciones corregidas con estructura correcta + parámetro `force` para regenerate |
| `backend/app/api/exports.py` | Query param `force` agregado al endpoint |
| `prueba-para-ae/script.jsx` | Script de test corregido |

---

## Fix: Regenerate que no regeneraba (2026-05-16)

### Problema
El botón "Regenerate" no regeneraba nada porque `generate_ae_export_async` saltaba escenas que ya tenían `ae_script_code` (línea 897-901).

### Solución
Agregado parámetro `force: bool = False` a `generate_ae_export_async()`:
- Si `force=True`, limpia todos los `ae_script_code` existentes antes del loop
- Endpoint: `POST /api/jobs/{id}/export/after-effects?force=true`

### Archivos
| Archivo | Cambio |
|---------|--------|
| `backend/app/services/ae_export.py` | `def generate_ae_export_async(job_id: str, force: bool = False)` + bloque `if force:` |
| `backend/app/api/exports.py` | `force: bool = False` como query param, pasado al `queue.enqueue()` |
| `frontend/src/App.tsx` | Botón "Regenerar" ahora envía `?force=true` (línea 342) |

### Flujo
| Acción | Endpoint | Comportamiento |
|--------|----------|----------------|
| Export normal | `POST /jobs/{id}/export/after-effects` | Salta escenas con script existente |
| Regenerate | `POST /jobs/{id}/export/after-effects?force=true` | Limpia y regenera TODO |

---

## Próximos Pasos

1. ✅ Aplicar fixes a `prueba-para-ae/script.jsx`
2. ✅ Aplicar fixes a `backend/app/services/ae_export.py`
3. ✅ Actualizar prompt en `backend/app/services/pipeline.py`
4. ⏳ Probar `script.jsx` corregido en After Effects 2026
5. ⏳ Si funciona, regenerar script desde backend
6. ⏳ Verificar shapes visibles con fills/strokes correctos
7. 🗑️ Borrar este documento temporal

---

## Errores de Texto Identificados (2026-05-16)

### Error: fontStyle es readOnly

**Síntoma:** "No se puede establecer 'fontStyle'. Es un atributo readOnly"

**Causa:** Según `textdocument.md:859`, `fontStyle` es read-only en After Effects scripting.

**Fix:** Usar `fauxBold = true` en lugar de `fontStyle = "Bold"`:
```javascript
// ❌ INCORRECTO:
td.fontStyle = "Bold";

// ✅ CORRECTO:
td.fauxBold = true;
```

**Referencia:** `after-effects-scripting-guide-master/docs/text/textdocument.md:604-630`

### Error: Texto en una sola línea (sin auto-wrap)

**Síntoma:** El texto largo aparece en una sola línea infinita en AE, cuando en el frontend se muestra en 2-3 líneas.

**Causa:** `comp.layers.addText()` crea "point text" que NO hace auto-wrap. `boxText` es read-only, no se puede convertir programáticamente.

**Fix:** El LLM debe insertar `\n` en los mismos puntos de quiebre que el TSX:
```javascript
// TSX muestra texto en 2 líneas por limitación de ancho CSS:
var txt = comp.layers.addText("Tus plantas limpian el aire\ny reducen el estrés.");
```

**Regla agregada al prompt (línea 367):**
```
7. TEXTO: Analiza el TSX para ver cómo se muestra el texto (cuántas líneas, saltos naturales). 
   Replica los mismos saltos de línea en AE usando \n.
```

### Error: generateRandomNumber es built-in de AE

**Síntoma:** "No se puede llamar a 'generateRandomNumber' porque la llamada requiere 0 parámetros"

**Causa:** `generateRandomNumber()` es una función built-in de After Effects (desde CC 2015) que retorna un float `[0..1]` sin parámetros. El LLM generaba una función custom con el mismo nombre.

**Fix:** Renombrar a `randomRange(min, max)`:
```javascript
function randomRange(min, max) {
    return min + (Math.random() * (max - min));
}
```

**Post-processing regla `f)`:** Renombra automáticamente `generateRandomNumber` → `randomRange`

**Referencia:** `after-effects-scripting-guide-master/docs/general/globals.md:64-94`

### Error: closed undefined en Shape

**Síntoma:** "No se puede establecer 'closed'. El valor no está definido"

**Causa:** Elementos de tipo `"line"` no tienen propiedad `closed` en el geometry array, pero el código intenta asignar `s.closed = item.closed` → undefined.

**Fix:** Fallback a `false`:
```javascript
s.closed = item.closed !== undefined ? item.closed : false;
```

**Post-processing regla `h)`:** Fix automático

---

## Resumen Completo de Post-Processing Rules

| Regla | Qué fixea |
|-------|-----------|
| `a)` | Elimina `randomRange()` duplicadas |
| `b)` | `layers.length` → `layers.numLayers` |
| `c)` | `ADBE Rotation` → `ADBE Rotate Z` |
| `d)` | Comenta `createPath()` si se coló |
| `e)` | Fix comillas sin cerrar en `.property("...))` → `.property("..."))` |
| `f)` | Renombra `generateRandomNumber` → `randomRange` (evita conflicto con built-in de AE) |
| `g)` | Normaliza `randomRange(min, max)` — LLM a veces genera sin parámetros |
| `h)` | Fix `s.closed = item.closed` → fallback a `false` si undefined |
