# After Effects Export Fixes - Sesión 6 (17 Mayo 2026)

## Contexto

El script de After Effects generado por el pipeline fallaba al ejecutarse en AE 2026 con el error:
> "No se puede llamar a setValue a causa del parametro 1. El valor no es un conjunto. linea: 459"

Además, al abrir el proyecto solo se veían 2 capas (Background + Leaf_1) en lugar de las 11+ esperadas.

## Diagnóstico

Se analizaron los debug files del job `fac4ceee-d353-4ba9-a612-fb7ee65f1013` y se identificaron **5 bugs críticos**:

| # | Bug | Severidad | Impacto |
|---|-----|-----------|---------|
| 1 | Trim Paths referenciado pero NO creado | CRÍTICO | Crash en Scene 2 - detiene toda ejecución |
| 2 | Ramp Interpolation property(4) → property(5) | ALTO | Gradiente falla, post-processing conflicting |
| 3 | Shape objects sin `contiguous = true` | ALTO | `setValue(s1)` falla en AE 2026 |
| 4 | SVG parser no captura elementos dinámicos | MEDIO | Partículas, rayos de sol, gradientes perdidos |
| 5 | Prompt Fase 1 no genera todos los elementos | MEDIO | LLM omite elementos del TSX |

---

## Fixes Aplicados

### Fix 1: Shape `contiguous = true` (Requerido en AE 2026)

**Problema:** `new Shape()` en AE 2026 requiere `contiguous = true` para que `setValue()` funcione correctamente.

**Archivos modificados:**

#### `backend/app/services/pipeline.py`

**Post-processing (línea ~751):**
```python
# h-1) Add contiguous = true to all Shape objects (required in AE 2026)
script = re.sub(
    r'(var s(\d+)\s*=\s*new Shape\(\);[^;]*?s\2\.closed\s*=\s*(?:true|false));',
    r'\1; s\2.contiguous = true;',
    script
)
```

**Prompt Fase 1 (línea ~389):**
```
var s = new Shape(); s.vertices = [[0,0],[100,100]]; ... s.closed = true; s.contiguous = true;
```

Regla 11 agregada al prompt:
> CONTIGUOUS: Después de cada "sX.closed = true/false;" agrega SIEMPRE "sX.contiguous = true;" — es obligatorio en AE 2026.

#### `prueba-para-ae/script.jsx`

Todos los 8+ Shape objects actualizados:
```javascript
// Antes
s1.closed = false;
// Después
s1.closed = false; s1.contiguous = true;
```

---

### Fix 2: Trim Paths Detection + Injection

**Problema:** Las animaciones de Scene 2 referencian `ADBE Vector Trim` (efecto "dibujo" de líneas) pero la Fase 1 nunca lo crea. AE falla al acceder a una propiedad inexistente.

**Archivos modificados:**

#### `backend/app/services/pipeline.py`

**Post-processing (líneas ~823-857):**
```python
def inject_trim_paths(script_text):
    # Detecta si hay animaciones de Trim Paths
    has_trim_anim = 'ADBE Vector Trim' in script_text
    
    # Encuentra layers que usan trim animations
    trim_layers = set()
    for match in re.finditer(r'(\w+)Trim\s*=\s*\1\.property\("ADBE Root Vectors Group"\)', script_text):
        trim_layers.add(match.group(1))
    
    # Inyecta "ADBE Vector Filter - Trim" después del stroke
    for layer_var in trim_layers:
        # Inserta Trim Paths definition
        trim_code = f'''
var trim_{layer_var} = {layer_var}.property("ADBE Root Vectors Group").property("ADBE Vectors Group").addProperty("ADBE Vector Filter - Trim");
trim_{layer_var}.property("ADBE Vector Trim Start").setValue(0);
trim_{layer_var}.property("ADBE Vector Trim End").setValue(100);'''
    
    # Fix referencias: cambia sl1.property("ADBE Root Vectors Group").property(1).property("ADBE Vector Trim")
    # → trim_sl1.property("ADBE Vector Trim End")
```

