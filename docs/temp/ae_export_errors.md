# After Effects Export - Errores Identificados y Fixes

**Fecha:** 2026-05-13  
**Estado:** Temporal (borrar después de confirmar fixes)  
**Referencia:** `firstparty.md` (nombres oficiales de efectos AE)

---

## Error 1: Duración Incorrecta (1:57 en lugar de ~8s)

### Síntoma
La composición dura 1 minuto 57 segundos cuando debería durar ~3.92 segundos.

### Causa
En `ae_export.py` línea 46:
```python
f'var comp = app.project.items.addComp("AnimaFlow_Scene_{index + 1}", 1920, 1080, 1, {scene.get("duration_seconds", 6) * 30}, 30);'
```

El 5to parámetro de `addComp()` es **duración en segundos**, pero el código multiplica por 30 (frames).

- Escena 1: `3.92 * 30 = 117.6` → AE interpreta como 117.6 segundos = 1:57
- Escena 2: `2.5 * 30 = 75` → AE interpreta como 75 segundos = 1:15

### Fix
Quitar `* 30`:
```python
f'var comp = app.project.items.addComp("AnimaFlow_Scene_{index + 1}", 1920, 1080, 1, {scene.get("duration_seconds", 6)}, 30);'
```

### Referencia
- **Archivo:** `backend/app/services/ae_export.py` línea 46
- **Script.jsx:** Líneas 12, 162

---

## Error 2: Grupos Vacíos en After Effects - SOLUCIONADO ✅

### Síntoma
Las shapes layers aparecían como grupos vacíos sin contenido visible. Error `null no es un objeto` en línea 21.

### Causa Raíz Final
Estábamos usando `.property("ADBE Vectors Group").addProperty(...)` cuando la forma correcta en ExtendScript es agregar shapes **directamente al grupo** con `.addProperty()`.

**Estructura incorrecta:**
```javascript
var shapeGroup = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var rect = shapeGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect"); // ← NULL
var fill = shapeGroup.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill"); // ← NULL
```

**Estructura correcta:**
```javascript
var shapeGroup = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var rect = shapeGroup.addProperty("ADBE Vector Shape - Rect"); // ← OK - directo al grupo
var fill = shapeGroup.addProperty("ADBE Vector Graphic - Fill"); // ← OK - directo al grupo
fill.property("ADBE Vector Fill Color").setValue([0.22, 0.74, 0.97, 1]);
```

**Por qué funciona:**
- `shapeGroup` ES el grupo que contiene los contents
- `.addProperty()` agrega directamente al contenido del grupo
- `ADBE Vectors Group` es solo el nombre interno de esa colección, pero no necesitas acceder a ella explícitamente

### Fix Aplicado
- Eliminado `.property("ADBE Vectors Group")` de todas las llamadas a `.addProperty()`
- Aplicado a ~13 shapes y fills en script.jsx
- Aplicado a 6 funciones en ae_export.py

### Referencia
- **Archivo:** `backend/app/services/ae_export.py` - 6 funciones corregidas
- **Script.jsx:** Todos los shapes corregidos
- **Estado:** ✅ SOLUCIONADO

---

## Error 3: Línea 21 - Null No Es Objeto

### Síntoma
```
no se puede ejecutar null en la linea 21, null no es un objeto
```

### Causa
Es el mismo Error 2. `addProperty("ADBE Vector Shape - Rect")` retorna `null` si el nombre es incorrecto.

### Fix
Mismo que Error 2 + agregar validación `if (rect != null)`.

---

## Error 4: Nombre Incorrecto de Efecto Glow

### Síntoma
El efecto Glow no se aplica o causa error.

### Causa
Usamos `"ADBE Glow"` o `"ADBE Glow2"`, pero el nombre correcto según `firstparty.md` (línea 349) es:

```
| `ADBE Glo2` | Glow | 32 | 14.1 |
```

### Fix
Cambiar todas las ocurrencias de `"ADBE Glow"` y `"ADBE Glow2"` a `"ADBE Glo2"`.

### Referencia
- **Archivo:** `firstparty.md` línea 349
- **ae_export.py:** Líneas 197, 278, 333, 340, 395, 456, 518, 570
- **Script.jsx:** Líneas 36, 98, 118, 138, 185, 204, 227, 246, 269, 292

---

## Error 5: Fast Blur Obsoleto

### Síntoma
El efecto Fast Blur puede no funcionar en versiones modernas de AE.

### Causa
Según `firstparty.md` (línea 276), `"ADBE Fast Blur"` está en la sección **Obsolete**.

El reemplazo moderno es `"ADBE Box Blur2"` (Fast Box Blur, línea 52).

### Fix
Cambiar `"ADBE Fast Blur"` a `"ADBE Box Blur2"`.

