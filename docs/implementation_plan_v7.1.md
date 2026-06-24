# Implementation Plan v7.1 — Pulido de animación + búsqueda de íconos

**Fecha:** 2026-06-03
**Estado:** Borrador — pendiente de aprobación
**Continúa:** `implementation_plan_v7.md` (Fase A ya aplicada y verificada en producción)
**Trigger:** Segundo render de producción (job `ca35bdfc`). Fase A funcionó (texto legible, íconos visibles, posiciones correctas en 9:16). Quedan 5 problemas de pulido + 1 bug de búsqueda.

---

## Contexto

La Fase A arregló lo grave (componentes borrados, coordenadas, fontSize, silencios). Este lote es **pulido de movimiento + calidad de selección de íconos**. Son cambios pequeños y de bajo riesgo, pero de alto impacto visual.

| # | Problema observado | Causa raíz (verificada en código) | Tipo |
|---|---|---|---|
| 1 | El contenido desaparece ~1.7s antes de que termine la voz (escena 2) | `AnimatedWrapper.tsx:112`: la salida arranca al 75% de la escena | 🔴 |
| 2 | Corte seco entre escenas (sin fade-in de la siguiente) | El backend no añade `entry` por defecto → la escena siguiente aparece de golpe | 🟡 |
| 3 | Íconos/componentes sin animación de entrada | Mismo origen que #2 | 🟡 |
| 4 | Búsqueda de íconos da resultados irrelevantes (score negativo) | `iconify_search.py:78-79`: usa operador `<->` (L2) con índice coseno (`<=>`) | 🔴 |
| 5 | Texto se sobre-encoge (Typewriter 95→28→48) | `spec_validator.py` Check 2 estima ancho como UNA línea, pelea con el auto-fit multilínea | 🟡 |
| 6 | `AnimatedIcon` recibió `size: "color1"` | Respuesta de Gemini partida por `thought_signature` → JSON malformado | 🟢 |

> Nota a tu pregunta: **#4 NO estaba en la Fase B.** La Fase B solo hablaba de verificar embeddings / self-hostear SVGs. El operador equivocado es un bug nuevo y lo traemos a este lote porque es la causa de que los íconos elegidos sean malos.

---

# FASE A.2 — Pulido (rápido, ~2-3 h)

## A2.1 · La salida debe terminar al final de la escena, no al 75% (Problema #1)
**Archivo:** `frontend/src/remotion/AnimatedWrapper.tsx`

**Cambio:** que la animación de salida **termine** justo en el corte de escena, de modo que el contenido siga visible durante TODA la narración.
```ts
// ANTES (línea 112): empieza al 75% → desaparece demasiado pronto
const exitStart = durationInFrames ? Math.floor(durationInFrames * 0.75) : 999999;
// DESPUÉS: la salida ocupa solo los últimos `exitDuration` frames
const exitStart = durationInFrames
  ? Math.max(0, durationInFrames - exitDuration)
  : 999999;
```
Como la escena dura `audio + 0.3s` (padding) tras la Fase A, el contenido queda visible durante toda la voz y solo se desvanece en el último ~0.5s. Sin huecos vacíos.

**Criterio de aceptación:** en escena 2 el texto permanece hasta que la voz termina; el fade ocurre justo al cortar.

## A2.2 · Añadir animación de ENTRADA por defecto (Problemas #2 y #3)
**Archivo:** `backend/app/modules/llm/component_strategy.py` (post-validación, junto al bloque que ya añade `exit`)

**Cambio:** replicar la lógica de "exit por defecto" para `entry`. Si una capa no-fondo no trae `entry`, asignarle uno sensato:
- texto / títulos → `slide-up` o `fade-in`
- íconos / badges / botones → `scale-in` o `spring-in`
- backgrounds (KineticBackground, ParticleField, FloatingBlobs, etc.) → sin entry (aparecen directo)

Con `entryDelay` escalonado pequeño (p.ej. 0.0–0.3s) para que no entren todos exactamente a la vez.

**Efecto combinado:** al tener la escena siguiente animación de entrada, el corte deja de ser seco — el contenido nuevo entra con fade/scale mientras el fondo hace su crossfade. Resuelve la sensación de "no hay transición" sin necesitar aún un componente de transición dedicado.

**Criterio de aceptación:** el ícono del perro (escena 1) y los componentes de escena 2 entran animados, no de golpe.

## A2.3 · Arreglar el operador de búsqueda de íconos (Problema #4)
**Archivo:** `backend/app/services/iconify_search.py`

**Cambio:** usar distancia **coseno** (`<=>`), que es la métrica del índice HNSW (`vector_cosine_ops`):
```python
sql = text("""
    SELECT full_id, prefix, name,
           1 - (embedding <=> CAST(:embedding AS vector)) AS score
    FROM iconify_icons
    ORDER BY embedding <=> CAST(:embedding AS vector)
    LIMIT :limit
""")
```
(antes `<->` = L2, que ni usa el índice ni da el ranking correcto → scores negativos y resultados irrelevantes).

