# AnimaFlow — Análisis de Causa Raíz v2

**Fecha:** 2026-06-02  
**Propósito:** Identificar los fallos fundamentales del sistema que impiden generar videos profesionales con motion graphics, antes de decidir la estrategia de corrección.

---

## Resumen Ejecutivo

El sistema AnimaFlow tiene 9 problemas de raíz identificados. El más grave NO es un bug sino un **error arquitectónico fundamental**: el sistema usa un catálogo de 109 componentes pre-construidos (enfoque "component library") en lugar de un sistema composable basado en primitivas + layout + animaciones (enfoque "composable primitives"). Esto hace que el LLM tenga que elegir entre 109 opciones específicas — una tarea de clasificación imposible — en lugar de componer visuales desde 10-15 primitivas reutilizables.

Los 8 problemas restantes son consecuencia directa o indirecta de este error arquitectónico.

---

## 🔴 Problema #1 (ARQUITECTÓNICO): Catálogo de 109 Componentes en vez de Sistema Composable

### Síntomas
- El LLM no puede elegir el componente correcto entre 109 opciones
- Muchos componentes son ignorados (24 no están ni en AVAILABLE_COMPONENTS)
- Los componentes son demasiado específicos (TinderSwipeCard, SubscribeButton, TikTokOverlay)
- La mayoría de los componentes comparten el mismo patrón interno (position absolute + entry/exit + texto) pero están duplicados
- Para crear un nuevo componente hay que modificar 3 archivos (TSX file → registry.ts → AVAILABLE_COMPONENTS → Pydantic Literal)

### Evidencia
- `frontend/src/remotion/registry.ts`: 109 imports, 109 entries en COMPONENT_REGISTRY
- `backend/app/modules/llm/component_strategy.py` lines 202-218: `AVAILABLE_COMPONENTS` = 85 (faltan 24)
- `backend/app/schemas/spec.py` lines 287-309: `componentName` Literal tiene 109 valores
- Cada componente es un `.tsx` file independiente de 50-200 líneas
- `docs/component-master-plan-v2.md`: Plan original era 81 componentes, ya hay 109

### Causa Raíz
**Decisión arquitectónica de usar "component library catalog" en vez de "primitive composition".** En un sistema composable, tendrías 10-15 primitivas (Text, Rect, Circle, Image, FlexContainer, GridContainer) que se combinan con animation specs (entry, exit, stagger) y style specs (gradient, blur, shadow). En el sistema actual, todo está pre-empaquetado en componentes rígidos.

### Impacto
- El LLM genera composiciones pobres porque no puede expresar ideas visuales que no estén pre-empaquetadas
- Cada nuevo escenario requiere un nuevo componente → no escala
- Los componentes existentes son muy específicos para ser reutilizados en contextos diferentes
- El sistema de layout (flex/grid) está implementado en `AnimaComposer.tsx` y `layoutSolver.ts` pero es subutilizado porque los componentes no lo aprovechan

### Referencia: Cómo funciona Claude/Anthropic con Remotion
Claude no usa un catálogo de componentes. Usa:
1. `<Composition>` de Remotion para definir el canvas
2. Primitivas React (div, span, svg, path) con estilos inline
3. `useCurrentFrame()` + `interpolate()` / `spring()` para animaciones
4. Layout via CSS (flexbox, grid, position absolute)
5. Todo se genera en UNA sola llamada LLM que produce JSX directamente

---

## 🔴 Problema #2: Post-Procesamiento Destructivo (Backend Overrides LLM)

### Síntomas
- El LLM genera posiciones (x, y) para cada layer
- El backend las SOBREESCRIBE con reglas hardcodeadas
- Las posiciones finales no coinciden con lo que el LLM diseñó

### Evidencia

En `component_strategy.py`:
- **`_apply_smart_layout()`** (lines 136-171): Asigna x=0, y hardcodeado (text_y=150, visual_y=-150, incrementando) a layers que ya tienen posición. Destroza cualquier layout que el LLM haya diseñado.
- **`_clamp_coordinates()`** (lines 176-197): Clampa coordenadas a márgenes del 10%. Si el LLM puso algo en una posición específica, se mueve.
- **`_normalize_paths()`** (lines 76-131): Modifica pathData SVG asumiendo coordenadas absolutas. Puede romper SVGs.

