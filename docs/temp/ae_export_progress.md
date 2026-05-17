# AE Export Pipeline - Progress Log (2026-05-16)

## Objetivo
Lograr ~80% de fidelidad visual en la exportación de TSX (Remotion) a After Effects ExtendScript.

## Modelo LLM
| Rol | Modelo |
|-----|--------|
| Primary | `gemini-3.1-flash` |
| Fallback | `gemini-3.1-flash-lite-preview` |

**Config:** `backend/app/core/config.py`

---

## Arquitectura: Generación en 2 Fases

### Problema Original
El LLM generaba todo en 1 llamada (~15k input → ~7k output max). Las animaciones se simplificaban o recortaban por límite de tokens.

### Solución: 2 Fases
```
Fase 1: generate_ae_structure() → ~3-6k chars (estructura estática)
  ↓
_extract_layer_names() → ["sl1", "sl2", ..., "textLayer"]
  ↓
Fase 2: generate_ae_animations() → ~1-2k chars (solo setValueAtTime)
  ↓
Ensamblaje + Post-processing → script.jsx completo
```

### Archivos
| Archivo | Función |
|---------|---------|
| `backend/app/services/pipeline.py` | `generate_ae_structure()`, `generate_ae_animations()`, `_extract_layer_names()`, `_post_process_script()`, `generate_ae_script_from_tsx()` |
| `backend/app/services/tsx_animation_parser.py` | `parse_tsx_animations()` - extrae keyframes, offsets, pixel values del TSX |
| `backend/app/services/svg_parser.py` | `parse_svg_from_tsx()` - extrae geometría SVG del TSX |
| `backend/app/services/ae_export.py` | `generate_ae_export_async()` - orquesta el pipeline RQ |

---

## Problemas Resueltos

### 1. Shape Layer Structure
**Problema:** "No se puede agregar ADBE Vectors Group"
**Solución:** Jerarquía correcta: `Root → Vector Group (addProperty) → Vectors Group (.property) → Shapes`

### 2. Match Names
**Problema:** Nombres incorrectos causaban errores
**Solución:** Nombres oficiales de AE:
- `ADBE Vector Graphic - Fill`
- `ADBE Vector Graphic - Stroke`
- `ADBE Vector Shape - Group` (Path)
- `ADBE Vector Shape - Ellipse`
- `ADBE Vector Shape - Rect`
- `ADBE Vector Filter - Trim`

### 3. Text fauxBold
**Problema:** `fontStyle` es readOnly en AE
**Solución:** Usar `fauxBold = true`

### 4. Closed Property
**Problema:** Lines no tienen `closed`, causaba error
**Solución:** Fallback `item.closed !== undefined ? item.closed : false`

### 5. Random Function
**Problema:** `generateRandomNumber` conflict con built-in de AE
**Solución:** Renombrar a `randomRange(min, max)`

### 6. Gradient Fill Crash
**Problema:** `ADBE Vector Grad Colors` es NO_VALUE, no se puede setear via script → Access Violation crash
**Solución:** Eliminar gradient fill, usar solid fill (`ADBE Vector Graphic - Fill`)

### 7. Drop Shadow Indices
**Problema:** Índices incorrectos causaban error "no es un conjunto"
**Solución:** Índices correctos de AE Drop Shadow:
- `property(3)` = Distance
- `property(4)` = Softness
- `property(5)` = Opacity

### 8. Offsets vs Posiciones Absolutas
**Problema:** `textY: [30, 0]` (offsets) usados como posiciones absolutas → texto en borde superior
**Solución:** Parser detecta `isOffset: true` cuando valores < 200 para positionY/X. Prompt Fase 2 instruye sumar a posición base.

### 9. Píxeles vs Porcentajes de Scale
**Problema:** `rippleScale: 1400` (píxeles) interpretado como 1400% scale → elemento gigante
**Solución:** Parser detecta `isPixelValue: true` cuando valores > 100 para scale. Prompt Fase 2 instruye convertir a %.

