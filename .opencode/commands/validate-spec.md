---
description: "Valida que el spec.json cumple con el schema definido y verifica paridad con TypeScript"
agent: architecture
---

# Validación de spec.json

## Instrucciones

### 1. Leer schema actual
```bash
cat specs/spec_schema.json
```

### 2. Validar contra Pydantic (Backend)
```bash
cd backend
python -c "from app.schemas.spec import Spec; import json; data = json.load(open('../specs/spec_schema.json')); Spec(**data)"
```

### 3. Validar contra TypeScript (Frontend)
```bash
cd frontend
npx tsc --noEmit src/types/spec.ts
```

### 4. Verificar paridad
Compara los campos entre:
- Pydantic models (`backend/app/schemas/spec.py`)
- TypeScript interfaces (`frontend/src/types/spec.ts`)

### 5. Reportar discrepancias

Si hay diferencias:
1. Lista los campos que faltan en cada lado
2. Indica cuál es la fuente de verdad (spec_schema.json)
3. Sugiere los cambios necesarios para sincronizar

### 6. Validar spec.json de job existente (opcional)
```bash
cd backend
python -c "from app.schemas.spec import Spec; import json; data = json.load(open('path/to/job_spec.json')); Spec(**data); print('✅ Válido')"
```

## Criterios de Aceptación

- ✅ Schema JSON es válido
- ✅ Pydantic acepta el schema
- ✅ TypeScript tiene tipos equivalentes
- ✅ Todos los campos requeridos están presentes
- ✅ Tipos coinciden (number, string, array, object)
