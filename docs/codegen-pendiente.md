# Code-gen de animaciones — Lo que falta / qué sigue

**Contexto:** ver `docs/adr-012-codegen-animaciones.md`. Esto es la hoja de ruta de lo PENDIENTE
después de la Fase 3 (code-gen consciente de escena, detrás de flag, ya construido).

Estado a jun 2026: **Fase 0 (prototipo admin), Fase 2 (render mp4), Fase 3 (pipeline) = HECHAS.**
**Code-gen es ahora el motor PRIMARIO** (`SCENE_ENGINE` default = `codegen`); la orquestación
quedó como **fallback automático por escena** (si el code-gen sale inválido/excepción, esa escena
cae al catálogo en vez de romper el video). Lo de abajo es lo que sigue.

---

## 0. Validación inmediata (antes de seguir)
- [ ] **Probar la fuente de la Fase 2:** regenerar una animación con texto y comparar preview vs
      mp4 → deben coincidir (Inter cargada en ambos).
- [ ] **Probar la Fase 3 end-to-end:** `SCENE_ENGINE=codegen` en `backend/.env` + reiniciar api →
      generar un video completo → ver que cada escena es code-gen y suena con el audio.
- [ ] **A/B:** comparar `codegen` vs `orchestration` en el mismo guion para confirmar la mejora.

---

## 1. Calidad y consistencia (corto plazo)
- [x] **Sync de audio (bug arreglado):** los `wordTimestamps` se almacenan GLOBALES pero el
      code-gen los necesita RELATIVOS a la escena. Antes apuntaban a frames fuera de la escena →
      ahora se restan `start_time_seconds` antes de pasarlos. *(Falta: validar que la IA realmente
      sincroniza con ellos; si no, pasar el timing más estructurado.)*
- [x] **Responsivo (no hardcode de tamaño):** el prompt + few-shot ahora usan `useVideoConfig()`
      (width/height) en vez de 1080×1920 fijos → funciona en cualquier proporción.
- [ ] **Gaps preview↔render menores:** gradientes/alpha se ven algo distintos en Chromium headless.
      Opcional: pedir a la IA evitar `radial-gradient` con alpha muy baja, o aceptar el ~80%.
- [ ] **Duración exacta:** asegurar que la animación ocupa TODA la duración de la escena (que no
      termine antes/después). El prompt ya da los frames; validar en render.
- [ ] **Consistencia de calidad:** medir cuántas generaciones salen buenas vs mediocres (varianza).
      Si es alta, mejorar el few-shot / subir a un modelo más fuerte para el pipeline.

## 2. Robustez / fallback (importante para producción)
- [x] **Cascada de fallback (HECHA):** si el code-gen sale inválido o lanza excepción → la escena
      usa un **respaldo seguro autocontenido** (`fallback_scene_code`: texto sobre fondo, siempre
      válido, sanitiza inyección). YA NO usa el orquestador (sacado del camino activo; solo corre si
      `SCENE_ENGINE=orchestration` explícito).
- [x] **ErrorBoundary en CustomCode (HECHO):** atrapa errores de RUNTIME (los que pasan validación
      pero truenan al renderizar) → muestra un fallback en vez de tumbar el render del video.
- [x] **Sandbox del render server-side (HECHO, nivel código):** el `/smoke-test` pasó de `new
      Function` a **`vm.runInNewContext`** con contexto mínimo (sin `process`/`require`-real/`Buffer`)
      + timeout 2s. El render usa `timeoutInMilliseconds: 30000` (mata frames colgados). Pendiente
      (infra, a escala): worker aislado / cgroups / seccomp si se abre a usuarios masivos.
- [x] **Config tuneable desde la DB (HECHO):** `services/settings_store.py` (get/set sobre
      `admin_settings`, cache 60s, fallback a default de código). Wired: `codegen.model_override`,
      `codegen.temperature`, `codegen.max_attempts`, `flywheel.enabled`. Endpoint admin
      `GET/PUT /api/admin/animations/settings`. Solo NO-secretos; DB_URL/claves/API keys siguen en env.
- [x] **Smoke-test en generación (HECHO):** tras pasar el validador regex, el código se COMPILA de
      verdad (sucrase) y se verifica que exporte un componente, en el render-server (`POST /smoke-test`).
      Si falla (sintaxis/estructura) → el error exacto se le devuelve a la IA y reintenta. Best-effort
      (si el render-server no responde, no bloquea). Atrapa el JS roto que el regex no ve.
      *(Pendiente opcional: detectar errores de RUNTIME dentro del componente — requeriría renderStill
      con un wrapper estricto; hoy el ErrorBoundary los degrada a texto sobre fondo.)*

