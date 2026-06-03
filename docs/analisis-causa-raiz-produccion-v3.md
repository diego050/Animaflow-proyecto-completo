# Análisis de Causa Raíz — Calidad de Video en Producción (v3)

**Fecha:** 2026-06-02
**Autor:** Investigación directa sobre `backend/` + `frontend/src/remotion/` (no derivado de los planes previos)
**Job analizado:** `5f7396ef` (3 escenas, guion "¿Tu cuerpo se siente lento...?")
**Evidencia:** `resultado.md` (logs), `escena1/2/3.png`, `transicion1/2.png`
**Reemplaza el diagnóstico de:** `analisis_raiz_arquitectura.md` (parcialmente incorrecto) y amplía `implementation_plan_v6.md` (incompleto)

---

## TL;DR (lee esto primero)

Tus videos en producción NO fallan porque te falten componentes ni porque la IA "no sepa posicionar". Fallan por **tres bugs estructurales encadenados**, y los dos planes que tienes solo cubren uno de ellos:

1. **Los componentes correctos se BORRAN en una etapa intermedia del backend.** El texto (`StyleTextBlock`) y los íconos (`IconifyIcon`) que la IA genera bien son eliminados por un validador que usa una lista desactualizada. → escena1 y escena2 quedan vacías (solo el fondo de estrellas).

2. **Existen TRES sistemas de coordenadas incompatibles peleándose por el mismo `x/y`.** Lo que sobrevive al borrado se posiciona mal: se desplaza fuera de pantalla o se recorta. → el botón rojo de escena3 sale cortado por la izquierda.

3. **El texto, aun cuando sobrevive, se renderiza a 32px** (ilegible en móvil) porque el componente ignora el `fontSize` que el backend calcula.

El **Plan v6 arregla el #1 y los gaps de audio, pero NO toca el #2 ni el #3.** Si aplicas v6 tal cual, dejarás de ver pantallas vacías… pero verás texto diminuto, descentrado y recortado. Necesario pero **insuficiente**.

El **`analisis_raiz_arquitectura.md` acierta en la intuición** (varios motores de layout en conflicto, "doble transform") pero **culpa al archivo equivocado**: el `layout_solver.py` de Python NO corre en el render de video (solo en exportación a After Effects). El culpable real es `frontend/src/remotion/utils/layoutSolver.ts` peleándose con el `translate(-50%,-50%)` de cada componente.

**Respuesta directa a tu pregunta** ("¿son los componentes? ¿están mal hechos? ¿es la IA?"):
No son los componentes (tienes 109, de sobra). No es la IA (genera specs razonables; lo vimos en los logs). **Es el pipeline de post-procesado y la falta de un contrato único de coordenadas.** Por eso en `dev` con Claude sí funciona: ahí Claude escribe UN componente Remotion a medida por escena con layout CSS nativo, sin pasar por el intérprete genérico que rompe todo.

---

## Cómo se generó este video (el camino real del código)

```
orchestrator.py::_process_chunks_async
   └─ por cada escena:
       ├─ TTS (Piper) + timestamps (Groq)        → duration_seconds
       ├─ generate_scene_composer()              → component_strategy.py
       │     ├─ vector search (15 comps) + iconos
       │     ├─ Gemini genera AnimaComposerSpec (JSON)
       │     ├─ POST-PROCESADO (≈400 líneas):     ← AQUÍ se rompe casi todo
       │     │     items→children, dedup, auto-fit,
       │     │     Fase 4.1: BORRA componentes "desconocidos"  ★ Bug #1
       │     │     _apply_smart_layout + _clamp_coordinates
       │     └─ validate_and_fix (spec_validator.py)
       └─ guarda anima_composer en result_spec

   FRONTEND (Remotion, al renderizar):
   MainComposition → AnimaComposer
       ├─ solveLayout(spec)   ← layoutSolver.ts: x/y → top-left absoluto  ★ Bug #2
       └─ renderSingleLayer → cada componente aplica translate(-50%,-50%) ★ Bug #2
```

---

## CAUSA RAÍZ #1 — Los componentes se borran a mitad del pipeline

