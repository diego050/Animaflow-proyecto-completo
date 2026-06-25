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

## Lo que NO está aquí todavía (sigue VIVO, pendiente de decidir)
- `app/modules/anima_composer/` y `app/modules/ae_export/` — el export a **After Effects** por
  componente. Sigue vivo (aunque no aplica a escenas code-gen). Se archivará cuando exista el
  reemplazo de **footage AE** (ver roadmap).
- Frontend: `remotion/composer/AnimaComposer.tsx`, el registry y los 163 componentes. Siguen
  usados por **PreviewPlayer, AdminMarketplace, AnimationPlayground, SceneRoot**. Archivar implica
  decidir el destino de esas features.
