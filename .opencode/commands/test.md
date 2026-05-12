---
description: "Corre la suite completa de tests (backend con pytest + coverage, frontend con vitest + tsc)"
agent: qa
---

# Test Suite Completa

## Backend Tests

```bash
cd backend
pytest -v --cov=app --cov-report=term-missing
```

### Qué verificar:
- ✅ Todos los tests pasan
- ✅ Coverage > 80% en módulos críticos (pipeline.py, schemas)
- ✅ No hay warnings de pytest

## Frontend Tests

```bash
cd frontend
npm run test
tsc --noEmit
npm run lint
```

### Qué verificar:
- ✅ Vitest: todos los tests pasan
- ✅ TypeScript: cero errores de tipos
- ✅ ESLint: cero warnings

## Reporte de Errores

Si hay fallos:
1. Lista los tests fallidos
2. Muestra el error específico
3. Sugiere la causa raíz
4. Propone el fix

## Modo Rápido

Para solo verificar tipos sin correr tests:
```bash
cd backend && mypy app
cd frontend && tsc --noEmit
```
