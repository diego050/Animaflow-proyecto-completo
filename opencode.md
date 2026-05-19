---
description: "Configuración global de OpenCode para AnimaFlow"
---

# OpenCode Configuration

## Herramientas y Permisos

Por defecto, todas las herramientas están habilitadas. Los permisos se configuran por agente.

## Agentes Personalizados

Los agentes están definidos en `.opencode/agents/`:
- `orchestrator.md` - Primary agent (coordinación técnica)
- `architecture.md` - Subagent (arquitectura y spec.json)
- `backend.md` - Subagent (FastAPI, pipeline, RQ)
- `frontend.md` - Subagent (React, Remotion, Zustand)
- `qa.md` - Subagent (testing, validación)

## Comandos Personalizados

Los comandos están en `.opencode/commands/`:
- `/setup` - Inicializa infraestructura completa
- `/test` - Corre tests backend + frontend
- `/validate-spec` - Valida spec.json
- `/pipeline` - Revisa estado del pipeline async

## Skills

Las skills están en `.agents/skills/` (compatible con OpenCode).
Ver `skills-lock.json` para el registro de skills instaladas.

## Reglas del Proyecto

Ver `AGENTS.md` en la raíz para las reglas globales del proyecto.