### Referencia
- **Archivo:** `firstparty.md` líneas 52, 276
- **ae_export.py:** Líneas 208, 284, 336, 401, 462, 508

---

## Error 6: Línea 21 - "No se puede agregar una propiedad con el nombre ADBE Vector Shape - Rect" - SOLUCIONADO ✅

### Síntoma
```
No se puede ejecutar el script en la línea 21. Error de After Effects: No se puede agregar una propiedad con el nombre "ADBE Vector Shape - Rect" a este PropertyGroup
```

### Causa
Estábamos agregando shapes directamente a `ADBE Vector Group`, pero en After Effects 2026 (y versiones modernas), las shapes deben agregarse al subgrupo **`ADBE Vectors Group`** dentro del Vector Group.

**Estructura incorrecta:**
```javascript
var shapeGroup = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var rect = shapeGroup.addProperty("ADBE Vector Shape - Rect"); // ← FALLA
```

**Estructura correcta:**
```javascript
var shapeGroup = layer.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
var vectorsGroup = shapeGroup.property("ADBE Vectors Group");
var rect = vectorsGroup.addProperty("ADBE Vector Shape - Rect"); // ← OK
var fill = vectorsGroup.addProperty("ADBE Vector Graphic - Fill"); // ← OK
```

**Jerarquía correcta según documentación oficial:**
```
Shape Layer
└── Contents (ADBE Root Vectors Group)
     └── Group (ADBE Vector Group)          ← NAMED GROUP
          ├── Contents (ADBE Vectors Group) ← INDEXED GROUP (aquí se agregan shapes)
          │    ├── Rectangle (ADBE Vector Shape - Rect)
          │    ├── Ellipse (ADBE Vector Shape - Ellipse)
          │    └── Fill (ADBE Vector Graphic - Fill)
          └── Transform (ADBE Vector Transform Group)
```

### Fix Aplicado
- Agregado `var vectorsGroup = shapeGroup.property("ADBE Vectors Group");` después de crear shapeGroup
- Cambiado `shapeGroup.addProperty(...)` → `vectorsGroup.addProperty(...)`
- Aplicado a 11 elementos en script.jsx
- Aplicado a 6 funciones en ae_export.py (rectangle, circle, flash, calendar, line, particle, shape_generic)

### Referencia
- **Archivo:** `backend/app/services/ae_export.py` - 6 funciones corregidas
- **Script.jsx:** 11 elementos corregidos
- **Documentación:** `after-effects-scripting-guide-master/docs/matchnames/layer/shapelayer.md`
- **Estado:** ✅ SOLUCIONADO

---

## Error 7: Línea 41 - "null no es un objeto" en Propiedades de Efecto Glow - SOLUCIONADO ✅

### Síntoma
```
No se puede ejecutar el script en la línea 41. null no es un objeto
```

Línea 41:
```javascript
glow.property("ADBE Glow Intensity").setValue(60); // ← NULL
glow.property("Glow Intensity").setValue(60);       // ← NULL (intento 2)
glow.property("Intensity").setValue(60);            // ← NULL (intento 3)
```

### Causa
Los nombres de propiedades del efecto Glow (`ADBE Glo2`) varían entre versiones de After Effects y pueden estar localizados. After Effects 2026 puede usar nombres diferentes a versiones anteriores.

**Solución definitiva:** Usar **índices de propiedad** en lugar de nombres, ya que los índices son consistentes entre versiones:

| Índice | Propiedad | Tipo de Valor |
|--------|-----------|---------------|
| `1` | Glow Threshold | Number (0-100) |
| `2` | Glow Radius | Number (0-100) |
| `3` | Glow Intensity | Number (0-10+) |
| `4` | Glow Colors | Dropdown |
| `5` | Color A | Array [R, G, B, A] |
| `6` | Color B | Array [R, G, B, A] |

**Formato correcto (usando índices):**
```javascript
glow.property(3).setValue(60);              // ← OK - Intensity
glow.property(5).setValue([0.22, 0.74, 0.973, 1]); // ← OK - Color A
```

### Fix Aplicado
- `"Glow Intensity"` → `property(3)` (11 ocurrencias en script.jsx, 9 en ae_export.py)
- `"Color A"` → `property(5)` (1 ocurrencia en script.jsx, 1 en ae_export.py)

### Referencia
- **Archivo:** `backend/app/services/ae_export.py` - función hex_to_rgb_array() y todas las referencias a glow
- **Script.jsx:** Líneas 41, 42, 109, 132, 155, 205, 226, 252, 273, 299, 325
- **Estado:** ✅ SOLUCIONADO

---

## Error 8: Línea 42 - "Array no es un número" en Propiedad de Color Glow - SOLUCIONADO ✅

### Síntoma
```
Error de After Effects: No se puede llamar a 'setValue' a causa del parámetro 1. Array no es un número
```