### Qué pasó (evidencia en `resultado.md`)
```
03:16:42 WARNING: Unknown component 'StyleTextBlock' — marking for removal
03:16:42 WARNING: Unknown component 'IconifyIcon' — marking for removal
...
03:16:42 INFO: Spec validation: clean (no warnings)   ← "limpio" porque ya no quedaba nada que validar
```
Gemini generó bien las 3 escenas (texto + ícono + fondo). El backend **eliminó el texto y el ícono** y dejó solo `ParticleField`. Por eso escena1 y escena2 son cielos estrellados vacíos.

### Por qué (el bug exacto)
`component_strategy.py:1518` construye la lista de validación a partir de `AVAILABLE_COMPONENTS` (`component_strategy.py:202-219`):

```python
VALID_COMPONENTS = set(AVAILABLE_COMPONENTS)   # línea 1518
...
if comp and comp not in VALID_COMPONENTS:      # línea 1528
    layer["_remove"] = True                    # ← borra StyleTextBlock, IconifyIcon
```

Esa lista tiene **85 componentes y NO incluye `IconifyIcon` ni ninguno de los 24 `Style*`.** Pero el `registry.ts` del frontend tiene **109** y sí los incluye. La IA fue *animada* a usarlos (el prompt tiene una sección entera "Style\* Components Available" y el vector search los devuelve), y luego la etapa siguiente los prohíbe. **El sistema recomienda lo que él mismo borra.**

### El problema de fondo: hay CUATRO listas de "componentes válidos", todas distintas

| Fuente | Nº comps | ¿Incluye StyleTextBlock/IconifyIcon? | ¿Verdad? |
|---|---|---|---|
| `component_strategy.py:202` `AVAILABLE_COMPONENTS` | 85 | ❌ NO → **borra** | la que manda hoy |
| `spec_validator.py:159` Check 9 | ~66 | ✅ SÍ (pero tiene fantasmas: `StatCard`, `StepByStepGuide`, `EmojiReaction` que NO existen en registry) | corre *después* del borrado, inútil |
| `frontend/registry.ts` | 109 | ✅ SÍ | **fuente de verdad real** |
| `frontend/utils/sanitizeProps.ts` `ALLOWED_PROPS` | 6 | parcial | whitelist de props |

No hay **una sola fuente de verdad**. Cada lista se mantiene a mano, en dos lenguajes, y han derivado. Un cambio en v5 (la "Fase 4 component validation") activó el borrado contra la lista desactualizada → se llevó por delante TODO el texto y los íconos. Esto es exactamente lo que `implementation_plan_v6.md` RC-1 describe, y **su fix de sincronizar la lista es correcto.**

> **Nota:** v6 propone copiar la lista de 109 a `AVAILABLE_COMPONENTS`. Funciona como parche, pero perpetúa el problema (mañana vuelve a derivar). La solución real es **generar la lista desde el registry** (ver Recomendaciones).

---

## CAUSA RAÍZ #2 — Guerra civil de coordenadas (el bug que NINGÚN plan cubre)

Este es el hallazgo más importante y el que explica por qué, aun arreglando el #1, los videos seguirán saliendo mal.

Hay **tres contratos de coordenadas distintos** operando sobre el mismo campo `x/y`, y ninguno está de acuerdo con los otros:

### Contrato A — lo que produce `layoutSolver.ts`
`frontend/src/remotion/utils/layoutSolver.ts:285` (`applyDefault`):
```ts
layer.x = Math.floor(centerX + offsetX - width / 2);   // ESQUINA superior-izquierda absoluta
layer.y = Math.floor(centerY + offsetY - height / 2);
```
Convierte el `x/y` del spec en **píxeles absolutos de la esquina superior-izquierda**, restando `width/2`.

### Contrato B — lo que hace CADA componente del registry
`SubscribeButton.tsx:48`, `StyleTextBlock.tsx:72`, `IconifyIcon.tsx:45` (todos iguales):
```tsx
position: 'absolute',
left: `${x}px`,
top: `${y}px`,
transform: `translate(-50%, -50%)`,   // ← x/y es el CENTRO del elemento
```
Para el componente, `x/y` es el **centro absoluto** del elemento (por eso resta 50% con el translate).

### Contrato C — lo que hacen las primitivas (`type:"text"`, `"rect"`, etc.)
`AnimaText.tsx:251`:
```tsx
left: `calc(50% + ${resolvedX}px)`,
top: `calc(50% + ${resolvedY}px)`,
transform: `translate(-50%, -50%) ...`,   // ← x/y es offset DESDE el centro de pantalla
```
Aquí `x:0` = centro de pantalla. Este es además **el modelo mental que el prompt le enseña a la IA** (`"x:0 y:0 es centro del canvas"`, `component_strategy.py:264, 503-510`).