**Verificación tras el cambio (en tu VPS):**
```
docker compose -f docker-compose.prod.yml exec api python -c "from app.db.session import SessionLocal; from app.services.iconify_search import find_best_icons; db=SessionLocal(); print(find_best_icons(db,'batería sin energía',limit=3))"
```
**Criterio de aceptación:** scores positivos (~0.4–0.9) y resultados semánticamente relevantes (algo de batería/energía, no wifi).

> Si tras el fix los scores siguen siendo bajos/negativos, el problema sería de los embeddings almacenados (modelo o `task_type` distinto al de la query `gemini-embedding-2`/RETRIEVAL_QUERY/768) → habría que re-embeddear las 43k filas con `task_type=RETRIEVAL_DOCUMENT`. Eso ya es tarea de datos (script batch), lo dejamos como contingencia.

## A2.4 · Reconciliar el ajuste de texto (Problema #5)
**Archivo:** `backend/app/modules/llm/spec_validator.py` (Check 2)

**Problema:** Check 2 calcula `estimated_width = len(text) * fontSize * 0.6` asumiendo **una sola línea**, así que cualquier texto largo "desborda" y lo encoge brutalmente (95→28), peleándose con el auto-fit multilínea de `component_strategy` que ya lo ajustó bien.

**Cambio:** que Check 2 use la **misma estimación multilínea** que `_auto_fit_layer_text` (considerando wrap en `maxWidth` y altura disponible), o directamente **eliminar Check 2** y confiar en el auto-fit (que es el sistema correcto). Recomendado: eliminar Check 2 y dejar solo el auto-fit + Check 10 (mínimo 48).

**Criterio de aceptación:** el Typewriter de escena 2 conserva un tamaño grande (≥80) en vez de bajar a 48.

## A2.5 · Saneo de `size` malformado (Problema #6)
**Archivo:** `backend/app/modules/llm/component_strategy.py`

**Cambio:** en el post-procesado, si `size` no es numérico (p.ej. `"color1"`, `""`, `None`), eliminarlo para que el componente use su default. Añadir `size` a la coerción/saneo numérico que ya existe. (El frontend ya tolera esto con `Number(size) || 120` tras la Fase A; esto es defensa adicional en backend.)

---

# Actualización de FASE B (no cambia el alcance, se añade 1 ítem)

La Fase B sigue igual (fuente única de verdad de componentes/props, self-host de SVGs) y se le **añade**:

- **B5 · Robustez de la respuesta de Gemini.** Los warnings `there are non-text parts in the response: ['thought_signature']` están partiendo el JSON (causa del `size: "color1"`). Investigar el parser de `client.py` para concatenar correctamente todas las `parts` o desactivar el "thinking" en `gemini-3.1-flash-lite` para esta llamada. Es la causa raíz de varios JSON malformados.

---

# FASE C — Transiciones reales (sin cambios, sigue siendo proyecto aparte)

Lo de A2.2 da una transición "suficiente" (entrada animada + crossfade de fondo). Una transición de escena **dedicada** (wipe, zoom-blur, etc. con `TransitionWrapper` cableado en `MainComposition`) sigue siendo Fase C, junto con flex/grid por CSS real y keyframes. No se hace ahora.

---

## Orden y esfuerzo (Fase A.2)

| Paso | Tarea | Archivo | Esfuerzo |
|---|---|---|---|
| 1 | A2.3 operador coseno íconos | `iconify_search.py` | 10 min |
| 2 | A2.1 timing de salida | `AnimatedWrapper.tsx` | 15 min |
| 3 | A2.2 entrada por defecto | `component_strategy.py` | 45 min |
| 4 | A2.4 reconciliar ajuste de texto | `spec_validator.py` | 30 min |
| 5 | A2.5 saneo de size | `component_strategy.py` | 15 min |

**Validación end-to-end:** regenerar el job del guion del perro y verificar:
- El contenido no desaparece antes de que termine la voz.
- Íconos y texto entran animados; el cambio de escena se siente fluido.
- Los íconos elegidos son semánticamente correctos (scores positivos).
- El Typewriter mantiene tamaño grande.

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El operador `<=>` no mejora (embeddings mal generados) | Contingencia: re-embeddear 43k con task_type RETRIEVAL_DOCUMENT |
| Entradas por defecto saturan escenas muy cortas (escena 3 = 1.69s) | Escalonar `entryDelay` pequeño y limitar entryDuration a ~10 frames si la escena < 2.5s |
| Eliminar Check 2 deja pasar texto que sí desborda | El auto-fit multilínea ya cubre ese caso; Check 10 mantiene el mínimo |
