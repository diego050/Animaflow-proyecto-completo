# Fix: LLM Scene Composition — Eliminar Paths, Forzar Componentes, Arreglar Posicionamiento

## Diagnóstico del Problema

Analicé a fondo todos los archivos involucrados. El problema tiene **3 raíces** independientes que se potencian entre sí:

---

### 🔴 Problema 1: El Prompt OBLIGA al LLM a Crear Primitivas

En [component_strategy.py](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/backend/app/modules/llm/component_strategy.py#L279-L313), el prompt actual dice explícitamente:

```
PASO 2 - CREA UNA FORMA CUSTOM: Basándote en el sujeto identificado, crea AL MENOS 
UNA primitiva custom (usando type: "circle", "rect", "path", o "group")

REQUISITO OBLIGATORIO: Tu composición DEBE incluir al menos UNA capa creada desde 
cero usando primitivas (rect, circle, text, group, path)
```

Y en las reglas de oro (línea 299):
```
CREA DESDE CERO CON PRIMITIVAS: No te limites solo a componentes prefabricados.
```

> [!CAUTION]
> **El prompt está literalmente forzando al LLM a crear paths SVG.** Esto es lo opuesto de lo que quieres. El LLM ve "REQUISITO OBLIGATORIO" y obedece generando paths que salen horribles.

**Resultado en tu log**: El corazón `heart-shape` con pathData `"M 540 800 C 400 650..."` y el rect `accent-line` son intentos del LLM de cumplir con esta regla obligatoria.

---

### 🔴 Problema 2: Conflicto de Sistemas de Coordenadas (Componentes vs Primitivas)

Hay **dos sistemas de posicionamiento completamente distintos** coexistiendo:

#### Sistema A: Primitivas (AnimaRect, AnimaCircle, AnimaPath, AnimaText)
```javascript
// AnimaRect.tsx línea 113-114
left: `calc(50% + ${resolvedX}px)`,   // ← CENTRADO: x=0 está en el MEDIO
top: `calc(50% + ${resolvedY}px)`,    // ← CENTRADO: y=0 está en el MEDIO
```
- `x: 0, y: 0` = **centro del canvas**
- `x: -200` = 200px a la izquierda del centro

#### Sistema B: Componentes (TextReveal, AnimatedShape, etc.)
```javascript
// TextReveal.tsx línea 17-18
x = 540,  // DEFAULT: 540px desde la izquierda 
y = 960,  // DEFAULT: 960px desde arriba

// Línea 33-34
top: `${y}px`,    // ← ABSOLUTO: y=0 está en la ESQUINA SUPERIOR
left: `${x}px`,   // ← ABSOLUTO: x=0 está en la ESQUINA IZQUIERDA
```
- `x: 540, y: 960` = **centro del canvas** (en formato 1080x1920)
- `x: 0, y: 0` = **esquina superior izquierda** (fuera de vista)

> [!WARNING]
> **El LLM usa coordenadas de primitivas (center-based: x=0 = centro) pero los componentes esperan coordenadas absolutas (x=540 = centro en reel).** Cuando el LLM dice `x: 0, y: 100` para un TextReveal, el componente lo pone en la esquina superior izquierda, no 100px debajo del centro.

**Esto es exactamente lo que se ve en tu screenshot**: el texto y el corazón están desplazados hacia arriba/izquierda porque el LLM piensa en coordenadas centradas pero los componentes usan absolutas.

---

### 🔴 Problema 3: El LLM No Conoce las Props de los Componentes

El prompt le da al LLM una lista plana de nombres:
```
📝 TEXT: TextReveal, GlitchTitle, SplitText
🎨 BACKGROUND: FloatingBlobs, ParticleField
```

Pero **nunca le dice qué props acepta cada uno**. El LLM tiene que adivinar:
- ¿TextReveal acepta `fontSize`? ¿`textColor`? ¿`animation`? 
- ¿Cuál es el rango de `x` e `y` para un componente? ¿0-1080 o -540 a 540?
- ¿Qué valores acepta `animation`? ¿`slide_up` o `slide-up`?

**Resultado**: El LLM manda props incorrectas o en el formato equivocado.

---

## Propuesta de Solución (4 Fases)

### Fase 1: Reescribir el Prompt — Prohibir Paths/Rects, Forzar Solo Componentes

> [!IMPORTANT]
> Este es el cambio más impactante y urgente.

#### [MODIFY] [component_strategy.py](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/backend/app/modules/llm/component_strategy.py)

**Qué cambiar en `_build_strategy_prompt()`:**

1. **ELIMINAR** el "PASO 2 - CREA UNA FORMA CUSTOM" (líneas 281-288)
2. **ELIMINAR** el "REQUISITO OBLIGATORIO" de primitivas (línea 313)
3. **ELIMINAR** la regla de oro #1 "CREA DESDE CERO CON PRIMITIVAS" (línea 299)
4. **ELIMINAR** toda referencia a `type: "path"`, `pathData`, `type: "rect"`, `type: "circle"` del prompt
5. **AGREGAR** regla explícita: "SOLO usa `type: \"component\"` con componentes de la Standard Library. NO uses type: \"path\", \"rect\", \"circle\". Esos tipos están PROHIBIDOS."
6. **SIMPLIFICAR** el ejemplo JSON para mostrar solo layers de tipo `component`

**Qué cambiar en `gemini_schema`:**
- Eliminar `pathData` del schema JSON que se envía a Gemini
- Podríamos también limitar `type` a solo `"component"` y `"text"` (para el texto hablado)

**Impacto estimado:**
- Reduce tokens de salida ~40% (sin más SVG paths largos)
- Elimina el 100% de paths feos
- LLM se enfoca en elegir y combinar componentes

---

### Fase 2: Unificar Sistema de Coordenadas — PositionWrapper

El conflicto de coordenadas es la causa del mal posicionamiento en reel. Hay dos opciones:

#### Opción A: Wrapper de posicionamiento en AnimaComposer (recomendada)

Agregar un wrapper en [AnimaComposer.tsx](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/frontend/src/remotion/composer/AnimaComposer.tsx#L466-L503) que convierta coordenadas del LLM (center-based) a coordenadas absolutas antes de pasarlas al componente:

```
// El LLM dice x: 0, y: 100 (center-based)
// El wrapper calcula: absoluteX = width/2 + x = 540 + 0 = 540
//                      absoluteY = height/2 + y = 960 + 100 = 1060
// Y pasa absoluteX, absoluteY al componente
```

**Ventaja**: No toca los 85 componentes existentes.

#### Opción B: Migrar todos los componentes a coordenadas centradas

Cambiar los 85 componentes para que usen `calc(50% + x)` como las primitivas.

**Desventaja**: Requiere modificar 85 archivos y es peligroso para componentes existentes.

**Mi recomendación**: Opción A. Un wrapper ligero en el caso `component` del AnimaComposer.

---

### Fase 3: Crear Componentes de Forma para Reemplazar Paths

Si el LLM necesita representar visualmente un "corazón", "estrella", "flecha", etc., en vez de escribir un path SVG, debería usar un componente dedicado:

#### Nuevos componentes sugeridos:

| Componente | Descripción | Props clave |
|---|---|---|
| `ShapeIcon` | Forma geométrica de un catálogo predefinido | `shape: 'heart' \| 'star' \| 'arrow' \| 'check' \| 'lightning' \| 'paw' \| ...`, `size`, `color` |
| `IconEmoji` | Emoji o ícono Unicode escalable | `emoji: '❤️' \| '⭐' \| '🐾'`, `size`, `color` |
| `DecorativeLine` | Línea decorativa horizontal/diagonal | `width`, `thickness`, `color`, `style: 'solid' \| 'dashed' \| 'gradient'` |
| `DecorativeFrame` | Marco/borde decorativo | `width`, `height`, `borderStyle`, `color` |

Estos componentes usarían SVG paths internos **pre-definidos y probados**, no generados por el LLM.

> [!TIP]
> **Ya tienes `AnimatedShape` que soporta:** rect, circle, rounded-rect, pill, diamond, hexagon. Se podría extender para incluir corazón, estrella, etc.

---

### Fase 4: Incluir Props de Componentes en el Prompt

Para que el LLM sepa cómo usar cada componente, incluir un mini-catálogo en el prompt:

```
COMPONENTES DISPONIBLES:
📝 TextReveal — Texto animado palabra por palabra
   Props: text (string), animation ('fade'|'blur'|'slide_up'), fontSize (12-120), color (hex)
   Posición: x=0 y=0 es centro del canvas

🖥️ PhoneMockup — Mockup de teléfono
   Props: text (string), width (200-600)
   Posición: x=0 y=0 es centro del canvas
```

**Consideración de tokens**: Con 85 componentes, esto podría ser largo. Solución: solo incluir los 10 componentes que el vector search ya selecciona (`get_relevant_components`), con sus props. Esto ya se hace pero sin props.

---

## Open Questions

> [!IMPORTANT]
> ### ¿Qué primitivas conservar?
> ¿Quieres eliminar **TODAS** las primitivas (path, rect, circle, text) del prompt? ¿O conservar `type: "text"` para el texto hablado? Mi recomendación: conservar solo `type: "text"` (para `{{text}}`) y eliminar el resto.

> [!IMPORTANT]  
> ### ¿Crear componentes de forma (HeartShape, etc.)?
> ¿Vale la pena crear componentes como `ShapeIcon` con formas pre-definidas? ¿O prefieres que el LLM simplemente no intente crear formas y use solo componentes existentes como `EmojiFloat`, `AnimatedIcon`, `AnimatedShape`?

> [!IMPORTANT]
> ### ¿Incluir props en el prompt del LLM?
> Incluir las props específicas de cada componente haría el prompt más largo (~500-800 tokens más) pero el LLM sabría exactamente qué pasar. ¿Lo hacemos solo para los 10 componentes relevantes por escena (los que devuelve vector search)?

---

## Resumen de Archivos a Modificar

| Archivo | Cambio | Prioridad |
|---|---|---|
| [component_strategy.py](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/backend/app/modules/llm/component_strategy.py) | Reescribir prompt, eliminar path/rect del schema | 🔴 Crítica |
| [AnimaComposer.tsx](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/frontend/src/remotion/composer/AnimaComposer.tsx) | Agregar PositionWrapper para componentes | 🔴 Crítica |
| [spec.py](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/backend/app/schemas/spec.py) | Opcionalmente restringir `type` a excluir path | 🟡 Media |
| [embedding.py](file:///c:/Users/Usuario/Documents/GitHub/Animaflow-proyecto-completo/backend/app/services/embedding.py) | Incluir props en `_format_component()` | 🟡 Media |
| Nuevos componentes de forma | `ShapeIcon.tsx`, etc. | 🟢 Baja (opcional) |

---

## Verification Plan

### Tests Automáticos
1. Generar 3 escenas de prueba con textos variados y verificar que el JSON de respuesta:
   - No contiene `type: "path"` ni `type: "rect"`
   - Todos los layers son `type: "component"` o `type: "text"`
   - Los componentes nombrados existen en el registry
2. Test de posicionamiento: verificar que con x=0, y=0 el componente aparece centrado en canvas 1080x1920

### Verificación Manual
- Renderizar 5 escenas con formato reel (9:16) y comparar visualmente antes/después
- Verificar que no hay elementos cortados ni fuera de pantalla