```python
# Lines 136-171: SMART LAYOUT OVERRIDE
def _apply_smart_layout(spec: dict) -> dict:
    text_y = 150   # Hardcoded starting position
    visual_y = -150 # Hardcoded starting position
    for layer in spec.get("layers", []):
        if layer["type"] == "text":
            layer["y"] = text_y   # OVERRIDES whatever the LLM set
            text_y += 80
```

### Causa Raíz
**Falta de confianza en la salida del LLM.** El código fue escrito para "arreglar" las posiciones del LLM, pero en realidad las empeora porque no entiende el contexto visual que el LLM diseñó.

### Impacto
- Todos los elementos terminan apilados en posiciones predecibles pero malas
- Se pierde la diversidad visual que el LLM podría generar
- El sistema es determinista pero feo

---

## 🔴 Problema #3: Sistema de Coordenadas Roto (Doble Transformación)

### Síntomas
- Texto invisible o fuera de pantalla
- Elementos no centrados correctamente
- Posiciones inconsistentes entre type:"text" y type:"component"

### Evidencia

En `layoutSolver.ts`, `applyDefault()` (lines 285-304):
```typescript
const centerX = parentX + parentWidth / 2;  // 540 for 1080px
const centerY = parentY + parentHeight / 2;  // 960 for 1920px
const offsetX = (layer.x as number) ?? 0;    // Center-relative offset
const offsetY = (layer.y as number) ?? 0;
const width = getDimension(layer, "width", DEFAULT_LAYER_WIDTH);   // 200!
const height = getDimension(layer, "height", DEFAULT_LAYER_HEIGHT); // 100!
layer.x = Math.floor(centerX + offsetX - width / 2);  // 540 + 0 - 100 = 440
layer.y = Math.floor(centerY + offsetY - height / 2);  // 960 + 0 - 50 = 910
```

Esto convierte x=0,y=0 (center del LLM) → (440, 910) en absoluto (desplazado 100px izq, 50px arriba).

Luego, en `AnimaText.tsx` (lines 251-252):
```typescript
left: `calc(50% + ${resolvedX}px)`,   // Si x=440: 50% + 440px = 980px !!
top: `calc(50% + ${resolvedY}px)`,    // Si y=910: 50% + 910px = 1870px !!
```

**TRIPLE ERROR:**
1. LayoutSolver convierte center-relative → absolute (con DEFAULT incorrectos)
2. AnimaText interpreta las coordenadas como center-relative otra vez
3. DEFAULT_LAYER_WIDTH=200 es arbitrario y causa offset incorrecto

Pero para `type:"component"` (Typewriter, TextReveal, etc.):
Las coordenadas pasan directo:
```typescript
// AnimaComposer.tsx lines 776-777
const absoluteX = layer.x as number;  // 440
const absoluteY = layer.y as number;  // 910
```
Y Typewriter las usa como top/left:
```typescript
// Typewriter.tsx lines 56-57
top: `${y}px`,   // 910px
left: `${x}px`,  // 440px
transform: 'translate(-50%, -50%)',  // Centrado
```

Esto resulta en el elemento centrado en (440, 910) absoluto, que NO es el centro del canvas (540, 960).

### Causa Raíz
**Inconsistencia en el sistema de coordenadas.** El LLM usa centro-relativo (x=0,y=0 = centro). LayoutSolver convierte a absoluto con defaults incorrectos. AnimaText trata las coords como centro-relativo otra vez. Los componentes (Typewriter, etc.) tratan las coords como absolutas pero con translate(-50%,-50%). No hay un contrato único de coordenadas.

---

## 🔴 Problema #4: AVAILABLE_COMPONENTS Desincronizado (85 vs 109)

### Síntomas
- El LLM genera StyleAnimateNumber, StyleWatermark, StyleBarChart → son eliminados por validación
- El prompt dice "puedes usar X componentes" pero realmente hay Y disponibles
- Componentes que existen en frontend no son utilizables por el LLM

