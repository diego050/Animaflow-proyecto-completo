# ADR-010 — Visual Quality v7: posicionamiento, selección, animación sincronizada

**Fecha:** 2026-06-03
**Estado:** Implementado (Fase A, A.2, A.3, v7.3) — Fase B/C pendientes
**Contexto previo:** [analisis-causa-raiz-produccion-v3.md](./analisis-causa-raiz-produccion-v3.md), ADR-009 (v5)
**Supersede operativamente:** los parches de `implementation_plan_v6.md`

---

## Contexto

Los videos en producción salían rotos: escenas vacías, texto invisible o gigante,
botones recortados, silencios y cortes secos. El diagnóstico (ver análisis v3)
encontró que **no faltaban componentes ni fallaba el LLM**: el pipeline de
post-procesado borraba/descolocaba lo que el LLM generaba bien, y la selección
de íconos/componentes estaba apagada por bugs de embeddings y cuota.

Este ADR documenta las decisiones y cambios implementados para resolverlo.

---

## Decisiones por fase

### Fase A — "Que se vea" (crítico)

| Causa | Decisión | Archivos |
|---|---|---|
| Componentes borrados por lista desincronizada | `AVAILABLE_COMPONENTS` = 109 del registry; `spec_validator` reutiliza esa lista (fuente única manual + test) | `component_strategy.py`, `spec_validator.py`, `tests/test_component_registry_sync.py` |
| Tres contratos de coordenadas en conflicto | **Contrato único: "centro absoluto"**. El solver emite el centro; cada componente/primitiva aplica `translate(-50%,-50%)` | `layoutSolver.ts`, 7 primitivas `Anima*` |
| `Style*` ignoraba `fontSize` → texto 32px | Leer `fontSize` top-level; defaults grandes (heading 88) | `StyleTextBlock.tsx`, `StyleScrambleText.tsx` |
| Duración por palabras → silencios | Confiar en duración real del TTS + padding | `orchestrator.py` |
| `out_transition` código muerto | Eliminado del prompt y schema; campo Pydantic deprecado | `component_strategy.py`, `schemas/spec.py` |

**Contrato de coordenadas (decisión arquitectónica clave):**
- El `spec.json` guarda `x/y` como **offset desde el centro del lienzo** (x:0 = centro). Esto NO cambió.
- `layoutSolver.ts::applyDefault` ahora emite el **centro absoluto** (`centerX + offsetX`), sin restar `width/2`.
- Componentes y primitivas usan `left:x; top:y; transform: translate(-50%,-50%)` → se centran sobre ese punto, robustos a contenido de tamaño variable.
- Funciona en **todos los formatos** (9:16, 16:9, 1:1, 4:5…): el centro se calcula con las dimensiones reales del lienzo.

### Fase A.2 — Pulido de animación + búsqueda

| Causa | Decisión | Archivos |
|---|---|---|
| Contenido desaparecía antes de terminar la voz | Salida en los últimos `exitDuration` frames (antes 75%); `exitDuration` en frames (antes 0.5 = medio frame) | `AnimatedWrapper.tsx`, `component_strategy.py` |
| Componentes sin animación de entrada | `entry` por defecto por tipo (texto→slide-up, icono/UI→scale-in) con escalonado | `component_strategy.py` |
| Búsqueda de íconos irrelevante (score negativo) | Operador `<=>` (coseno) en vez de `<->` (L2), coincide con el índice HNSW | `iconify_search.py` |
| Texto sobre-encogido (95→28→48) | Eliminado Check 2 del validador (estimaba 1 línea); el auto-fit multilínea es el único que dimensiona | `spec_validator.py` |
| `size: "color1"` malformado | Saneo de `size` no numérico | `component_strategy.py` |

### Fase A.3 — Calidad de selección + composición

| Causa | Decisión | Archivos |
|---|---|---|
| Embeddings de íconos en modelo distinto (mpnet) al de la query (gemini) → similitud ruido | **Decidido: todo Gemini, 768 dims.** Script de re-embeddeo por lotes, reanudable | `scripts/reembed_icons.py` |
| 429 → selección ALEATORIA de componentes | Reintento con backoff + **fallback CURADO** (no aleatorio) | `embedding.py` |
| `HighlightText` (énfasis corto) con párrafos → caja rota | Swap a `StyleTextBlock` si texto > 40 chars | `component_strategy.py` |
| Texto demasiado grande | Techo del auto-fit 0.6 → 0.5 de altura | `component_strategy.py` |
| Badges minúsculos | `Style*` sizeMap a escala de video | `StyleBadge.tsx` |
| Muro de texto por escena | Segmentación target 7s→5s, tolerancia 1.3→1.15 | `segmentation/service.py` |

**Decisión sobre íconos (revisada):** se **descartó el self-host de SVGs** (servidor
chico). Arquitectura MVP: tabla `iconify_icons` (43k nombres + embeddings, ya
existe) + búsqueda coseno determinista + re-embeddeo con Gemini @768 + SVG desde
el CDN público (`api.iconify.design`) con `onError` para no tumbar el render.
Multi-ícono por escena ya soportado.