### La colisión, con números reales (botón de escena3)

La IA pidió `SubscribeButton` en `x:0, y:300` (centrado horizontal). El backend le asignó `width=648` (`component_strategy.py:1619`, `0.6 × 1080`). Entonces:

```
1) layoutSolver.applyDefault (Contrato A):
     centerX = 540,  offsetX = 0,  width = 648
     layer.x = 540 + 0 - 648/2 = 540 - 324 = 216      ← top-left en x=216
2) SubscribeButton (Contrato B):
     left: 216px; translate(-50%) → CENTRO del botón queda en x=216
```
Resultado: el centro del botón cae en x=216 (debería estar en 540). **Desplazado 324px a la izquierda → el texto se sale por el borde izquierdo.** Es *exactamente* lo que muestra `escena3.png` ("…jor hoy y sígueme para… r tu energía!" cortado a la izquierda).

Para un `type:"text"` vía AnimaText es peor: el solver le da top-left ≈ (440, 910); AnimaText hace `calc(50% + 440px)` → ≈ 980px → esquina inferior-derecha, **fuera de pantalla**.

### Conclusión del #2
- El "doble transform" que intuyó `analisis_raiz_arquitectura.md` **es real**, pero NO lo causa el `layout_solver.py` de Python (ese solo lo usa `ae_transformer.py` para exportar a After Effects — `grep` lo confirma: no aparece en el pipeline de render de video).
- La causa real: **el `solveLayout.ts` y los componentes restan `½ dimensión` los dos.** Cuanto más ancho el elemento, más se va a la izquierda/arriba.
- Este bug está **latente hoy** porque casi todo se borra en el #1. **En cuanto apliques v6 y los componentes vuelvan, este bug aparecerá en CADA escena.** Por eso v6 solo no basta.

---

## CAUSA RAÍZ #3 — El texto se renderiza a 32px aunque sobreviva

`StyleTextBlock.tsx` solo lee el tamaño de fuente desde `style.fontSize`:
```tsx
const customFontSize = style?.fontSize ? `${style.fontSize}px` : `${v.fontSize}px`;  // línea 50
// variant 'heading' → v.fontSize = 32   (línea 15)
```
Pero todo el backend (auto-fit `_auto_fit_layer_text`, `spec_validator` Check 10 "fontSize ≥ 48") escribe el tamaño en el prop **top-level** `layer["fontSize"]`, NO en `layer["style"]["fontSize"]`. `StyleTextBlock` **ignora el prop `fontSize`** (ni siquiera lo desestructura). Resultado: el texto principal de un video vertical 1080px se renderiza a **32px** → prácticamente invisible.

Toda la maquinaria de "fontSize ≥ 48" y auto-ajuste multilínea del backend **no tiene ningún efecto** sobre los componentes `Style*`. Es un no-op silencioso. (`v6` tampoco detecta esto.)

**Bonus relacionado:** en el log (`resultado.md:199-201`) se ve `"size": "120"` partido en dos líneas — el `size` de `IconifyIcon` llega como **string**, y el componente hace `size * scale` (`IconifyIcon.tsx:48`) → aritmética sobre string. Tamaño de ícono impredecible.

---

## CAUSA RAÍZ #4 — Gaps de silencio en el audio

`orchestrator.py:144-154` extiende la duración de la escena con una estimación por palabras (`WORDS_PER_SECOND = 2.17`) **ignorando la duración real del TTS**:
```
Escena 1: audio real = 4.30s → escena extendida a 7.67s → 3.37s de silencio
```
(log `resultado.md:97`). Piper habla a ~3.7 palabras/s, no a 2.17. La fórmula sobre-estima siempre. `implementation_plan_v6.md` RC-3 lo identifica bien; **el fix correcto es confiar en la duración real del TTS** (`audio + padding`) y, si el texto es muy largo, segmentar en más escenas — no estirar la escena.

---

## CAUSA RAÍZ #5 — `out_transition` es código muerto

Gemini genera `out_transition` (lo vemos en los 3 specs del log), el schema lo incluye, existe `TransitionWrapper.tsx`… pero `MainComposition.tsx` **nunca lo lee ni monta `TransitionWrapper`**. La única transición real es el crossfade de 15 frames del fondo en `AnimaComposer.tsx:887`.