**Prompt Fase 1 (líneas ~371-376):**
```
13. TRIM PATHS: Si algún elemento es una línea (type="line") o path que necesita efecto de "dibujo",
    agrega después del stroke:
    var trim = vg.addProperty("ADBE Vector Filter - Trim");
    trim.property("ADBE Vector Trim Start").setValue(0);
    trim.property("ADBE Vector Trim End").setValue(100);
```

#### `prueba-para-ae/script.jsx`

Trim Paths agregados a sl1, sl2, sl3 (líneas de Scene 2):
```javascript
// Antes
var st1 = vg1.addProperty("ADBE Vector Graphic - Stroke");
sl1.property("ADBE Transform Group").property("ADBE Position").setValue([470, 1030]);

// Después
var st1 = vg1.addProperty("ADBE Vector Graphic - Stroke");
var trim1 = vg1.addProperty("ADBE Vector Filter - Trim");
trim1.property("ADBE Vector Trim Start").setValue(0);
trim1.property("ADBE Vector Trim End").setValue(100);
sl1.property("ADBE Transform Group").property("ADBE Position").setValue([470, 1030]);
```

Animaciones corregidas:
```javascript
// Antes (falla - Trim no existe)
var sl1Trim = sl1.property("ADBE Root Vectors Group").property(1).property("ADBE Vector Trim").property("ADBE Vector Trim End");

// Después (funciona - Trim fue creado)
var sl1Trim = trim1.property("ADBE Vector Trim End");
```

---

### Fix 3: Ramp Interpolation property(4) → property(5)

**Problema:** El LLM genera `ramp.property(4).setValue(2)` para Interpolation, pero property(4) es End Color (espera array). Interpolation debe ser property(5). La regex de Softness (property(4) con valores 10-40) interfería.

**Archivos modificados:**

#### `backend/app/services/pipeline.py`

**Post-processing (línea ~788):**
```python
# m-0.5) Fix Ramp Interpolation: property(4) with value 1-2 → property(5)
# Must run BEFORE Drop Shadow Step 3 and Step 5
script = re.sub(r'\.property\(4\)\.setValue\(([12])\)', '.property(5).setValue(\\1)', script)
```

**Post-processing (líneas ~791-802):**
```python
# m-0.6) Ensure Ramp has interpolation type set (default to Linear=1 if not set)
def ensure_ramp_interpolation(script_text):
    ramp_pattern = r'(\w+)\s*=\s*\w+\.property\("ADBE Effect Parade"\)\.addProperty\("ADBE Ramp"\);'
    for match in re.finditer(ramp_pattern, script_text):
        ramp_var = match.group(1)
        if not re.search(rf'{re.escape(ramp_var)}\.property\(5\)\.setValue', script_text):
            insert_pos = match.end()
            script_text = script_text[:insert_pos] + f'\n{ramp_var}.property(5).setValue(1);' + script_text[insert_pos:]
    return script_text

script = ensure_ramp_interpolation(script)
```

#### `prueba-para-ae/script.jsx`

Líneas 56 y 263 corregidas:
```javascript
// Antes
ramp2.property(4).setValue(2);
ramp5.property(4).setValue(2);

// Después
ramp2.property(5).setValue(2);
ramp5.property(5).setValue(2);
```

---

### Fix 4: SVG Parser Mejorado

**Problema:** El SVG parser solo capturaba elementos estáticos (`<path>`, `<circle>`, `<rect>`), pero ignoraba:
- Elementos generados dinámicamente con `.map()` (partículas, rayos de sol)
- Gradientes (`<radialGradient>`, `<linearGradient>`)
- Filtros (`<filter>`, `<feGaussianBlur>`, `<feDropShadow>`)

**Archivos modificados:**

#### `backend/app/services/svg_parser.py`

**Nueva función `_expand_map_elements()` (líneas ~47-78):**
```python
def _expand_map_elements(tsx_code: str, svg_block: str) -> str:
    """
    Expand dynamic .map() patterns into concrete SVG elements.
    
    Handles patterns like:
    - {particles.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r={p.r} ... />))}
    - {[0,45,90,...].map((angle, i) => (<line key={i} transform={`rotate(${angle})`} ... />))}
    """
```