### 10. Layer Names Inventados
**Problema:** Fase 2 generaba animaciones para layers que no existían (`plant`, `sun`, `drop`)
**Solución:** `_extract_layer_names()` extrae nombres exactos de Fase 1. Prompt Fase 2 exige usar EXACTAMENTE esos nombres.

### 11. Geo Array Detection
**Problema:** LLM usaba `createShapeLayer()` helper + array `geo[]`, layers no se detectaban
**Solución:** `_extract_layer_names()` ahora detecta `{ name: "Branch_L", type: "path" }` en arrays geo

### 12. Fase 2 Output Corto
**Problema:** Fase 2 generaba 198 chars tras retry 502 → animaciones incompletas
**Solución:** Retry agresivo hasta 2 veces, usa el mejor resultado

### 13. addSolid Parámetros
**Problema:** `addSolid(color, name, w, h)` → "requiere entre 5 y 6 parámetros"
**Solución:** `addSolid(color, name, w, h, pixelAspect, duration)`

### 14. Effects API Mixta
**Problema:** `.Effects.addProperty()` vs `.property("ADBE Effect Parade").addProperty()` inconsistente
**Solución:** Post-processing unifica a `.property("ADBE Effect Parade").addProperty()`

---

## Post-Processing Rules (pipeline.py: _post_process_script)

| Regla | Qué hace |
|-------|----------|
| a | Remove duplicate randomRange/generateRandomNumber |
| b | `.layers.length` → `.layers.numLayers` |
| c | `ADBE Rotation` → `ADBE Rotate Z` |
| d | Remove `createPath()` calls |
| e | Fix unclosed quotes en `.property()` |
| f | `generateRandomNumber` → `randomRange` |
| g | Normalize randomRange function body |
| h | Fix undefined closed → false |
| i | `.Effects.addProperty` → `.property("ADBE Effect Parade").addProperty` |
| j | `ADBE Glow` → `Glo2` |
| k | `Glow Radius` → `property(3)` |
| l | `G-Fill`/`Grd Fill` → `Fill` (solid), remove Grad Colors lines |
| m | Drop Shadow indices: (5→3)=Distance, (2→4)=Softness, (1→5)=Opacity |
| n | Clean remaining gradient property references |
| o | Remove orphan Drop Shadow blocks |
| p | Fix absurd text positions (Y < 100 → sumar a base 1344) |

---

## Parser Flags (tsx_animation_parser.py)

| Flag | Condición | Instrucción AE |
|------|-----------|----------------|
| `isOffset: true` | positionY/X con valores < 200 | "SUMA offsets a posición base" |
| `isPixelValue: true` | scale con valores > 100 | "Convierte a scale %: (valor / base) * 100" |

---

## Estado Actual

### Funcionando
- ✅ Estructura de Shape Layers correcta
- ✅ Match names básicos
- ✅ Drop Shadow con índices correctos
- ✅ Text fauxBold
- ✅ addSolid 6 parámetros
- ✅ Layer names exactos (no inventados)
- ✅ Geo array detection
- ✅ Gradient Fill → Solid Fill (sin crash)
- ✅ Post-processing robusto (16 reglas)
- ✅ Retry agresivo para Fase 2
- ✅ Modelo: gemini-3.1-flash

### Pendiente de Verificar
- ⏳ Fidelidad visual real en AE (target: 80%)
- ⏳ Animaciones completas en Escena 2 (timeout 600s)
- ⏳ Drop Shadow en todos los shapes

### Conocido - No Fixable
- ❌ Gradient Fill via script (AE no lo permite) → fallback a solid fill
- ❌ 90% fidelidad (límite arquitectónico del enfoque LLM→ExtendScript)

---

## Próximos Pasos
1. Probar regenerate con `?force=true` usando gemini-3.1-flash
2. Verificar fidelidad visual en AE
3. Si ≥ 75% → seguir con el proyecto
4. Si < 75% → considerar enfoque híbrido (parser determinístico + LLM solo para animaciones)
