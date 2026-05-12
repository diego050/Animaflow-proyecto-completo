# Documentación del Proyecto AnimaFlow

Índice maestro para navegación técnica y comprensión de arquitectura (Humanos & IA):

- **[Arquitectura](architecture/)**: Diagramas, flujos de datos, contratos (`spec.json`) y topología de workers.
- **[Backend](backend/)**: Estado actual de API (Endpoints), Pydantic, modelos SQLAlchemy y Redis/RQ.
- **[Frontend](frontend/)**: Componentes React, Zustand, integraciones dinámicas con Remotion.
- **[QA](qa/)**: Estrategia de testing, métricas de cobertura y Quality Gates.
- **[ADR](adr/)**: Decisiones técnicas transversales e historial inmutable.

## Estado Actual de Implementación (MVP V1)
1. Entorno FastAPI levantado con rutas `/api/jobs` y PostgreSQL conectado.
2. Worker RQ de Redis escuchando.
3. Repositorio Voicebox clonado e indexado.
4. UI interactiva de React con motor `<Player>` de Remotion leyendo el contrato dinámicamente.
