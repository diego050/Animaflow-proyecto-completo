# Implementation Plan v7 — Arreglo integral de calidad de video en producción

**Fecha:** 2026-06-02
**Estado:** Borrador — pendiente de aprobación
**Reemplaza:** `implementation_plan_v6.md` (lo absorbe y completa)
**Basado en:** `docs/analisis-causa-raiz-produccion-v3.md`
**Objetivo:** Que los videos en producción salgan como en `dev` — texto legible y centrado, íconos visibles, sin pantallas vacías, sin silencios, sin pantallas negras.

---

## Resumen ejecutivo

5 causas raíz confirmadas en código. v6 cubría 3; este plan cubre las 5 + el sistema de íconos.

| # | Causa | Fase | Estado en v6 |
|---|---|---|---|
| 1 | Componentes borrados por lista desincronizada | A1 | ✅ cubierto |
| 2 | Tres contratos de coordenadas en conflicto | A2 | ❌ nuevo |
| 3 | `Style*` ignora `fontSize` → texto a 32px | A3 | ❌ nuevo |
| 4 | Duración por palabras ignora TTS real → silencios | A4 | ✅ cubierto |
| 5 | `out_transition` es código muerto | A5 | ✅ cubierto |
| 6 | Íconos: render desde API pública + verificación de búsqueda | A6 | ❌ nuevo |

**Estructura del plan:**
- **Fase A — "Que se vea bien" (crítico, ~1-1.5 días).** Las 6 tareas de arriba. Es lo que desbloquea producción.
- **Fase B — "Que no se vuelva a romper" (~2-3 días).** Una sola fuente de verdad + tests de CI.
- **Fase C — "Motion graphics dinámicos" (proyecto aparte).** Solo se esboza; NO se ejecuta hasta que A+B estén estables.

> **Regla de oro de este plan:** no añadir un cuarto sistema de coordenadas ni una quinta lista de componentes. Cada tarea **reduce** duplicación, no la aumenta.

---

# FASE A — Crítico (desbloquea producción)

## A1 · Sincronizar la lista de componentes (Causa #1)

**Problema:** `component_strategy.py:1518` borra cualquier `componentName` que no esté en `AVAILABLE_COMPONENTS` (`component_strategy.py:202-219`), lista de 85 que **no** incluye `IconifyIcon` ni los `Style*`. El registry real tiene 109.

**Archivos:**
- `backend/app/modules/llm/component_strategy.py`
- `backend/app/modules/llm/spec_validator.py`

**Cambios:**
1. Reemplazar `AVAILABLE_COMPONENTS` (líneas 202-219) por la lista completa de los **109** nombres de `frontend/src/remotion/registry.ts` (`COMPONENT_NAMES`). Incluir obligatoriamente: `IconifyIcon` y los 24 `Style*`.
2. En `spec_validator.py:159` (Check 9), **eliminar el set hardcodeado** y reutilizar la misma fuente:
   ```python
   from app.modules.llm.component_strategy import AVAILABLE_COMPONENTS
   VALID_COMPONENTS = set(AVAILABLE_COMPONENTS)
   ```
   Quitar los componentes fantasma que hoy tiene y no existen en registry: `StatCard`, `StepByStepGuide`, `EmojiReaction`.
3. Revisar el dict `FALLBACK_COMPONENTS` (`component_strategy.py:1519`): que solo mapee a componentes que SÍ existen.

**Test:**
- `test_available_components_matches_registry`: parsear `registry.ts` (`COMPONENT_NAMES`) y assert que `set(AVAILABLE_COMPONENTS) == set(registry)`.

**Criterio de aceptación:** en los logs ya NO aparece `Unknown component 'StyleTextBlock' — marking for removal`.

> Nota: este parche manual lo sustituye definitivamente la **Fase B1** (generación automática). Aquí es solo para desbloquear.

---

## A2 · Unificar el contrato de coordenadas (Causa #2) — la tarea más delicada

**Problema:** tres sistemas restan/suman medias dimensiones sobre el mismo `x/y`:
- `layoutSolver.ts:285` (`applyDefault`) → resta `width/2`, `height/2` (top-left absoluto).
- Componentes (`SubscribeButton.tsx:48`, `StyleTextBlock.tsx:72`, `IconifyIcon.tsx:45`, todos los `Style*`) → `translate(-50%,-50%)` (centro absoluto).
- `AnimaText.tsx:251` y primitivas → `calc(50% + x)` (offset desde centro de pantalla).

