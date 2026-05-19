# AnimaFlow — Guía de Deploy a VPS

> **Servidor recomendado:** 2 vCPU, 8GB RAM, 100GB NVMe, Ubuntu 22.04 LTS

---

## 1. Preparar el Servidor

### 1.1. Actualizar sistema
```bash
sudo apt-get update && sudo apt-get upgrade -y
```

### 1.2. Instalar dependencias
```bash
sudo apt-get install -y \
    git \
    curl \
    wget \
    build-essential \
    python3.11 \
    python3.11-venv \
    python3-pip \
    ffmpeg \
    libpq-dev \
    redis-tools \
    nginx
```

### 1.3. Instalar Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## 2. Clonar y Configurar

### 2.1. Clonar repositorio
```bash
cd /opt
sudo git clone https://github.com/tuusuario/Animaflow-proyecto-completo.git animaflow
sudo chown -R $USER:$USER animaflow
cd animaflow
```

### 2.2. Configurar variables de entorno
```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Variables obligatorias:
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/animaflow

# Redis
REDIS_URL=redis://redis:6379/0

# Security (¡CAMBIAR!)
SECRET_KEY=tu-clave-secreta-muy-larga-y-aleatoria-aqui
ENCRYPTION_KEY=tu-clave-fernet-generada

# Environment
ENV=production
CORS_ORIGINS=https://tu-dominio.com

# TTS (opcional, el usuario pone su propia API key)
# GEMINI_API_KEY=tu-api-key
```

Generar claves:
```bash
# SECRET_KEY (64 chars hex)
python3 -c "import secrets; print(secrets.token_hex(32))"

# ENCRYPTION_KEY (Fernet)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 3. Levantar Infraestructura

### 3.1. Docker Compose (Postgres + Redis)
```bash
docker-compose up -d postgres redis
```

Verificar:
```bash
docker-compose ps
```

---

## 4. Configurar Backend

### 4.1. Crear entorno virtual
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4.2. Ejecutar migraciones
```bash
alembic upgrade head
```

### 4.3. Crear usuario admin
```bash
python scripts/create_admin.py --email admin@tu-dominio.com --name "Admin"
# Te pedirá password de forma segura
```

### 4.4. Descargar modelo Whisper
```bash
# Se descarga automáticamente en el primer uso
# Verificar que hay espacio en disco (~500MB)
df -h ~/.cache/whisper/
```

### 4.5. Descargar voz Piper (español)
```bash
mkdir -p storage/models/piper
cd storage/models/piper

wget https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx.json
cd ../../..
```

---

## 5. Levantar Aplicación

### 5.1. Opción A: Docker Compose Production (Recomendado)
```bash
cd /opt/animaflow
docker-compose -f docker-compose.prod.yml up -d
```

Verificar logs:
```bash
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f worker-default
docker-compose -f docker-compose.prod.yml logs -f worker-render
```

### 5.2. Opción B: Manual (sin Docker para API)

Terminal 1 — API:
```bash
cd /opt/animaflow/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

Terminal 2 — Workers (default):
```bash
cd /opt/animaflow/backend
source venv/bin/activate
python -m worker --queues default
```

Terminal 3 — Workers (render):
```bash
cd /opt/animaflow/backend
source venv/bin/activate
python -m worker --queues render
```

---

## 6. Configurar Nginx (Reverse Proxy)

### 6.1. Crear config
```bash
sudo nano /etc/nginx/sites-available/animaflow
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/audio/ {
        proxy_pass http://localhost:8000;
        proxy_buffering off;
    }
    
    client_max_body_size 100M;
}
```

### 6.2. Activar
```bash
sudo ln -s /etc/nginx/sites-available/animaflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. SSL con Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

---

## 8. Verificación Post-Deploy

### 8.1. Health check
```bash
curl https://tu-dominio.com/health
```

### 8.2. Login como admin
- URL: `https://tu-dominio.com/login`
- Email: el que pusiste en paso 4.3
- Password: la que ingresaste

### 8.3. Crear primer proyecto de prueba
1. Wizard → Info → Script → Voz → Config
2. Verificar que el pipeline completa
3. Revisar logs de worker si hay errores

---

## 9. Comandos Útiles

### Ver logs
```bash
# API
docker-compose -f docker-compose.prod.yml logs -f api

# Workers
docker-compose -f docker-compose.prod.yml logs -f worker-default
docker-compose -f docker-compose.prod.yml logs -f worker-render

# Base de datos
docker-compose logs -f postgres
```

### Restart servicios
```bash
docker-compose -f docker-compose.prod.yml restart api
docker-compose -f docker-compose.prod.yml restart worker-default
```

### Backup base de datos
```bash
docker-compose exec postgres pg_dump -U postgres animaflow > backup_$(date +%Y%m%d).sql
```

### Actualizar código
```bash
cd /opt/animaflow
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 10. Troubleshooting

### Whisper no descarga modelo
```bash
# Verificar espacio en disco
df -h

# Descargar manualmente
mkdir -p ~/.cache/whisper
wget https://openaipublic.azureedge.net/main/whisper/models/ed3a0b6b1c0edf879ad9b11b1ff5a0e6ab5db9205f891f668f8b0e6c6326e34/small.pt -O ~/.cache/whisper/small.pt
```

### Error de permisos en storage/
```bash
sudo chown -R $USER:$USER /opt/animaflow/storage
chmod -R 755 /opt/animaflow/storage
```

### Worker no procesa jobs
```bash
# Verificar Redis
docker-compose exec redis redis-cli ping

# Verificar colas
docker-compose exec redis redis-cli lrange rq:queue:default 0 -1
```

---

## Checklist Pre-Deploy

- [ ] Variables de entorno configuradas (.env)
- [ ] SECRET_KEY y ENCRYPTION_KEY generadas
- [ ] CORS_ORIGINS apunta al dominio correcto
- [ ] Base de datos levantada (docker-compose up -d postgres)
- [ ] Redis levantado (docker-compose up -d redis)
- [ ] Migraciones ejecutadas (alembic upgrade head)
- [ ] Usuario admin creado
- [ ] Modelo Whisper descargado
- [ ] Voz Piper descargada
- [ ] Docker Compose prod levantado
- [ ] Nginx configurado
- [ ] SSL configurado
- [ ] Health check responde 200
- [ ] Login funciona