## 3. El flywheel de ejemplos (el moat de largo plazo)
- [x] **Persistencia (HECHO):** tabla `generated_animations` (modelo + migración `b3d5f7h9j1k2`,
      que además mergea los 2 heads de alembic que existían). Campos: code, prompt_text,
      art_direction, model, valid, status, tokens_in/out/total, duration_frames, aspect_ratio,
      approved, rating, embedding (Vector 768). Se guarda en TODOS los puntos de generación
      (`animation_store.save_generated_animation`, best-effort): pipeline, edición, regeneración,
      prototipo admin. ⚠️ La migración es MANUAL en deploy (`alembic upgrade head`).
- [x] **Curación + embedding (HECHO):** al RENDERIZAR un video (señal: el usuario lo aceptó),
      `flywheel.approve_and_embed_job` marca `approved=True` + embebe las escenas code-gen (no los
      fallbacks). Hook en `scheduler.py` tras render exitoso. Best-effort.
- [x] **Retrieval (HECHO):** `generate_scene_animation` llama `flywheel.get_flywheel_examples`
      (cosine sobre `embedding`, HNSW) → inyecta hasta 2 ejemplos aprobados parecidos como few-shot
      (si no hay, usa el estático). Guard: si el pool está vacío, NO gasta llamada de embedding.
- [ ] **Mejora futura:** UI admin para curar/rating manual (hoy la aprobación es solo auto-al-render);
      dedup de ejemplos casi-idénticos; cap del tamaño de los ejemplos inyectados.

## 4. Export a After Effects (universal)
- [x] **Opción 1 — Footage por escena (HECHO, MVP):** el render-server soporta `codec: "prores"`;
      `footage_exporter.py` renderiza CADA escena code-gen a ProRes (.mov) y arma un zip (una escena
      por archivo = capa editable en AE) + LEEME. El endpoint `/export/after-effects` ahora dispara
      footage en background (reusa `_ae_export_*` → frontend sin cambios). Pendiente probar en server.
      *(Mejoras futuras: incluir audio por escena, opción video-completo, secuencia PNG con alpha.)*
- [ ] **Opción 2 — Traductor ~80% editable (después, si se necesita):** convertir el componente a
      capas nativas de AE (transforms/shapes/text/gradientes → keyframes). Mejor enfoque: **samplear
      el render frame por frame** (robusto a springs/Math.sin) + mapear apariencia de cada elemento.
      Constreñir el prompt a "estructura traducible" lo hace más fiable. Mensaje al usuario:
      *"no prometemos idéntico, pero ~80% parecido; edita el resto"* o descarga mp4.
- [ ] Documentado en ADR-012 §6; los bloques AE por-componente actuales quedan legacy.

## 5. Producto / UX
- [x] **Edición por-escena en el editor (HECHO):** caja "Cambiar esta animación" en cada escena
      code-gen (`SceneEditorCard`). Llama `POST /{job}/scenes/{i}/edit-code` (instrucción NL →
      `generate_animation` con previous_code+edit_instruction, 3 intentos de repair). Actualiza el
      `custom_code` en el store → preview en vivo. **NO renderiza mp4** (render on-demand). ⚠️ El
      flag `SCENE_ENGINE` ya NO existe (code-gen es único motor) — ese punto quedó obsoleto.
- [x] **Botón "hazlo distinto" (HECHO):** `POST /{job}/scenes/{i}/regenerate-code` → genera una
      versión NUEVA con enfoque visual distinto (`generate_scene_animation(variation=True)`).
      Actualiza `custom_code` → preview en vivo. NO renderiza mp4.
- [ ] **"Bloquear layout":** congelar el `random` procedural a literales para que sea editable
      elemento por elemento (ver discusión de determinismo en ADR-012).

## 6. Archivado del orquestador (por etapas, verificando build)
- [x] **Funcional (HECHO):** el orquestador no se llama en ningún lado; `SCENE_ENGINE` eliminado;
      code-gen es el único motor con auto-reparación + respaldo seguro.
