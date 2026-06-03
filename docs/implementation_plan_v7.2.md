# Implementation Plan v7.2 — Arreglar el "cerebro" de selección + pulido visual

**Fecha:** 2026-06-03
**Estado:** Borrador — pendiente de aprobación
**Continúa:** `implementation_plan_v7.1.md` (Fase A.2 ya aplicada)
**Trigger:** 3er render (job `c5d28453`). Animación y posiciones bien; quedan calidad de selección (íconos/componentes) y pulido visual.

---

## Diagnóstico raíz (lo importante)

El motivo de que los videos salgan "puro texto" NO es falta de componentes ni la Fase B. Son dos bugs que **apagan la selección inteligente**:

1. **Mismatch de modelo de embeddings.** Las tablas (`iconify_icons`, `components`) se poblaron con **`all-mpnet-base-v2`** (lo dice `embedding.py:18`), pero las búsquedas usan **`gemini-embedding-2`**. Espacios vectoriales distintos → similitud ≈ ruido (scores ~0.11, resultados irrelevantes). 768 dims en ambos NO los hace compatibles.
2. **429 de cuota Gemini → selección ALEATORIA.** `embedding.py` cae a "random selection" cuando el embedding falla por cuota. Eso eligió `HighlightText` (para frases cortas) en un párrafo → la "caja amarilla" rota.

Mientras estos dos no se arreglen, el LLM compone casi a ciegas.

---

# FASE A.3

## Prioridad 1 — Reparar el motor de embeddings (lo que más impacto tiene)

### A3.1 · Unificar el modelo de embeddings (query == datos almacenados)
**Problema:** query (`gemini-embedding-2`) ≠ datos (`all-mpnet-base-v2`). Hay que usar **UN solo modelo** de punta a punta.

**Verificación previa (en el VPS, 2 min):** confirmar con qué modelo están las 43k filas. Re-embeddear 1 ícono con `gemini-embedding-2` y comparar coseno con su vector almacenado. Si es ~0.1 → confirmado mismatch (datos = mpnet).

**Dos caminos (DECISIÓN TUYA):**

| | **Opción A — Local (mpnet)** | **Opción B — Todo Gemini** |
|---|---|---|
| Qué se hace | Añadir `sentence-transformers` al backend y generar las queries con `all-mpnet-base-v2` (coincide con las 43k ya almacenadas) | Re-embeddear las 43k filas (+componentes) con `gemini-embedding-2` para que coincidan con la query actual |
| Pros | **Gratis, sin cuota (mata el 429)**, sin re-embeddear nada, datos ya listos | Stack ligero (sin torch) |
| Contras | +~2GB a la imagen Docker (torch), embedding en CPU (~decenas de ms) | 43k llamadas API (cuota/tiempo), y el 429 sigue vivo en cada query |
| Recomendación | ✅ **Recomendada** para producción (robusta, sin depender de cuota externa) | Solo si no quieres torch en la imagen |

> Recomiendo **Opción A**: resuelve el mismatch Y el 429 de una vez, y es gratis por escena. Si la eliges, te preparo el cambio en `embedding.py` + `iconify_search.py` para usar el modelo local, y un script de verificación.

### A3.2 · Que el 429 NO caiga en selección aleatoria silenciosa
**Archivo:** `backend/app/services/embedding.py`
- Añadir **retry con backoff** a la llamada de embedding (1-2 reintentos).
- Si aún falla: en vez de selección **aleatoria**, usar un **set curado por defecto** (p.ej. `StyleTextBlock` + `IconifyIcon` + 1 background) y **loguear fuerte** el fallback.
- (Con Opción A esto casi no se dispara, pero queda como red de seguridad.)

---

## Prioridad 2 — Pulido visual (rápido)

### A3.3 · `HighlightText` mal elegido para párrafos
**Archivos:** `component_strategy.py` (prompt + post-proceso)
- **Post-proceso:** si `HighlightText` (u otros de énfasis corto) recibe `text` de más de ~40 caracteres, **convertirlo a `StyleTextBlock`** (o `Typewriter`). Es la causa de la "caja amarilla".
- **Prompt:** aclarar que `HighlightText` es solo para resaltar 1-4 palabras; para frases/párrafos usar `StyleTextBlock`/`Typewriter`.

### A3.4 · Texto demasiado grande / denso
**Archivos:** `component_strategy.py` (`_auto_fit_layer_text`)
- Bajar el techo del auto-fit: usar ~**45-50% de altura** (hoy 60%) y un **máx. de líneas** (~5) para texto hablado, de modo que un párrafo largo se reduzca a un tamaño cómodo en lugar de llenar la pantalla.
- Resultado: el texto de escena 1 dejaría de ocupar 11 líneas gigantes.

### A3.5 · Componentes `Style*` con tamaños web (badge minúsculo)
**Archivos:** `StyleBadge.tsx` (y revisar `StyleChip`, `StyleDivider`, `StyleCard` con el mismo patrón `sizeMap`)
- Subir `sizeMap` a escala de video: p.ej. `sm: 28px`, `md: 36px`, `lg: 48px` (hoy 12/14/16) y padding proporcional.
- Criterio: el badge "¡Comenta abajo!" se ve legible (no minúsculo).

### A3.6 · El fade de salida se come la última palabra
**Archivos:** `orchestrator.py` (+ posiblemente `AnimatedWrapper.tsx`)
- Añadir una **cola de lectura** tras el audio: subir el padding de salida a ~**0.6-0.8s** (hoy 0.3s) **solo como ventana para el exit**, de modo que la última palabra hablada quede totalmente visible y el fade ocurra DESPUÉS de que termine la voz.
- Alternativa fina: que el `exitStart` se calcule respecto al **fin del audio** (no solo fin de escena), dejando la palabra final visible.
- Criterio: en escena 2, "Comenta abajo" se ve completo antes de desvanecerse.

---

## Prioridad 3 — (Opcional) Densidad de texto por escena
**Archivo:** `segmentation/service.py`
- 112 caracteres en una escena de 5.95s es mucho. Bajar el objetivo de palabras/escena para que cada escena tenga menos texto y más respiro visual. Mejora la sensación de "no es solo un muro de texto".

---

## Qué NO es esto (aclaración)
- **Fase B** sigue siendo aparte (sync de listas en CI, self-host de SVGs, parser de Gemini `thought_signature`). No añade riqueza visual.
- **Fase C** (transición dedicada, flex/grid CSS real, keyframes) sigue aparte.

---

## Orden y esfuerzo

| Paso | Tarea | Bloqueante | Esfuerzo |
|---|---|---|---|
| 1 | A3.1 unificar embeddings (decisión A/B) | **Decisión tuya** | A: 1-2 h + build; B: script + horas de re-embed |
| 2 | A3.2 resiliencia 429 | — | 30 min |
| 3 | A3.3 HighlightText→StyleTextBlock | — | 30 min |
| 4 | A3.4 techo de auto-fit | — | 30 min |
| 5 | A3.5 tamaños video en Style* | — | 30 min |
| 6 | A3.6 cola de lectura / exit | — | 30 min |
| 7 | A3.7 densidad de texto (opcional) | — | 30 min |

**Decisión que necesito de ti para empezar:** ¿Opción **A** (modelo local mpnet, recomendada) u **Opción B** (re-embeddear todo con Gemini) para A3.1? El resto (A3.2–A3.6) lo puedo hacer sin que decidas nada.

**Validación final:** regenerar el guion del perro y verificar: íconos relevantes (no wifi), texto a tamaño cómodo, badge legible, última palabra visible antes del fade, y selección de componentes coherente (sin 429/aleatorio).
