---
description: "Inicializa toda la infraestructura del proyecto (PostgreSQL, Redis, dependencias, migraciones)"
agent: orchestrator
---

# Setup del Proyecto AnimaFlow

## Instrucciones

Ejecuta el setup completo del proyecto en el siguiente orden:

### 1. Infraestructura (Docker)
```bash
docker-compose -f docker-compose.prod.yml up -d postgres redis
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

### 3. Frontend
```bash
cd frontend
npm install
```

### 4. Verificación
- Backend: `GET http://localhost:8000/api/health` → debe retornar 200
- Frontend: `npm run dev` → debe iniciar en puerto 5173

### 5. Variables de entorno
Verificar que `.env` tenga:
- `DATABASE_URL=postgresql://user:pass@localhost:5432/animaflow`
- `REDIS_URL=redis://localhost:6379`
- `OPENCODE_API_KEY=<tu-api-key>`
- `OPENCODE_MODEL=minimax-m2.5`

Reporta cualquier error encontrado durante el setup.