Las pantallas negras de `transicion1.png`/`transicion2.png` se explican así: en el último 25% de cada escena **todas las capas hacen `fade-out`** (exit por defecto, `component_strategy.py:1654`), el fondo es casi negro y además hay gap de audio → **negro total**. No es una transición; es la escena vaciándose. `v6` RC-4 lo identifica bien.

---

## Veredicto sobre los dos planes existentes

### `implementation_plan_v6.md`
| Item | ¿Correcto? | Comentario |
|---|---|---|
| RC-1 sincronizar componentes | ✅ Sí | Resuelve el borrado (Causa #1). El fix dominante. |
| RC-2 items→children con label/value | ✅ Sí | Bug real (escena2/3 generaron 0 hijos). |
| RC-3 quitar extensión por palabras | ✅ Sí | Resuelve los gaps de audio (Causa #4). |
| RC-4 quitar out_transition | ✅ Sí | Es código muerto (Causa #5). |
| RC-5 exit recursivo en grupos | ✅ Sí | Correcto. |
| **Coordenadas (Causa #2)** | ❌ **AUSENTE** | v6 no lo menciona. Es el bug que reaparece al aplicar v6. |
| **fontSize de Style\* (Causa #3)** | ❌ **AUSENTE** | El texto saldrá a 32px. |

**Conclusión:** v6 es **necesario pero insuficiente**. Aplicarlo solo cambia "pantalla vacía" por "texto diminuto, descentrado y recortado". Hay que añadir las Causas #2 y #3.

### `analisis_raiz_arquitectura.md`
- ✅ **Intuición correcta:** múltiples motores de layout en conflicto; doble/triple transform; dirección estratégica (delegar layout al CSS, una fuente de verdad, animaciones por keyframes) es sólida.
- ❌ **Atribución incorrecta:** culpa al `layout_solver.py` de Python. Ese archivo **solo corre en la exportación a After Effects** (`ae_transformer.py`), no en el render de video. El culpable real es `layoutSolver.ts` (frontend) + el `translate(-50%,-50%)` de los componentes.
- ⚠️ **Sobre-dimensiona** "abolir las primitivas". Las primitivas no son el cuello de botella de ESTE fallo; tienes 109 componentes que se renderizan mal, no que falten.

---

## La causa raíz macro (respondiendo a tu pregunta real)

> *"¿Qué se necesita para hacer motion graphics como Claude+Remotion en producción? El problema real es que no podemos crear componentes nuevos salvo en dev, y eso no es escalable."*

Dos verdades incómodas:

1. **La arquitectura "registro fijo + intérprete JSON genérico + saneador multi-pase en Python" es frágil por diseño.** El mismo conocimiento (qué componentes son válidos, qué props aceptan, qué significan las coordenadas) está **duplicado en 4+ archivos y 2 lenguajes** sin un schema compartido. Cada duplicado es un punto de deriva. Por eso un cambio en v5 borró todo el texto sin que nadie lo notara hasta producción.

2. **La capa equivocada manda en el layout.** Las coordenadas se calculan en TRES sitios que no se ponen de acuerdo. El arreglo no es "añadir un cuarto transform"; es **elegir UN contrato y obligar a que el solver y TODOS los componentes lo respeten.**

**Por qué `dev` + Claude funciona y producción no:** en dev, Claude escribe **un componente Remotion a medida por video**, donde el layout es CSS/flex nativo dentro del propio componente. No hay solver genérico, ni indirección por registry, ni saneo de props entre lenguajes. El componente *es* el spec. Producción intenta lograr lo mismo con un intérprete genérico, y ahí es donde se acumulan los tres bugs.

**Sobre "crear componentes nuevos solo en dev":** es una limitación real **pero NO es la causa de estos videos rotos.** Los 109 componentes que ya tienes alcanzan de sobra para este guion de 3 escenas. No te faltan componentes: el pipeline **borra y descoloca** los que ya tienes. Crear componentes dinámicos / primitivas libres es una mejora **posterior**; primero hay que dejar de destruir lo que funciona.

---

## Recomendación: ruta en 3 fases

### Fase A — "Que se vea" (parche crítico, ~1 día) → **hacer ya**
Es `v6` **+ las dos causas que le faltan**:
1. v6 completo (sincronizar componentes, items→children, quitar extensión de audio, exit recursivo, quitar out_transition).
2. **Causa #2 (coordenadas):** elegir UN contrato. El de menor esfuerzo: hacer que `layoutSolver.ts::applyDefault` **NO reste `width/2`** para layers que van a componentes con `translate(-50%,-50%)` (es decir, pasar el centro absoluto, Contrato B), o —más limpio— que los componentes dejen de hacer `translate(-50%,-50%)` y reciban top-left. Hay que unificar A↔B↔C en una sola convención y testearla con `test_layout_solver`.
3. **Causa #3 (fontSize):** que el backend escriba `fontSize` dentro de `style` para componentes `Style*`, o que `StyleTextBlock` lea el prop `fontSize` top-level. Y forzar tamaños de heading ≥ 80 para video móvil.

### Fase B — "Que no vuelva a romperse" (~2-3 días) → muy recomendable
- **Una sola fuente de verdad de componentes:** generar `AVAILABLE_COMPONENTS` (Python) y el set del `spec_validator` **desde `registry.ts`** en build/CI (o exponer un `registry.json` que ambos lados consuman). Test de CI que falle si divergen.
- **Una sola fuente de verdad de props:** generar `ALLOWED_PROPS`/garbage-props desde el tipo de cada componente.
- **Un contrato de coordenadas documentado y testeado**, con un test visual de snapshot por componente.

### Fase C — "Motion graphics dinámicos como Claude" (proyecto, semanas) → cuando A y B estén estables
Aquí sí entra la visión de `analisis_raiz_arquitectura.md`:
- Animaciones por **keyframes** en el spec (`interpolate` de Remotion) en vez de strings `entry:"fade"`.
- Permitir composición con primitivas + grupos flex/grid **delegando 100% el layout al CSS del navegador** (eliminar el cálculo absoluto), y extraer coordenadas reales con `getBoundingClientRect()` para el pase de After Effects.
- Esto es lo que te da libertad tipo "Claude Artifacts" sin compilar React nuevo. Pero **no antes** de tener A+B: construir esto sobre el pipeline actual solo añade un cuarto sistema de coordenadas.

---

## Tabla resumen de causas

| # | Causa raíz | Síntoma visible | Archivo:línea | ¿Lo cubre v6? |
|---|---|---|---|---|
| 1 | Componentes borrados por lista desactualizada | escena1/2 vacías | `component_strategy.py:202, 1518-1535` | ✅ Sí |
| 2 | Tres contratos de coordenadas en conflicto | botón cortado, texto fuera de pantalla | `layoutSolver.ts:285` + `*.tsx translate(-50%,-50%)` | ❌ No |
| 3 | `Style*` ignora `fontSize` top-level | texto a 32px ilegible | `StyleTextBlock.tsx:50` vs backend auto-fit | ❌ No |
| 4 | Duración por palabras ignora TTS real | 3.37s de silencio | `orchestrator.py:144-154` | ✅ Sí |
| 5 | `out_transition` nunca se renderiza | pantallas negras entre escenas | `MainComposition.tsx` (no lee out_transition) | ✅ Sí |

---

## Apéndice — verificaciones realizadas
- `AVAILABLE_COMPONENTS` (85) vs `registry.ts` (109): confirmado, faltan `IconifyIcon` + todos los `Style*`.
- `grep layout_solver` en `backend/app`: solo lo importa `anima_composer/ae_transformer.py` (ruta de After Effects). **No** está en el render de video → el doc de arquitectura se equivocó de archivo.
- `SubscribeButton.tsx`, `StyleTextBlock.tsx`, `IconifyIcon.tsx`: los tres usan `left:${x}; top:${y}; translate(-50%,-50%)` (Contrato B).
- `AnimaText.tsx:251`: usa `calc(50% + ${x}px)` (Contrato C) — distinto de B.
- `layoutSolver.ts:285`: resta `width/2` (Contrato A) — distinto de B y C.
- `MainComposition.tsx`: usa `AnimaComposer` + `nextSceneBackgroundColors`, no lee `out_transition`, no monta `TransitionWrapper`.
- `spec_validator.py:159` Check 9: lista distinta a `AVAILABLE_COMPONENTS`, con componentes fantasma (`StatCard`, `StepByStepGuide`, `EmojiReaction`).
