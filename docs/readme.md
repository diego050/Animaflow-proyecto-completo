# Documentación del Proyecto AnimaFlow

Índice maestro para navegación técnica y comprensión de arquitectura (Humanos & IA):

- **[Arquitectura](architecture/)**: Diagramas, flujos de datos, contratos (`spec.json`) y topología de workers.
- **[Backend](backend/)**: Estado actual de API (Endpoints), Pydantic, modelos SQLAlchemy y Redis/RQ.
- **[Frontend](frontend/)**: Componentes React, Zustand, integraciones dinámicas con Remotion.
- **[QA](qa/)**: Estrategia de testing, métricas de cobertura y Quality Gates.
- **[ADR](adr/)**: Decisiones técnicas transversales e historial inmutable.

## ADRs (Architecture Decision Records)
- [ADR-001](adr/001-mvp-infrastructure.md) - MVP Infrastructure
- [ADR-002](adr/002-llm-integration.md) - LLM Integration
- [ADR-003](adr/003-voicebox-kokoro-preset-engine.md) - Voicebox Kokoro Preset Engine
- [ADR-004](adr/004-narrative-animation-engine.md) - Narrative Animation Engine
- [ADR-005](adr/005-tsx-generation-fixes.md) - TSX Generation Post-Processing & Schema Fixes ✅ NUEVO

## Estado Actual de Implementación (MVP V1)
1. ✅ Entorno FastAPI levantado con rutas `/api/jobs` y PostgreSQL conectado
2. ✅ Worker RQ de Redis escuchando (SimpleWorker en Windows)
3. ✅ Repositorio Voicebox clonado e integrado (engine Kokoro)
4. ✅ UI interactiva de React con motor `<Player>` de Remotion leyendo el contrato dinámicamente
5. ✅ Exportación triple: MP4 (Remotion), spec.json, After Effects (.zip)
6. ✅ Progress tracking en tiempo real (polling cada 2s)
7. ✅ Post-procesamiento TSX (0 errores de runtime conocidos)
8. ✅ ae_metadata populado correctamente en spec.json
9. ✅ Estrategia de modelos dual con fallback automático (gemma-4-31b-it → gemma-4-26b-a4b-it)