### Decisión de contrato (recomendada)
**Contrato único: "centro absoluto en píxeles".** `x/y` = posición del **centro** del elemento en el canvas. Razón: el `translate(-50%,-50%)` de los componentes es robusto a contenido de tamaño variable (botones, texto) — **no requiere conocer el ancho real**. Es el contrato correcto; el bug es que el solver pre-resta `width/2` con un ancho inventado.

### Cambios

**A2.1 — `layoutSolver.ts::applyDefault` (líneas 285-304):** dejar de restar media dimensión; emitir el **centro absoluto**.
```ts
// ANTES
layer.x = Math.floor(centerX + offsetX - width / 2);
layer.y = Math.floor(centerY + offsetY - height / 2);
// DESPUÉS
layer.x = Math.floor(centerX + offsetX);   // centro absoluto
layer.y = Math.floor(centerY + offsetY);
layer.width = width;    // se conserva para grid/flex, pero NO se usa para posicionar leaves
layer.height = height;
```

**A2.2 — `AnimaText.tsx` (líneas 251-252):** consumir centro absoluto en vez de `calc(50% + x)`.
```ts
// ANTES
left: `calc(50% + ${resolvedX}px)`,
top:  `calc(50% + ${resolvedY}px)`,
// DESPUÉS
left: `${resolvedX}px`,
top:  `${resolvedY}px`,
// (mantener el translate(-50%,-50%) existente)
```
Aplicar el mismo cambio a las primitivas que usen `calc(50% + x)`: revisar `AnimaRect.tsx`, `AnimaCircle.tsx`, `AnimaPath.tsx`, `AnimaImage.tsx`, `AnimaGroup.tsx`, `AnimaParticles.tsx`. Unificar todas al patrón `left:x; top:y; translate(-50%,-50%)`.

**A2.3 — Componentes del registry:** **NO tocar.** Ya usan `left:x; top:y; translate(-50%,-50%)` = centro absoluto. Quedan correctos automáticamente cuando el solver emite centro.

**A2.4 — Grupos flex/grid:** sus hijos se posicionan en `distributeRow/Column/applyGrid` (`layoutSolver.ts:448-439`) emitiendo **top-left relativo**. Como los hijos se renderizan con `translate(-50%,-50%)`, hay que convertir su posición a **centro**: al asignar `child.x/child.y`, sumar `childWidth/2` y `childHeight/2`.
   - **Alcance Fase A:** en el job real las escenas son listas planas (bg + texto + ícono); los grupos que generó Gemini colapsaron a 0 hijos. Por eso **el camino plano (A2.1 + A2.2) resuelve los fallos observados.** Los grupos flex se arreglan bien en **Fase C** (CSS flex real). Para Fase A basta con: si un grupo tiene hijos, sumar media dimensión al asignar (parche), y cubrirlo con un test.

**A2.5 — Limpieza backend:** revisar que `_clamp_coordinates` y `_apply_smart_layout` (`component_strategy.py:136-197`) sigan teniendo sentido bajo el contrato "centro absoluto". `_clamp_coordinates` usa rango `[-width/2+margin, width/2-margin]` (offsets desde centro) — coherente con lo que genera la IA, OK. `_apply_smart_layout` asigna `y` por tipo cuando falta — OK. No requieren cambio, pero **añadir comentario** documentando que el spec usa "offset desde centro" y que el solver lo convierte a "centro absoluto".

### Test (obligatorio, es el cambio más arriesgado)
- `layoutSolver.test.ts`:
  - leaf en `x:0,y:0` (canvas 1080×1920) → centro absoluto `(540, 960)`.
  - leaf en `x:0,y:300` → `(540, 1260)`.
  - `SubscribeButton` width 648 en `x:0` → centro en `540` (no en `216`).
- Snapshot visual (Remotion `renderStill`) de una escena mínima: bg + StyleTextBlock centrado + IconifyIcon arriba → verificar que el texto está centrado y el ícono visible.

**Criterio de aceptación:** en una escena con `SubscribeButton` en `x:0`, el botón queda **centrado horizontalmente** (no recortado por la izquierda como en `escena3.png`).

---

## A3 · Que el texto se renderice grande y legible (Causa #3)

**Problema:** `StyleTextBlock.tsx:50` solo lee `style?.fontSize`; el backend escribe `layer["fontSize"]` (top-level). El componente lo ignora → renderiza a 32px (variant `heading`). Todo el auto-fit y el `fontSize>=48` del backend son no-ops sobre los `Style*`.