### Evidencia
- `component_strategy.py` lines 202-218: 85 componentes en AVAILABLE_COMPONENTS
- `registry.ts`: 109 componentes en COMPONENT_REGISTRY
- `spec.py` lines 287-309: 109 en `componentName` Literal
- Faltan: `StyleAnimateNumber`, `StyleAvatar`, `StyleBarChart`, `StyleBarRace`, `StyleBadge`, `StyleButton`, `StyleCallout`, `StyleCard`, `StyleChip`, `StyleCursor`, `StyleDivider`, `StyleFakeScroll`, `StyleFunnelChart`, `StyleLineChart`, `StylePieChart`, `StyleProgressBar`, `StyleRadarChart`, `StyleScrambleText`, `StyleSimulatedHover`, `StyleTextBlock`, `StyleTicker`, `StyleVideoPlayer`, `StyleWatermark`, `EmojiReaction`

### Causa Raíz
**Mantenimiento manual de 3 fuentes de verdad.** No hay un único source of truth para la lista de componentes. Cada vez que se añade un componente, hay que actualizar 3 archivos. Es inevitable que se desincronicen.

---

## 🔴 Problema #5: Conversión Groups items→children Destructiva

### Síntomas
- Grupos con items visibles en el spec pero vacíos en el render
- Contenido de grupos perdido durante la sanitización
- Layout hints ("center", "left") confundidos con contenido real

### Evidencia
En `component_strategy.py`, la Fase 3 de v5 convierte `items` → `children` filtrando valores que parecen layout hints y duplicados de scene_text. La lógica de filtrado es demasiado agresiva.

### Causa Raíz
El LLM genera `items` para grupos, pero el frontend espera `children`. La conversión es frágil y pierde datos válidos.

---

## 🔴 Problema #6: Duración de Escena Extendida Artificialmente (Silencio)

### Síntomas
- Audio termina antes que el video → silencio incómodo
- Sincronía audio-video rota
- Escenas más largas de lo necesario

### Evidencia

En `orchestrator.py` lines 146-154:
```python
WORDS_PER_SECOND = 2.17  # Basado en speech rate humano (~130 wpm)
# Pero Piper TTS habla a ~3.7 palabras/segundo

min_duration_for_text = max(3.0, word_count / 2.17)
# Para 16 palabras: max(3.0, 7.37) = 7.37s
# Pero TTS real dura 4.30s → se extiende a 7.67s = 3.37s de silencio
```

### Causa Raíz
**WORDS_PER_SECOND (2.17) está calibrado para habla humana, no para TTS.** Piper TTS es significativamente más rápido (~3.7 wps). La fórmula de extensión sobreescribe la duración real del TTS.

---

## 🔴 Problema #7: out_transition es Código Muerto

### Síntomas
- El LLM genera out_transition gastando tokens
- Se valida y almacena en la DB
- Nunca se usa en el render final
- Las únicas transiciones reales son 15 frames de crossfade de background

### Evidencia
- `MainComposition.tsx` no referencia `out_transition`
- `AnimaComposer.tsx` lines 887-901: Solo crossfade de 15 frames
- `AnimatedWrapper.tsx`: Existe pero solo para entry/exit por layer
- `frontend/src/remotion/transitions/`: Existen 5 transition components pero NUNCA se importan/usan

### Causa Raíz
**Característica planeada pero nunca conectada.** El prompt, schema y validator se actualizaron, pero el renderer nunca se implementó.

---

## 🔴 Problema #8: Iconos desde CDN Remoto, No desde Assets Locales

### Síntomas
- Iconos que no aparecen en render
- Dependencia de internet para assets core
- Tiempo de carga de API externa

### Evidencia

