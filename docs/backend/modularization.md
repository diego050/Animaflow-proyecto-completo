# Backend Modularization Guide

> **Last updated:** 2026-05-18 | **Status:** Complete

---

## Overview

The AnimaFlow backend has been refactored from a flat `services/` structure to a modular `modules/` architecture organized by business domains.

## Module Structure

```
backend/app/modules/
├── __init__.py
├── README.md
│
├── tts/                          # 🎤 Text-to-Speech
│   ├── __init__.py
│   └── service.py
│
├── segmentation/                 # ✂️ Text chunking
│   ├── __init__.py
│   └── service.py
│
├── llm/                          # 🧠 LLM / AI Generation
│   ├── __init__.py
│   ├── client.py
│   ├── script_generator.py
│   ├── visual_spec.py
│   ├── ae_metadata.py
│   ├── ae_structure.py
│   ├── ae_animations.py
│   ├── ae_postprocess.py
│   ├── ae_postprocess_ramp.py
│   ├── ae_postprocess_effects.py
│   ├── ae_postprocess_advanced.py
│   └── resolver.py
│
├── remotion/                     # 🎬 Video Component Generation
│   ├── __init__.py
│   ├── component_generator.py
│   ├── component_postprocess.py
│   ├── index_writer.py
│   ├── renderer.py
│   └── ae_deterministic.py
│
├── ae_export/                    # 📦 After Effects Export
│   ├── __init__.py
│   ├── script_builder.py
│   ├── zip_exporter.py
│   ├── worker.py
│   ├── deterministic/
│   │   ├── __init__.py
│   │   ├── generator.py
│   │   ├── shapes.py
│   │   ├── text.py
│   │   ├── animations.py
│   │   ├── morphing.py
│   │   └── utils.py
│   └── shape_renderers/
│       ├── __init__.py
│       ├── rectangle.py
│       ├── circle.py
│       ├── flash.py
│       ├── calendar.py
│       ├── line.py
│       ├── particle.py
│       └── generic.py
│
├── parsers/                      # 🔍 TSX / SVG Parsing
│   ├── __init__.py
│   ├── svg/
│   │   ├── __init__.py
│   │   ├── extractor.py
│   │   ├── shapes.py
│   │   ├── paths.py
│   │   ├── gradients.py
│   │   └── utils.py
│   └── tsx/
│       ├── __init__.py
│       ├── analyzer.py
│       ├── transforms.py
│       ├── animations.py
│       ├── animation_utils.py
│       ├── animation_extractors.py
│       ├── animation_special.py
│       ├── effects.py
│       ├── elements.py
│       ├── manifest.py
│       └── summary.py
│
└── pipeline/                     # 🔄 Pipeline Orchestration
    ├── __init__.py
    ├── orchestrator.py
    ├── scene_manager.py
    └── persistence.py
```

## Dependency Rules

```
api/ → modules/pipeline/ → modules/tts/, modules/llm/, modules/remotion/
                         → modules/ae_export/ → modules/parsers/
```

**Golden rule:** Leaf modules (`tts`, `segmentation`, `llm`, `remotion`) MUST NOT import from `modules/pipeline/`.

## Migration from `services/`

| Old Import | New Import |
|------------|------------|
| `from app.services.pipeline import run_pipeline` | `from app.modules.pipeline.orchestrator import run_pipeline` |
| `from app.services.ae_export import create_export_zip` | `from app.modules.ae_export.zip_exporter import create_export_zip` |
| `from app.services.svg_parser import parse_svg_from_tsx` | `from app.modules.parsers.svg import parse_svg_from_tsx` |
| `from app.services.tsx_enriched_analyzer import analyze_tsx_for_ae` | `from app.modules.parsers.tsx import analyze_tsx_for_ae` |
| `from app.services.llm_resolver import resolve_llm_credentials` | `from app.modules.llm.resolver import resolve_llm_credentials` |

## Adding a New Module

1. Create directory under `modules/`
2. Add `__init__.py` with public re-exports
3. Keep files under 250 lines
4. Add module to `modules/README.md`
5. Add tests in `tests/test_<module>.py`

## File Size Limits

| Metric | Limit | Current Max |
|--------|-------|-------------|
| Max lines per file | 250 | 217 (`llm/ae_metadata.py`) |
| Average lines | ~100 | ~105 |