**Archivos:**
- `frontend/src/remotion/components/StyleTextBlock.tsx`
- `frontend/src/remotion/components/StyleScrambleText.tsx` (mismo patrón, revisar)
- `backend/app/modules/llm/component_strategy.py`

**Cambios:**
1. **StyleTextBlock:** aceptar `fontSize` como prop top-level y priorizarlo:
   ```tsx
   const StyleTextBlock = ({ fontSize, ... }) => {
     const resolvedFontSize = fontSize ?? style?.fontSize ?? v.fontSize;
   }
   ```
   Subir defaults de variante para video móvil: `heading` ≥ 80 (hoy 32), `body` ≥ 48 (hoy 16). El video es vertical 1080px; 32px es ilegible.
2. **Backend:** en `_auto_fit_layer_text` (`component_strategy.py:1559`) y en el default-width, asegurar que el `fontSize` calculado se escribe como prop top-level (ya lo hace) — ahora el componente lo respetará. Elevar `min_font_size` de 48 a **64** para texto hablado principal.
3. **IconifyIcon `size` string** (`resultado.md:199` muestra `"size":"120"`): en el post-procesado del backend, añadir `size` a la coerción numérica (`_coerce_number`) para `IconifyIcon`, o en `IconifyIcon.tsx:48` hacer `Number(size) * scale`.

**Test:**
- `test_styletextblock_uses_top_level_fontsize` (frontend): render con `fontSize=96` → el `<div>` tiene `font-size: 96px`.
- Backend: `test_iconify_size_coerced_to_number`.

**Criterio de aceptación:** el texto principal de un video vertical se ve a ≥80px (como en `dev`).

---

## A4 · Eliminar silencios de audio (Causa #4)

**Problema:** `orchestrator.py:144-154` extiende la duración por conteo de palabras (`WORDS_PER_SECOND=2.17`) ignorando la duración real del TTS. Escena 1: audio 4.30s → escena 7.67s → 3.37s de silencio.

**Archivo:** `backend/app/modules/pipeline/orchestrator.py`

**Cambio:** **eliminar el bloque de extensión por palabras** (líneas 144-154). La duración correcta de la escena es `duración_real_TTS + AUDIO_PADDING` (ya calculada en línea 119). Si el texto fuese demasiado largo para la escena, la solución es **segmentar en más escenas**, no estirar.
```python
# Reemplazar líneas 144-154 por: (nada — confiar en duration + AUDIO_PADDING)
# La duración real del TTS ES la duración correcta de la escena.
```
Mantener el `min` absoluto de seguridad (p.ej. 1.5s) por si un TTS devuelve 0.

**Test:** `test_scene_duration_equals_tts_plus_padding`: escena con audio 4.30s → `duration_seconds == 4.60` (4.30 + 0.30), no 7.67.

**Criterio de aceptación:** en los logs ya no aparece `Scene N duration X too short — extending to Y`.

---

## A5 · Eliminar `out_transition` muerto (Causa #5)

**Problema:** la IA genera `out_transition`, el schema lo incluye, pero `MainComposition.tsx` nunca lo lee ni monta `TransitionWrapper`. Gasta tokens y confunde. Las pantallas negras (`transicion1/2.png`) son la escena vaciándose (todas las capas hacen `fade-out` + fondo casi negro + gap de audio).

**Archivos:** `component_strategy.py`, `backend/app/schemas/spec.py`, `frontend/src/types/spec.ts`

**Cambios:**
1. Quitar las instrucciones de `out_transition` del prompt (`component_strategy.py:1008-1016`).
2. Quitar `out_transition` del Gemini schema (`component_strategy.py:1289-1301`).
3. Quitar `out_transition` del modelo Pydantic `AnimaComposerSpec` (`backend/app/schemas/spec.py`) y del tipo TS (`frontend/src/types/spec.ts`). Como el campo es opcional, los specs viejos no se rompen.
4. **Decisión de producto sobre la transición real:** dejar solo el crossfade de fondo (`AnimaComposer.tsx:887`) **o** cablear de verdad `TransitionWrapper` en `MainComposition`. Recomendado para Fase A: **solo crossfade** (ya funciona). Cablear transiciones reales = Fase C.
5. **Importante (relacionado con las pantallas negras):** revisar el `exit` por defecto (`component_strategy.py:1648-1661`). Hoy se aplica `fade-out` con `exitDelay 0.3 / exitDuration 0.5` a TODO. Si la escena tiene gap, queda negro. Con A4 (sin gap), el fade-out coincidirá con el corte y se verá natural. Verificar que `exitDelay` se calcula respecto al **final real** de la escena.

