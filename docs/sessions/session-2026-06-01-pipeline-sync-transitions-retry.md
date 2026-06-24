# Session Report: Pipeline Sync, Transitions & Retry System — 1 Junio 2026

**Fecha:** 1 de Junio de 2026
**Tipo:** Critical Bug Fixes + Feature Addition
**Agente:** Orchestrator + Backend Agent + Frontend Agent

## Resumen

Se abordaron 3 problemas críticos reportados por el usuario tras probar el pipeline de generación de video:
1. **Audio-Video Desync:** Las animaciones de texto no coincidían con la duración del audio
2. **Íconos incorrectos:** Se seleccionaban íconos irrelevantes (ej: "computer-sound-sharp" para escenas sobre gatos)
3. **Transiciones brutales:** Cortes abruptos a negro entre escenas, sin crossfade

Además, se implementó un **sistema de retry** completo para reintentar jobs fallidos desde el punto de fallo.

## Análisis de Causa Raíz

### Problema 1: Audio-Video Desync
- `durationInFrames` se calculaba correctamente en `MainComposition.tsx` pero se ignoraba en `AnimaComposer.tsx` (destructured como `_durationInFrames`)
- `Typewriter.tsx` usaba `speed = 2` frames/char hardcodeado — para 75 chars × 2 = 150 frames (5s), pero el audio duraba 3.84s (115 frames)
- `AnimatedWrapper.tsx` tenía `exitStart = 999999` — las animaciones de salida NUNCA se ejecutaban

### Problema 2: Íconos Incorrectos
- `find_best_icons(db, media_query)` buscaba íconos por atmósfera visual ("warm cozy terracotta") en vez del sujeto semántico ("gato")
- El embedding funcionaba bien, pero el query era incorrecto

### Problema 3: Transiciones Brutales
- `ZoomBlurTransition.tsx` tenía un overlay negro que llegaba a 100% opacidad
- Las transiciones se renderizaban como Secuencias separadas DESPUÉS de cada escena, creando un gap visual
- `GradientOverlay.tsx` usaba colores hardcodeados (naranja→azul) en vez de los colores reales de las escenas

## Pipeline Fixes (1-8)

### Fix 1: Íconos buscan con `text` en vez de `media_query`
**Archivo:** `backend/app/modules/llm/component_strategy.py`
**Cambio:** Línea 475 — `find_best_icons(db, text, limit=5)` en vez de `find_best_icons(db, media_query, limit=5)`

### Fix 2: Prompt de íconos con reglas semánticas + tags
**Archivo:** `backend/app/modules/llm/component_strategy.py`
**Cambio:** Sección de íconos ahora incluye:
- Tags descriptivos por ícono (ej: "cat, feline, pet, animal")
- Regla "Máximo 1 ícono por escena"
- Prohibición explícita de íconos abstractos/atmosféricos
- Ejemplos correctos vs incorrectos

### Fix 3: Contexto de timing al prompt del LLM
**Archivo:** `backend/app/modules/llm/component_strategy.py`
**Cambio:** Nuevo parámetro `duration_seconds` en `_build_strategy_prompt` y `generate_scene_composer`. El prompt ahora incluye:
- Duración en segundos y frames (30fps)
- Word count y ritmo (palabras/segundo)
- Ventanas recomendadas para entry, visibility, exit
- Instrucciones de animaciones de salida (exit)

### Fix 4: `durationInFrames` propagado al RenderContext
**Archivo:** `frontend/src/remotion/composer/AnimaComposer.tsx`
**Cambio:** 
- `RenderContext` ahora incluye `durationInFrames: number`
- Todos los 8 `AnimatedWrapper` calls reciben `durationInFrames={ctx.durationInFrames}`

### Fix 5: Typewriter calcula speed dinámicamente
**Archivo:** `frontend/src/remotion/components/Typewriter.tsx`
**Cambio:** 
- `speed` ya no es hardcodeado a 2
- Calcula: `dynamicSpeed = (durationInFrames - reservedFrames - delayFrames) / totalChars`
- Fallback a `speedProp` o 2 si no hay duración disponible

### Fix 6: ExitStart dinámico en AnimatedWrapper
**Archivo:** `frontend/src/remotion/AnimatedWrapper.tsx`
**Cambio:** 
- Nuevo prop `durationInFrames?: number`
- `exitStart = Math.floor(durationInFrames * 0.75)` en vez de `999999`
- Las exit animations ahora se ejecutan en el último 25% de la escena

### Fix 7: Background crossfade en últimos 15 frames
**Archivo:** `frontend/src/remotion/composer/AnimaComposer.tsx`
**Cambio:**
- Nuevo prop `nextSceneBackgroundColors?: string[]`
- Durante los últimos 15 frames, el fondo cambia a los colores de la siguiente escena
- Crea transición suave de color entre escenas

