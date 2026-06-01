---
description: "Revisa el estado del pipeline async (scheduler, jobs en DB, errores)"
agent: backend
---

# Pipeline Status Check

## Instrucciones

### 1. Verificar scheduler activo
```bash
# El scheduler corre como parte del proceso de FastAPI
# Verificar logs:
grep -E "\[Scheduler\]" backend/logs/*.log 2>/dev/null || echo "No hay logs de scheduler"
```

### 2. Verificar Render Server
```bash
curl http://localhost:3001/health
# Debe responder 200
```

### 3. Listar jobs recientes en DB
```bash
cd backend
python -c "
from app.db.session import SessionLocal
from app.db.models import JobModel
db = SessionLocal()
jobs = db.query(JobModel).order_by(JobModel.created_at.desc()).limit(10).all()
for j in jobs:
    print(f'{j.id[:8]} | {j.status:20} | {j.created_at}')
db.close()
"
```

### 4. Ver jobs fallidos
```bash
cd backend
python -c "
from app.db.session import SessionLocal
from app.db.models import JobModel
db = SessionLocal()
jobs = db.query(JobModel).filter(JobModel.status.like('failed%')).order_by(JobModel.created_at.desc()).limit(10).all()
for j in jobs:
    print(f'{j.id[:8]} | {j.status:20} | {j.error_message or \"N/A\"}')
db.close()
"
```

### 5. Revisar logs del pipeline
```bash
grep -E "\[Pipeline\]|\[LLM\]|\[TTS\]|\[Render\]" backend/logs/*.log 2>/dev/null || echo "No hay logs"
```

### 6. Diagnóstico

Reportar:
- ✅ Scheduler: Activo / ❌ Inactivo
- ✅ Render Server: Healthy / ❌ Down
- 📊 Jobs totales: N
- ⏳ Jobs en progreso: N
- ❌ Jobs fallidos: N
- 📝 Últimos jobs: lista con estado

### 7. Si hay errores

Para jobs fallidos:
1. Identificar el job_id
2. Revisar el error en la columna error_message
3. Determinar causa: timeout, error de LLM, error de TTS, error de render
4. Sugerir retry o fix