**Nueva función `_parse_gradients()` (líneas ~81-117):**
```python
def _parse_gradients(tsx_code: str) -> List[Dict[str, Any]]:
    """Parse <radialGradient> and <linearGradient> from <defs>."""
    # Retorna: type, id, stops, startColor, endColor
```

**Nueva función `_parse_filters()` (líneas ~120-151):**
```python
def _parse_filters(tsx_code: str) -> List[Dict[str, Any]]:
    """Parse <filter> elements from <defs>."""
    # Detecta: glow (feGaussianBlur), dropShadow (feDropShadow)
```

**`parse_svg_from_tsx()` actualizado (líneas ~18-40):**
```python
def parse_svg_from_tsx(tsx_code: str) -> List[Dict[str, Any]]:
    # Primero expande elementos dinámicos
    expanded_block = _expand_map_elements(tsx_code, svg_block)
    
    # Parsea todos los elementos
    elements.extend(_parse_paths(expanded_block))
    elements.extend(_parse_circles(expanded_block))
    # ...
    
    # Captura gradientes y filtros
    elements.extend(_parse_gradients(tsx_code))
    elements.extend(_parse_filters(tsx_code))
```

---

### Fix 5: Prompt Fase 1 Mejorado

**Problema:** El prompt de Fase 1 no instruía al LLM para generar TODOS los elementos del TSX, resultando en capas omitidas.

**Archivos modificados:**

#### `backend/app/services/pipeline.py`

**Prompt actualizado (líneas ~347-424):**

Nuevas reglas agregadas:
```
11. CONTIGUOUS: Después de cada "sX.closed = true/false;" agrega SIEMPRE "sX.contiguous = true;"

12. GENERA TODOS LOS ELEMENTOS: El SVG parser te proporciona TODOS los elementos visuales.
    Debes crear un shape layer para CADA UNO. Si hay 15 elementos en svg_elements,
    genera 15 shape layers. NO omitas ninguno.

13. TRIM PATHS: Si algún elemento es una línea que necesita efecto de "dibujo",
    agrega "ADBE Vector Filter - Trim" después del stroke.
```

**Gradientes mejorados:**
```
4. SI el TSX usa radialGradient → usar property(5).setValue(2) para Radial
5. SI el TSX usa linearGradient → usar property(5).setValue(1) para Linear
```

---

## Resultado Esperado

Después de aplicar todos los fixes:

| Aspecto | Antes | Después |
|---------|-------|---------|
| Capas creadas | 2 (crash) | 11+ (todas) |
| Trim Paths | Crash | Funciona |
| Ramp Gradient | Falla | Funciona |
| Shape objects | Crash en AE 2026 | Funciona |
| Partículas | No capturadas | Capturadas por parser |
| Gradientes | No capturados | Capturados por parser |
| Filtros | No capturados | Capturados por parser |

---

## Archivos Modificados

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `backend/app/services/pipeline.py` | ~751, ~788-802, ~823-857, ~347-424 | Post-processing + prompt |
| `backend/app/services/svg_parser.py` | ~18-151 | 3 nuevas funciones |
| `prueba-para-ae/script.jsx` | Múltiples | contiguous, trim, ramp fixes |

---

## Próximos Pasos

1. **Test `script.jsx`** en AE 2026 — validar que corre sin errores
2. **Regenerar job** con pipeline actualizado — validar generación automática
3. **Comparar visualmente** AE vs Remotion frontend — medir fidelidad
4. **Iterar** si hay diferencias significativas

---

## Referencias

- Debug files: `backend/storage/debug/fac4ceee-d353-4ba9-a612-fb7ee65f1013_scene_*.txt`
- TSX source: `frontend/src/remotion/generated/Scene_fac4ceee-d353-4ba9-a612-fb7ee65f1013_*.tsx`
- Job ID: `fac4ceee-d353-4ba9-a612-fb7ee65f1013`
