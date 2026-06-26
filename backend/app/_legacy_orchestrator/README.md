# _legacy_orchestrator — Código del orquestador (archivado, NO usado)

Aquí vive el código del **orquestador de componentes** (el motor anterior que elegía
componentes de un catálogo de 163 y rellenaba sus props). Fue **reemplazado por code-gen**
(la IA escribe el componente Remotion con código). Ver `docs/adr-012-codegen-animaciones.md`.

**Estado:** archivado, **sin importadores vivos**. No se ejecuta. Se conserva por si hace
falta recuperarlo (git history + estos archivos), no para usarse.

## Contenido
- `component_strategy.py` — `generate_scene_composer()` (generación de escenas vía orquestación)
  + ~2.7k líneas de helpers (layout solver, clamps, dedup, visual-pure strip, prompts).
  Ya NO se llama desde ningún lado (el pipeline, el regen por aspect-ratio y el editor usan
  code-gen). La constante `AVAILABLE_COMPONENTS` que antes vivía aquí se reemplazó por llamadas
  directas a `app.services.manifest.get_component_names()` en `spec.py` y `spec_validator.py`.

- `ae_worker.py` — el antiguo worker de export AE por `.jsx` (`generate_ae_export_async`).
  Reemplazado por el **footage AE** (`ae_export/footage_exporter.py`, ProRes por escena). Sus 2
  helpers vivos (`get_resolution`, `_persist_job_spec`) se movieron a `ae_export/job_utils.py`.
- `anima_composer/` — transformaba `anima_composer` → AE ExtendScript. Solo lo usaba `ae_worker`.

## Lo que NO está aquí todavía (sigue VIVO, pendiente de decidir)
- `app/modules/ae_export/` (zip_exporter, script_builder, deterministic, shape_renderers) — el
  generador determinista AE sigue VIVO: `admin.py` lo usa para "descargar el .jsx de UN componente"
  (herramienta admin). Si se quita esa feature, se puede archivar también.
- Frontend: `remotion/composer/AnimaComposer.tsx`, el registry y los 163 componentes. Siguen
  usados por **PreviewPlayer, SceneRoot** (render de videos viejos con `anima_composer`). Etapa 3b.