### v7.3 — Texto sincronizado al audio (karaoke)

| Decisión | Archivos |
|---|---|
| **Plumbing de `word_timestamps`**: MainComposition los convierte a relativos a la escena; AnimaComposer los inyecta a todos los componentes vía contexto | `MainComposition.tsx`, `AnimaComposer.tsx` |
| Karaoke (reveal sincronizado al audio) en los 4 componentes de texto | `Typewriter.tsx`, `TextReveal.tsx`, `StyleTextBlock.tsx`, `StyleScrambleText.tsx` |
| `Typewriter` recibe `durationInFrames` y acompasa el tecleo a la escena | `AnimaComposer.tsx`, `Typewriter.tsx` |
| Scramble **determinista** (elimina `Math.random`, reproducible en render distribuido) | `StyleScrambleText.tsx` |

**Habilitador futuro:** con `wordTimestamps` llegando a todos los componentes,
cualquier componente futuro puede disparar una animación en una palabra concreta
(`wordTimestamps.find(w => w.word.includes('clave')).start * fps`).

---

## Impacto en la exportación a After Effects

**Ninguno.** El export a AE es una ruta separada:
- Usa `anima_composer/ae_transformer.py` + el **`layout_solver.py` de Python**
  (NO el `layoutSolver.ts` del frontend).
- El cambio de contrato de coordenadas fue solo en el frontend; el spec sigue
  guardando `x/y` como offset desde el centro, y el solver de Python quedó intacto.
- El `ae_transformer` lee `type`, `x/y`, `text`, `fontSize`, `fill`, `style`
  (sin cambios de significado) e ignora `entry`/`exit`/`out_transition`.

**Gap preexistente (no causado por esta fase):** el `ae_transformer` solo maneja
tipos primitivos (`text`, `rect`, `circle`, `path`, `image`, `group`, `particles`).
`_component_to_ae` está definida pero **nunca se invoca**, y no hay rama para
`type: "component"`. Como las escenas actuales son mayormente `type: "component"`,
el export a AE ya renderizaba solo el texto plano y omitía los componentes. Es un
frente aparte para cuando se retome AE; esta fase ni lo mejoró ni lo empeoró.

---

## Pendiente

### Fase B — Robustez / anti-regresión
- **B1** Fuente única de verdad de componentes generada desde `registry.ts` + check de CI.
- **B2** Fuente única de verdad de props (desde tipos de componente).
- **B3** Contrato de coordenadas documentado + tests de snapshot visual.
- **B4** Íconos: casi resuelto (re-embeddeo). Sin self-host. Posible caché LRU de SVG usados.
- **B5** 🔴 Parser de respuestas de Gemini: el warning `thought_signature` parte el JSON
  (causa de `size:"color1"` y capas duplicadas). Leer todas las `parts` o desactivar
  "thinking" en la llamada de composición.

### Decisión: la IA es orquestadora, no dibujante 🔴
Confirmado empíricamente (la IA dibujaba un corazón como el borde de un boomerang):
los LLM no generan geometría vectorial usable. **Decisión canónica:** el tipo `path`
(y `rect`/`circle` libres) queda **PROHIBIDO** para el LLM; el vocabulario de formas
son íconos pre-hechos (Iconify) + componentes. Esto **rechaza** la recomendación del
`analisis_raiz_arquitectura.md` de "abolir la restricción de primitivas". Ver
`coordinate-contract.md` y `fase-c-plan.md`.

### Fase C — Motion graphics dinámicos (detalle en `fase-c-plan.md`)
- **C1** Componentes reactivos a la palabra (usan `wordTimestamps`).
- **C2** Transición de escena dedicada (cablear `TransitionWrapper` en `MainComposition`).
- **C3** Flex/grid por CSS real (eliminar el cálculo de posiciones de hijos en el solver).
- **C4** ✅ Guía de prompt anti-muro-de-texto (regla 4.1).
- **C5** Ampliar biblioteca **+ auditar y refactorizar los 109 componentes** (bugs,
  determinismo, tamaños de video, editabilidad por la IA).
- **C6** (opcional) keyframes para control fino de animación (NO para dibujar).
- AE: manejar `type: "component"` (cerrar el gap preexistente) o pase de
  `getBoundingClientRect()` post-render.

---

## Operación

- **Re-embeddeo de íconos (una vez):** `python scripts/reembed_icons.py` dentro del
  contenedor `api`, con `GEMINI_API_KEY` en el entorno. Por lotes, reanudable.
- **Deploy:** cambios de frontend requieren rebuild de Remotion; backend requiere
  redeploy del `api`.

## Tests
- `tests/test_component_registry_sync.py` — backend == registry (anti-regresión del bug original).
- `tests/test_spec_validator.py` — actualizado (Check 2 eliminado).
- `tests/test_layout_solver.py` — solver de AE (Python), sin cambios.