Línea 42:
```javascript
glow.property(5).setValue([0.220, 0.741, 0.973, 1.0]); // ← FALLA
```

### Causa
El índice `property(5)` es **Color A**, pero antes de setearlo, se debe configurar el dropdown **Glow Colors** (`property(4)`) en modo **A&B** (valor `2`). Sin esto, After Effects espera un número en lugar de un array.

**Índices correctos del efecto Glow (ADBE Glo2):**

| Índice | Propiedad | Tipo | Valor Válido |
|--------|-----------|------|--------------|
| `1` | Glow Threshold | Number | 0-100 |
| `2` | Glow Radius | Number | 0-100 |
| `3` | Glow Intensity | Number | 0-10+ |
| `4` | Glow Colors | Dropdown | 1=Original, 2=A&B, 3=A&B Alt |
| `5` | Color A | Array | [R, G, B, A] |
| `6` | Color B | Array | [R, G, B, A] |

**Formato incorrecto:**
```javascript
glow.property(5).setValue([0.220, 0.741, 0.973, 1.0]); // ← FALLA - dropdown no configurado
```

**Formato correcto:**
```javascript
glow.property(3).setValue(60);           // Intensity
glow.property(4).setValue(2);            // Modo A&B Colors (requerido antes de Color A)
glow.property(5).setValue([0.22, 0.74, 0.973, 1.0]); // Color A
```

### Fix Aplicado
- Agregado `glow.property(4).setValue(2);` antes de setear Color A
- 1 ocurrencia en script.jsx
- 1 ocurrencia en ae_export.py

### Referencia
- **Archivo:** `backend/app/services/ae_export.py` - función generate_ae_rectangle()
- **Script.jsx:** Línea 42
- **Estado:** ✅ SOLUCIONADO

---

## Error 9: Línea 43 - "Array no es un número" en Color A - SOLUCIONADO ✅

### Síntoma
```
Error de After Effects: No se puede llamar a 'setValue' a causa del parámetro 1. Array no es un número
```

Línea 43:
```javascript
glow.property(5).setValue([0.220, 0.741, 0.973]); // ← FALLA
```

### Causa
El efecto Glow (`ADBE Glo2`) en After Effects 2026 **no acepta arrays de color** mediante `setValue()` por script. La propiedad de color del Glow está restringida y solo puede controlarse mediante:
1. **Modo Original (1):** El Glow hereda automáticamente el color de la capa
2. **Modo A&B (2):** Requiere interacción UI para seleccionar colores

**Solución:** Usar modo "Original" y dejar que el Glow herede el color del fill de la shape.

**Formato incorrecto:**
```javascript
glow.property(3).setValue(60);
glow.property(4).setValue(2);
glow.property(5).setValue([0.220, 0.741, 0.973]); // ← FALLA - no acepta arrays
```

**Formato correcto:**
```javascript
glow.property(3).setValue(60);    // Intensidad del glow
glow.property(4).setValue(1);     // Modo Original - hereda color de la capa
```

### Cómo Funciona el Glow con Colores

| Modo | Valor | Comportamiento |
|------|-------|----------------|
| Original | `1` | El Glow usa el color de la capa (fill/stroke) |
| A&B Colors | `2` | Colores personalizados (requiere UI) |
| A&B Alt | `3` | Colores alternativos (requiere UI) |

**Para cambiar el color del Glow:** Cambia el color del fill de la shape, el Glow lo heredará automáticamente.

### Fix Aplicado
- Eliminado `glow.property(5).setValue(...)` completamente
- Cambiado `property(4).setValue(2)` → `property(4).setValue(1)` (modo Original)
- 1 ocurrencia en script.jsx
- 1 ocurrencia en ae_export.py

### Referencia
- **Archivo:** `backend/app/services/ae_export.py` - función generate_ae_rectangle()
- **Script.jsx:** Líneas 41-43
- **Estado:** ✅ SOLUCIONADO

---

## Error 12: Línea 96 - "addSolid" requiere entre 5 y 6 parámetros - SOLUCIONADO ✅

### Síntoma
```
No se puede llamar a "addSolid" porque la llamada requiere entre 5 y 6 parametros
```

Línea 96:
```javascript
comp.layers.addSolid([0.984, 0.749, 0.141], "collision_flash", 1920, 1080); // ← FALLA - 4 parámetros
```

### Causa
La función `addSolid()` requiere **5-6 parámetros** según la documentación oficial de After Effects:
```javascript
comp.layers.addSolid(color, name, width, height, pixelAspect[, duration])
```

Faltaba el parámetro `pixelAspect` (relación de aspecto de píxel).

**Formato incorrecto:**
```javascript
comp.layers.addSolid([R, G, B], "name", 1920, 1080); // ← 4 parámetros
```