`IconifyIcon.tsx` line 40:
```typescript
const url = `https://api.iconify.design/${prefix}/${name}.svg?color=${encodedColor}`;
```

Se carga de la API pública de Iconify. No hay fallback. No hay precarga. No usa los iconos vectorizados que el usuario tiene en su VPS.

### Causa Raíz
**Diseñado como dependencia externa en vez de asset local.** El usuario mencionó explícitamente "ya tengo iconos vectorizados en mi vps" pero el sistema no los usa.

---

## 🔴 Problema #9: Sin Sistema de Generación de Componentes en Runtime

### Síntomas
- Cada nuevo componente requiere: escribir TSX → importar en registry.ts → añadir a AVAILABLE_COMPONENTS → añadir a Pydantic Literal
- No hay manera de que un usuario cree componentes sin ser developer
- El sistema no escala a "long tail" de necesidades visuales

### Evidencia
- `docs/component-master-plan-v2.md` section "Arquitectura Futura": describe evaluación dinámica de JSX con babel-standalone, pero no está implementado
- No existe `eval()` de JSX, no existe generación procedural de componentes
- Todos los componentes son archivos físicos en `frontend/src/remotion/components/`

### Causa Raíz
**Arquitectura de "compile-time" en vez de "runtime".** El sistema requiere build (`vite build`) para incorporar nuevos componentes. No hay plugin system, no hay dynamic registration.

---

## Síntesis: El Problema Real

```
ERROR ARQUITECTÓNICO FUNDAMENTAL
         │
         ▼
  Catálogo de 109 componentes pre-hechos
  (en vez de sistema composable con primitivas)
         │
         ├──► LLM no puede elegir bien (muy complejo)
         ├──► Componentes ignorados (24 no listados)
         ├──► Post-procesamiento destructivo intenta "arreglar"
         ├──► Coordenadas inconsistentes (center vs absolute)
         ├──► No escala (cada feature = nuevo componente)
         └──► Sistema de layout subutilizado
```

**La solución correcta NO es arreglar bugs uno por uno (v6). La solución correcta es cambiar la arquitectura a un sistema composable donde el LLM genere composiciones desde primitivas flexibles, no desde componentes pre-hechos.**

---

## Recomendaciones Estratégicas

### Opción A: "Parche" (Plan v6 — 2-3 días)
Arreglar los bugs uno por uno:
1. Sync AVAILABLE_COMPONENTS (85→109)
2. Fix group items conversion
3. Remove word-count extension
4. Remove dead out_transition code
5. Recursive exit animations

**Riesgo:** No resuelve el problema arquitectónico. Seguirás teniendo renders mediocres.

### Opción B: "Re-arquitectura" (Plan v7 — 2-3 semanas)
Reemplazar el catálogo de 109 componentes por un sistema composable:
1. Reducir a 10-15 primitivas atómicas: Text, Rect, Circle, Path, Image, Icon, FlexContainer, GridContainer, GradientBackground, Video
2. Sistema de animación universal: cualquier primitiva puede tener entry/exit/stagger
3. Layout system: flex, grid, absolute positioning (ya existe, mejorarlo)
4. Style system: cualquier primitiva acepta gradient, blur, shadow, border-radius (LayerStyle ya existe)
5. El LLM genera specs cortos combinando primitivas + animation + layout + style
6. NO se necesitan componentes pre-hechos
7. Los 109 componentes existentes se convierten en "presets" o "templates" que son combinaciones de primitivas

**Riesgo:** 2-3 semanas de desarrollo. Pero resuelve el problema de raíz.

### Opción C: "Híbrido" (Plan v6 + re-arquitectura parcial)
1. Implementar v6 para estabilizar el render actual (2-3 días)
2. Paralelamente, construir sistema de "DynamicComposition" que genera specs de primitivas directamente
3. Los 109 componentes existentes se mantienen como "fallback"
4. Nuevos proyectos usan el sistema composable

---

## Preguntas para el Founder

1. ¿Validaste con pilot users si los videos actuales (con bugs) resuelven su problema?
2. ¿Hay algún usuario pagando? ¿Qué dice del quality visual?
3. ¿Los 109 componentes existentes fueron creados por necesidades reales de usuarios o por especulación?
4. ¿Qué es más importante para los pilot users: más componentes o mejor calidad de los videos actuales?
5. ¿Sabes qué están haciendo tus competidores directos en motion graphics generados por IA?