**Criterio de aceptación:** no hay frames totalmente negros entre escenas (salvo el crossfade intencional).

---

## A6 · Íconos: render robusto y verificación de la búsqueda (Causa #6)

**Contexto del sistema actual (verificado en código):**
- Tabla `iconify_icons` en tu VPS: **43.237 filas** con `prefix`, `name`, `tags`, `embedding Vector(768)` (modelo `gemini-embedding-2`), índice HNSW coseno (`migration k3l4m5n6o7p8`).
- `iconify_search.py::find_best_icons` hace búsqueda semántica y devuelve nombres tipo `mdi:ecg-heart`.
- **Pero el SVG se descarga en tiempo de render desde la API PÚBLICA** `https://api.iconify.design/${prefix}/${name}.svg` (`IconifyIcon.tsx:40`). Tu VPS solo sirve para *elegir* el ícono; **no almacena el SVG**.

**Riesgos en producción:**
1. **Dependencia de internet en el render.** Si el servidor de Remotion no tiene salida a internet o la API pública limita/cae, los íconos no cargan (quedan en blanco). `iconify_search.py:96` ya tiene un warning de mismatch de dimensiones — señal de que esto ya ha fallado antes.
2. **Mismatch de embeddings:** si las 43k filas se generaron con un modelo/dimensión distinta a `gemini-embedding-2`@768, la búsqueda devuelve `[]` (no encuentra íconos). Hay que verificarlo.
3. **`size` como string** (ya cubierto en A3).

**Cambios Fase A (mínimos para que los íconos se vean):**
1. **Verificar coherencia de embeddings:** correr una query de prueba en el VPS y confirmar que `find_best_icons` devuelve resultados con score alto (>0.5). Si devuelve vacío o el log muestra "dimension mismatch", **re-embeddear** la tabla con `gemini-embedding-2`@768 (script batch). *(Tarea de verificación, no de código.)*
2. **Fallback de render:** en `IconifyIcon.tsx`, si la `<Img>` de la API pública falla, no romper la escena (ya usa `Img` de Remotion; añadir `onError` → ocultar en vez de caja rota).
3. **Confirmar que el nombre devuelto resuelve en la API pública.** Algunos `prefix:name` de tu DB pueden no existir en `api.iconify.design`. Añadir, en `find_best_icons`, un filtro/validación opcional o un set de prefijos garantizados (`mdi`, `lucide`, `ion`, etc.).

**Mejora recomendada (Fase B, no bloqueante):** **auto-hospedar los SVG desde tu VPS** para no depender de la API pública en el render:
- Guardar el `body`/SVG de cada ícono en la tabla (o en disco/objeto) y servirlo desde un endpoint propio `GET /api/icons/{prefix}/{name}.svg`.
- Cambiar `IconifyIcon.tsx` para apuntar a tu endpoint. Esto hace el render **determinista y offline-safe**, que es justo lo que producción necesita.

**Criterio de aceptación Fase A:** en una escena cuyo texto menciona un concepto claro (p.ej. "energía"/"batería"), el ícono correspondiente aparece renderizado.

---

## Orden de ejecución Fase A

| Paso | Tarea | Depende de | Esfuerzo |
|---|---|---|---|
| 1 | A1 sincronizar componentes | — | 20 min |
| 2 | A4 quitar extensión de audio | — | 15 min |
| 3 | A5 quitar out_transition | — | 30 min |
| 4 | A2 unificar coordenadas | — | 3-4 h (+ tests) |
| 5 | A3 fontSize legible | A1 | 1 h |
| 6 | A6 verificar íconos | A1 | 1-2 h (verificación VPS) |

**Validación end-to-end de Fase A:** regenerar el job del guion "¿Tu cuerpo se siente lento…?" y verificar contra `escena1/2/3.png`:
- Escena 1 y 2: texto grande, centrado y legible + ícono visible (ya no cielo vacío).
- Escena 3: botón centrado, texto completo no recortado.
- Audio sin silencios; sin pantallas negras.

---

# FASE B — Que no se vuelva a romper (~2-3 días)

## B1 · Una sola fuente de verdad de componentes
**Problema de raíz:** hay 4 listas de componentes en 2 lenguajes que derivan entre sí. El bug #1 fue consecuencia directa.