- [x] **Etapa 1 backend (HECHO):** `component_strategy.py` (≈2.7k líneas, el cerebro del
      orquestador) movido a `app/_legacy_orchestrator/`. `AVAILABLE_COMPONENTS` desacoplado →
      `spec.py`/`spec_validator` ahora usan `manifest.get_component_names()`. Tests repuntados
      (118 coleccionan, los afectados pasan).
- [x] **Etapa 2 — `ae_worker` + `anima_composer` ARCHIVADOS:** el worker de export AE por `.jsx`
      y el `anima_composer` (→ AE ExtendScript) movidos a `_legacy_orchestrator/`. Helpers vivos
      (`get_resolution`, `_persist_job_spec`) extraídos a `ae_export/job_utils.py`. Imports muertos
      limpiados (`__init__`, `exports.py`). El resto de `ae_export/` (deterministic/zip/script_builder)
      queda VIVO porque `admin.py` lo usa para "descargar .jsx de UN componente". 118 tests OK.
- [x] **Etapa 3a — Marketplace + Playground ELIMINADOS:** se borraron `AdminMarketplacePage`,
      `AnimationPlayground`, `AnimationsGallery` (galería de componentes), el `MarketplacePage`
      público y `useMarketplaceStore` + sus rutas/nav. "Crear Animación" (code-gen) se conserva.
- [x] **Etapa 3b-1 (parte segura, HECHO):** eliminada la herramienta admin "descargar .jsx de UN
      componente" (endpoint `/components/{name}/ae-script` + `aeScript.ts`). `PreviewPlayer` ahora
      renderiza el preview por escena con `CustomCode` si la escena es code-gen. Consecuencia:
      `ae_export/{deterministic,zip,script_builder}` quedó sin llamadores vivos (muerto inofensivo).
- [x] **Etapa 3b-2 (HECHO):** ELIMINADOS 164 componentes (`remotion/components/`), `AnimaComposer`
      (`composer/`), `registry.ts`, `primitives/`, `UniversalTransform`, `AnimatedWrapper`, `utils/`,
      `manifest.ts`. Reescritos los 4 consumidores del render (MainComposition, SceneRoot→SceneWrapper,
      ambos PreviewPlayers) → solo CustomCode + fallback de texto. `tsc` + `vite build` verde. Quedó
      `remotion/`: MainComposition, Root, SceneRoot, CustomCode, CustomCodeAudio, compileAnimation,
      transitions/. CAVEAT: videos viejos con `anima_composer` ya no renderizan sus componentes
      (muestran texto sobre fondo). El tipo `AnimaComposerSpec` en types/spec.ts quedó sin uso (menor).
- [ ] **Borrado real:** solo tras meses probado. "Borrar" es puerta de un solo sentido; por ahora
      todo queda recuperable (git + `_legacy_orchestrator/`).

## 7. Observabilidad / costo
- [x] **HECHO:** tokens por generación + endpoints `/metrics` y `/metrics/job/{job_id}`.
- [x] **Costo en $ (HECHO):** `model_catalog.estimate_cost_usd` (precios USD/1M por modelo, fallback
      por tier) → los endpoints de métricas devuelven `cost_usd` (total, por modelo, por video). Los
      precios son configurables en código (`PRICE_PER_1M`). flash-lite ≈ $0.0005/escena.
- [ ] **UI de métricas** en el panel admin (hoy solo endpoints JSON). + tiempo de render.

---

## Decisiones abiertas (a definir con el usuario)
1. ¿Modelo del code-gen **fijo fuerte** (ej. siempre 3.5-flash/pro) o configurable por video?
2. ¿AE: con footage (Opción 1) basta para los clientes, o se necesita el editable (Opción 2)?
3. ¿El flag de scene engine va por-video (wizard) o como setting global de admin?
4. ¿Cuándo se considera "probado en producción" para empezar a jubilar el catálogo?

---

## Orden sugerido
1. Validar Fase 2 + Fase 3 (sección 0).
2. **Fallback + sync de audio** (sección 2 + 1) — para que el video completo sea confiable.
3. **Flywheel de ejemplos** (sección 3) — sube la calidad de todos.
4. **Footage AE** (sección 4, Opción 1) — export universal.
5. **UX:** flag por-video + edición por-escena (sección 5).
6. Sandbox endurecido (sección 2) antes de abrirlo a todos los usuarios.
7. Jubilación del catálogo (sección 6) — al final, gradual.
