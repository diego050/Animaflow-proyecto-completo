# AnimaFlow Backend Modules

This directory contains the modularized business domains of the AnimaFlow backend.

## Module Overview

| Module | Domain | Key Exports |
|--------|--------|-------------|
| `tts` | Text-to-Speech | `generate_tts_with_timestamps()` |
| `segmentation` | Text chunking | `split_text_into_chunks()` |
| `llm` | LLM / AI generation | `generate_script_from_info()`, `generate_batch_visuals_with_llm()` |
| `remotion` | Video component generation | `generate_remotion_component()`, `render_video_pipeline()` |
| `ae_export` | After Effects export | `generate_ae_export_async()` |
| `parsers` | TSX / SVG parsing | `parse_svg_from_tsx()`, `analyze_tsx_for_ae()` |
| `pipeline` | Pipeline orchestration | `run_pipeline()`, `regenerate_single_scene_sync()` |

## Dependency Rules

```
api/ → modules/pipeline/ → modules/tts/, modules/llm/, modules/remotion/
                       → modules/ae_export/ → modules/parsers/
```

- Leaf modules (`tts`, `segmentation`, `llm`, `remotion`) MUST NOT import from `pipeline/`.
- `pipeline/orchestrator.py` coordinates all leaf modules.
- `parsers/` are pure functions with no side effects.

## Adding a New Module

1. Create directory under `modules/`
2. Add `__init__.py` with public re-exports
3. Keep files under 250 lines
4. Add module to this README

## Migration from `services/`

Old imports from `app.services.*` are deprecated. Update to:

| Old Import | New Import |
|------------|------------|
| `from app.services.pipeline import run_pipeline` | `from app.modules.pipeline.orchestrator import run_pipeline` |
| `from app.services.ae_export import create_export_zip` | `from app.modules.ae_export.zip_exporter import create_export_zip` |
| `from app.services.svg_parser import parse_svg_from_tsx` | `from app.modules.parsers.svg.extractor import parse_svg_from_tsx` |
| `from app.services.tsx_enriched_analyzer import analyze_tsx_for_ae` | `from app.modules.parsers.tsx.analyzer import analyze_tsx_for_ae` |
| `from app.services.ae_deterministic_generator import generate_deterministic_script` | `from app.modules.ae_export.deterministic import generate_deterministic_script` |
| `from app.services.llm_resolver import resolve_llm_credentials` | `from app.modules.llm.resolver import resolve_llm_credentials` |