**Solución:**
1. Generar un artefacto único `registry.json` (o exportar desde `registry.ts`) con nombres + props válidas por componente.
2. Backend (`AVAILABLE_COMPONENTS`, `spec_validator`, `ALLOWED_PROPS`) consume ese JSON en lugar de listas hardcodeadas.
3. **Test de CI** que falle si `registry.ts` y la lista del backend divergen. Esto convierte "el bug #1" en imposible de reintroducir.

## B2 · Una sola fuente de verdad de props
- Generar `sanitizeProps.ts::ALLOWED_PROPS` (hoy solo 6 componentes) y la lista de "garbage props" del backend (`component_strategy.py:1494-1501`) desde los tipos de cada componente. Hoy son listas manuales que también derivan.

## B3 · Contrato de coordenadas documentado + tests visuales
- Documento corto `docs/coordinate-contract.md`: "spec = offset desde centro; solver = centro absoluto; componentes = translate(-50%,-50%)". 
- Snapshot test por componente del registry (render still + comparación) para detectar regresiones de posicionamiento.

## B4 · Íconos self-hosted (ver A6 mejora)
- Endpoint propio de SVG desde el VPS. Render determinista, sin dependencia de `api.iconify.design`.

---

# FASE C — Motion graphics dinámicos (proyecto aparte, NO ahora)

Solo se ejecuta cuando A+B estén estables en producción. Recoge la visión de `analisis_raiz_arquitectura.md`:

1. **Layout 100% CSS (eliminar el solver para flex/grid).** Hoy el solver pre-calcula posiciones de hijos flex y los renderiza `position:absolute` → "flexbox roto". Sustituir por: grupos flex/grid renderizan hijos **en flujo CSS real** (sin position:absolute), delegando el layout al navegador. Esto arregla los grupos anidados de verdad.
2. **Animaciones por keyframes** en el spec (arrays `keyframes`/`times` → `interpolate()` de Remotion), en vez de strings `entry:"fade"`. Da control frame-a-frame desde el backend.
3. **Adaptador inverso para After Effects:** tras renderizar en el navegador, extraer coordenadas reales con `getBoundingClientRect()` y empaquetarlas para el proyecto de AE (el `layout_solver.py` de Python ya vive en esa ruta, `ae_transformer.py`).
4. **(Opcional) Primitivas libres** (`rect`/`path`/`group`) para que la IA componga sin compilar React nuevo — tu inquietud de escalabilidad. Útil, pero **no es la causa de los fallos actuales**; va al final.

---

## Archivos tocados (resumen Fase A)

| Archivo | Tareas |
|---|---|
| `backend/app/modules/llm/component_strategy.py` | A1, A3, A5 |
| `backend/app/modules/llm/spec_validator.py` | A1 |
| `backend/app/modules/pipeline/orchestrator.py` | A4 |
| `backend/app/schemas/spec.py` | A5 |
| `frontend/src/remotion/utils/layoutSolver.ts` | A2 |
| `frontend/src/remotion/primitives/AnimaText.tsx` (+ otras primitivas) | A2 |
| `frontend/src/remotion/components/StyleTextBlock.tsx`, `StyleScrambleText.tsx` | A3 |
| `frontend/src/remotion/components/IconifyIcon.tsx` | A3, A6 |
| `frontend/src/types/spec.ts` | A5 |

**Sin archivos nuevos en Fase A** (salvo tests). Fase B introduce `registry.json` + tests de CI. Fase C es diseño aparte.

---

## Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| A2 rompe posicionamiento de otros tipos de layer | Media | Alto | Tests de `layoutSolver` + snapshot visual antes de mergear; cambiar TODAS las primitivas a la vez (no dejar mitad en cada contrato) |
| Grupos flex anidados siguen fallando tras A2 | Media | Medio | Aceptado en Fase A (las escenas reales son planas); se resuelve en C1 |
| Re-embeddear 43k íconos es lento/costoso | Baja | Medio | Solo si la verificación A6.1 detecta mismatch; batch nocturno |
| API pública de Iconify cae en render | Media | Alto | Fallback `onError` (A6.2) ya; self-host en B4 |
| Subir defaults de fontSize desborda escenas cortas | Baja | Bajo | El auto-fit multilínea del backend ya reduce si no cabe |

---

## Definición de "hecho" (Fase A)

1. El job de prueba regenerado muestra texto legible y centrado, íconos visibles, en las 3 escenas.
2. Cero `Unknown component` y cero `extending to` en los logs.
3. Tests verdes: `layoutSolver`, `available_components_matches_registry`, `scene_duration`, `styletextblock_fontsize`.
4. Comparativa visual antes/después adjunta (vs `escena1/2/3.png`).
