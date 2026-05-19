---
description: "Revisa el estado del pipeline async (RQ workers, Redis, jobs en cola, errores)"
agent: backend
---

# Pipeline Status Check

## Instrucciones

### 1. Verificar conectividad a Redis
```bash
redis-cli ping
# Debe responder: PONG
```

### 2. Revisar workers RQ
```bash
rq info
# O conectar a Redis y verificar:
redis-cli keys "rq:worker:*"
```

### 3. Listar jobs en cola
```bash
redis-cli llen rq:default
redis-cli lrange rq:default 0 -1
```

### 4. Ver jobs fallidos
```bash
redis-cli llen rq:failed
redis-cli lrange rq:failed 0 10
```

### 5. Revisar logs del pipeline (Backend)
```bash
# Si está corriendo en consola, revisar output
# O buscar en logs:
grep -E "\[.*\] (Pipeline|LLM|TTS|Render)" backend/logs/*.log 2>/dev/null || echo "No hay logs"
```

### 6. Verificar estado de jobs en DB
```bash
cd backend
python -c "
from app.db.session import SessionLocal
from app.db.models import JobModel
db = SessionLocal()
jobs = db.query(JobModel).order_by(JobModel.created_at.desc()).limit(10).all()
for j in jobs:
    print(f'{j.job_id[:8]} | {j.status:12} | {j.created_at}')
db.close()
"
```

### 7. Diagnóstico

Reportar:
- ✅ Redis: Conectado / ❌ Sin conexión
- 📊 Workers activos: N
- ⏳ Jobs en cola: N
- ❌ Jobs fallidos: N
- 📝 Últimos jobs: lista con estado

### 8. Si hay errores

Para jobs fallidos:
1. Identificar el job_id
2. Revisar el error específico en Redis
3. Determinar causa: timeout, error de LLM, error de TTS, error de render
4. Sugerir retry o fix

## Comandos Útiles

### Limpiar jobs fallidos
```bash
redis-cli del rq:failed
```

### Reiniciar workers
```bash
# Matar workers existentes y reiniciar
rq worker --url redis://localhost:6379 &
```