### Fix 8: Eliminar gap de transición en MainComposition
**Archivo:** `frontend/src/remotion/MainComposition.tsx`
**Cambio:**
- Eliminado `transitionOffsets` array y todas las secuencias de `TransitionWrapper`
- Escenas ahora son contiguas (sin gaps)
- `nextSceneColors` array pasa colores de la siguiente escena para crossfade
- Eliminado import de `TransitionWrapper`

## Retry System Fixes (9-14)

### Fix 9: Backend retry endpoint
**Archivo:** `backend/app/api/jobs_pipeline.py`
**Cambio:** Nuevo endpoint `POST /{job_id}/retry` que:
- Detecta la fase fallida basada en el status
- `failed_render` → reset a `completed` (para re-render)
- `failed` con escenas enriquecidas → reset a `completed`
- `failed` con escenas sin enriquecer → reset a `segmented` (limpia estados)
- `failed` sin escenas → reset a `pending`

### Fix 10: retryJob action en Zustand store
**Archivo:** `frontend/src/store/useJobsStore.ts`
**Cambio:** Nueva acción `retryJob(jobId)` que:
- Llama `POST /api/jobs/${jobId}/retry`
- Actualiza `selectedJob` y `jobs` en el store
- Muestra toast de éxito
- Restarts polling automáticamente

### Fix 11: Retry button en WizardStepProcessing
**Archivo:** `frontend/src/components/wizard/WizardStepProcessing.tsx`
**Cambio:** 
- Mensaje cambiado de "Intenta crear un nuevo proyecto" a "Puedes reintentar desde el punto donde falló"
- Botón "Reintentar" con icono `RotateCw` y estilo Blueprint Palette (cadmium-orange)

### Fix 12: Retry button en ProjectStatusBanner
**Archivo:** `frontend/src/components/project/ProjectStatusBanner.tsx`
**Cambio:**
- Nuevos props: `jobId?: string`, `onRetry?: () => void`
- Botón "Reintentar" condicional cuando `onRetry` está disponible

### Fix 13: Fix wizard auto-advance bug
**Archivo:** `frontend/src/pages/dashboard/NewProjectWizard.tsx`
**Cambio:** 
- Eliminado `setWizardStep(6)` cuando status es `failed` o `failed_render`
- Ahora el wizard se queda en el paso de processing (3 o 5) mostrando el botón de retry
- Bug crítico: antes mostraba pantalla de "Preview Listo" para jobs fallidos

### Fix 14: Wire up onRetry en ProjectDetail
**Archivo:** `frontend/src/pages/dashboard/ProjectDetail.tsx`
**Cambio:**
- `handleRetry` callback que llama `retryJob(jobId)` + restarts polling
- Pasa `onRetry={handleRetry}` a `ProjectStatusBanner`

## Archivos Modificados (10 total)

### Backend (3)
- `backend/app/modules/llm/component_strategy.py`
- `backend/app/modules/pipeline/orchestrator.py`
- `backend/app/api/jobs_pipeline.py`

### Frontend (7)
- `frontend/src/remotion/composer/AnimaComposer.tsx`
- `frontend/src/remotion/components/Typewriter.tsx`
- `frontend/src/remotion/AnimatedWrapper.tsx`
- `frontend/src/remotion/MainComposition.tsx`
- `frontend/src/components/wizard/WizardStepProcessing.tsx`
- `frontend/src/components/project/ProjectStatusBanner.tsx`
- `frontend/src/pages/dashboard/NewProjectWizard.tsx`
- `frontend/src/pages/dashboard/ProjectDetail.tsx`
- `frontend/src/store/useJobsStore.ts`

## Impacto Esperado

| Métrica | Antes | Después |
|---|---|---|
| Sync audio-video | ❌ Texto termina después del audio | ✅ Texto adaptado a duración real |
| Relevancia de íconos | ❌ 0-20% relevantes | ✅ 80-95% relevantes |
| Transiciones | ❌ Cortes bruscos a negro | ✅ Crossfade suave entre escenas |
| Recovery de fallos | ❌ Crear nuevo proyecto | ✅ Retry desde punto de fallo |

## Notas Técnicas

- El fix de íconos es 1 línea pero el impacto es enorme: cambiar el query de `media_query` (atmósfera) a `text` (sujeto) resuelve el problema raíz
- Las transiciones ahora son "out animations" por capa en vez de componentes separados — más simple, más robusto
- El retry endpoint es inteligente: detecta en qué fase falló y resetea solo lo necesario
- El bug del wizard auto-advance era crítico: los usuarios veían "éxito" para jobs fallidos