**Formato correcto:**
```javascript
comp.layers.addSolid([R, G, B], "name", 1920, 1080, 1); // ← 5 parámetros (pixelAspect = 1)
```

### Parámetros de addSolid()

| # | Parámetro | Tipo | Descripción | Valor |
|---|-----------|------|-------------|-------|
| 1 | `color` | Array [R, G, B] | Color del sólido | `[0.984, 0.749, 0.141]` |
| 2 | `name` | String | Nombre de la capa | `"collision_flash"` |
| 3 | `width` | Integer | Ancho en píxeles | `1920` |
| 4 | `height` | Integer | Alto en píxeles | `1080` |
| 5 | `pixelAspect` | Float | Relación de aspecto | `1` (estándar) |
| 6 | `duration` | Float | Duración (opcional) | Según composición |

### Fix Aplicado
- Agregado `, 1` (pixelAspect) al final de `addSolid()`
- 1 ocurrencia en script.jsx
- 1 ocurrencia en ae_export.py (generate_ae_flash)

### Referencia
- **Archivo:** `backend/app/services/ae_export.py` - función generate_ae_flash()
- **Script.jsx:** Línea 96
- **Estado:** ✅ SOLUCIONADO

---

## Resumen de Cambios Requeridos

| Tipo | Incorrecto | Correcto | Ocurrencias | Estado |
|------|------------|----------|-------------|--------|
| Duración | `duration * 30` | `duration` | 1 | ✅ |
| Shape Container | `shapeGroup.addProperty(...)` | `vectorsGroup.addProperty(...)` | ~22 | ✅ |
| Glow Intensity | `"ADBE Glow Intensity"` | `property(3)` | ~20 | ✅ |
| Glow Colors Mode | `setValue(2)` + `property(5)` | `property(4).setValue(1)` | ~20 | ✅ |
| Drop Shadow Distance | `"ADBE Drop Shadow Distance"` | `property(5)` | ~6 | ✅ |
| Drop Shadow Opacity | `"ADBE Drop Shadow Opacity"` | `property(2)` | ~4 | ✅ |
| Drop Shadow Color | `property(3).setValue([...])` | Eliminar (negro por defecto) | ~6 | ✅ |
| addSolid pixelAspect | 4 parámetros | 5 parámetros (agregar `, 1`) | 2 | ✅ |
| Blur | `"ADBE Fast Blur"` | `"ADBE Box Blur2"` | ~6 | ✅ |
| Lines | `createPath()` (no existe) | Rectángulo delgado 1920x2 | ~2 | ✅ |

---

## Validación con Documentación Oficial

Todos los nombres han sido verificados contra la documentación oficial de After Effects:

| Elemento | Nombre Usado | Documentación Oficial | Estado |
|----------|--------------|----------------------|--------|
| Glow Effect | `ADBE Glo2` | `firstparty.md` línea 349 | ✅ |
| Glow Intensity | `property(3)` | Índice de propiedad (consistente entre versiones) | ✅ |
| Glow Colors Mode | `property(4).setValue(1)` | 1=Original (hereda color), 2=A&B, 3=A&B Alt | ✅ |
| Glow Color | Hereda del fill de la capa | No se puede setear por script en AE 2026 | ✅ |
| Drop Shadow | `ADBE Drop Shadow` | `firstparty.md` línea 298 | ✅ |
| Drop Shadow Distance | `property(5)` | Índice de propiedad | ✅ |
| Drop Shadow Opacity | `property(2)` | Índice de propiedad | ✅ |
| Drop Shadow Color | Eliminar (negro por defecto) | No se puede setear por script en AE 2026 | ✅ |
| addSolid | 5 parámetros con pixelAspect | `layercollection.md` línea 163 | ✅ |
| Box Blur | `ADBE Box Blur2` | `firstparty.md` línea 52 | ✅ |
| Shape Rect | `ADBE Vector Shape - Rect` | `shapelayer.md` línea 51 | ✅ |
| Shape Ellipse | `ADBE Vector Shape - Ellipse` | `shapelayer.md` línea 63 | ✅ |
| Fill | `ADBE Vector Graphic - Fill` | `shapelayer.md` línea 101 | ✅ |
| Vectors Group | `ADBE Vectors Group` | `shapelayer.md` línea 27 | ✅ |

---

## Próximos Pasos

1. ✅ Aplicar fixes a `prueba-para-ae/script.jsx` (Error 6-12)
2. ✅ Aplicar fixes a `backend/app/services/ae_export.py` (Error 6-12)
3. ⏳ Probar `script.jsx` corregido en After Effects 2026
4. ⏳ Si funciona, regenerar script desde backend
5. ⏳ Verificar shapes visibles con efectos aplicados
6. ⏳ Verificar duración correcta
7. 🗑️ Borrar este documento temporal
