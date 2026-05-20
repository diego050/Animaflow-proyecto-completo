# 🔐 Security Tools Guide — AnimaFlow

This document describes all security scanning and analysis tools configured for the AnimaFlow project.

---

## 📋 Índice

1. [CI/CD Security Scans (Automático)](#ci-security)
2. [SonarQube (Análisis de Código)](#sonarqube)
3. [OWASP ZAP (Pentest Dinámico)](#zap)
4. [Bandit (Python Security)](#bandit)
5. [Pentest Checklist](#pentest-checklist)

---

## <a name="ci-security"></a> 1. CI/CD Security Scans (Automático en cada push)

Estas herramientas corren automáticamente en GitHub Actions en cada push a `Develop`.

### OWASP Dependency-Check (Frontend)
- **Qué hace:** Escanea `package.json` por vulnerabilidades conocidas (CVEs)
- **Comando local:** `cd frontend && npm audit --audit-level=moderate`
- **Archivo CI:** `.github/workflows/ci.yml`

### OWASP Dependency-Check (Backend)
- **Qué hace:** Escanea `requirements.txt` por vulnerabilidades conocidas
- **Comando local:**
  ```bash
  cd backend
  pip install pip-audit
  pip-audit --requirement requirements.txt --desc
  ```
- **Archivo CI:** `.github/workflows/ci.yml`

### Bandit (Python Security Scanner)
- **Qué hace:** Análisis estático de código Python buscando patrones inseguros (SQL injection, eval, hardcoded passwords)
- **Comando local:**
  ```bash
  cd backend
  pip install bandit
  bandit -r app/ -ll --exclude ./tests/
  ```
- **Archivo CI:** `.github/workflows/ci.yml`

---

## <a name="sonarqube"></a> 2. SonarQube (Análisis de Calidad de Código)

SonarQube es un servicio de análisis de código estático que detecta:
- Bugs y code smells
- Vulnerabilidades de seguridad
- Deuda técnica
- Cobertura de tests

### Setup Inicial

1. **Crear la base de datos:**
   ```bash
   cd /opt/animaflow
   python scripts/setup_sonarqube.py
   ```

2. **Iniciar SonarQube:**
   ```bash
   docker compose --profile security up sonarqube -d
   ```

3. **Acceder (vía SSH tunnel):**
   ```bash
   # Desde tu máquina local
   ssh -L 9000:localhost:9000 usuario@vps-ip
   # Abrir en navegador: http://localhost:9000
   ```
   - **Usuario por defecto:** admin
   - **Contraseña por defecto:** admin (cambiar en primer login)

4. **Crear un proyecto y obtener token:**
   - Projects → Create Project → Manual
   - Nombre: `animaflow`
   - Setup → Generate Token → Guardar el token

5. **Instalar sonar-scanner localmente:**
   ```bash
   # En tu máquina de desarrollo
   npm install -g sonarqube-scanner
   ```

6. **Crear `sonar-project.properties` en la raíz:**
   ```properties
   sonar.projectKey=animaflow
   sonar.sources=frontend/src,backend/app
   sonar.exclusions=**/node_modules/**,**/venv/**,**/tests/**
   sonar.host.url=http://localhost:9000
   sonar.login=TU_TOKEN_AQUI
   ```

7. **Ejecutar análisis:**
   ```bash
   sonar-scanner
   ```

### Apagar SonarQube
```bash
docker compose --profile security stop sonarqube
```

### Recursos
- **RAM usada:** ~1.5GB
- **Puerto:** 127.0.0.1:9000 (solo localhost, no expuesto a internet)
- **Perfil Docker:** `security` (no inicia automáticamente)

---

## <a name="zap"></a> 3. OWASP ZAP (Pentest Dinámico)

ZAP escanea tu aplicación **en ejecución** como un atacante real, buscando:
- Cross-Site Scripting (XSS)
- SQL Injection
- CSRF vulnerabilities
- Security headers missing
- Y más...

### Requisitos
- Docker instalado
- La aplicación debe estar corriendo y accesible

### Uso

**1. Escanear localhost (desarrollo):**
```bash
./scripts/security_scan.sh
```

**2. Escanear producción:**
```bash
./scripts/security_scan.sh https://tu-dominio.com
```

### Resultados
Los reportes se guardan en `security_reports/`:
- `zap_report_YYYYMMDD_HHMMSS.html` — Reporte visual completo
- `zap_report_YYYYMMDD_HHMMSS.md` — Resumen en Markdown

### Interpretación de resultados
| Código | Significado | Acción |
|--------|-------------|--------|
| 0 | Sin problemas | ✅ Listo |
| 1 | Warnings (bajo/medio) | ⚠️ Revisar |
| 2 | Failures (alto/crítico) | 🚨 Arreglar ASAP |

---

## <a name="bandit"></a> 4. Bandit (Python Security Scanner)

Bandit analiza código Python buscando patrones de seguridad:
- Uso de `eval()` o `exec()`
- SQL injection en strings
- Contraseñas hardcodeadas
- Uso inseguro de `yaml.load()`
- Y más...

### Uso local
```bash
cd backend
pip install bandit
bandit -r app/ -ll --exclude ./tests/
```

### Niveles de severidad
- `-l` = Low
- `-ll` = Low + Medium
- `-lll` = Low + Medium + High

---

## <a name="pentest-checklist"></a> 5. Pentest Checklist (Antes de Producción)

Antes de lanzar a producción, completar:

### 🔒 Autenticación
- [ ] Passwords hasheadas con bcrypt
- [ ] JWT tokens con expiración corta (15-30 min)
- [ ] Refresh tokens con rotación
- [ ] Rate limiting en login/register
- [ ] Protección contra brute force (slowapi)

### 🛡️ Autorización
- [ ] Role-based access control (RBAC) funcionando
- [ ] Admin endpoints protegidos con `require_admin`
- [ ] Users no pueden ver datos de otros users

### 📡 API
- [ ] Input validation en todos los endpoints (Pydantic)
- [ ] Path traversal protection en file uploads
- [ ] API keys encriptadas en DB (Fernet)
- [ ] No secrets hardcodeados en código

### 🗄️ Base de Datos
- [ ] SQL injection imposible (SQLAlchemy ORM)
- [ ] Conexión PostgreSQL con SSL en producción
- [ ] Backups regulares configurados

### 🌐 Web
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] CORS configurado correctamente
- [ ] Cookies seguras (HttpOnly, Secure, SameSite)

### 🔍 Escaneo
- [ ] `npm audit` — 0 vulnerabilidades críticas
- [ ] `pip-audit` — 0 vulnerabilidades críticas
- [ ] `bandit` — 0 issues high
- [ ] ZAP scan — 0 failures (código 0 o 1)
- [ ] SonarQube — Quality Gate passed

---

## 🆘 Soporte

Si encuentras vulnerabilidades que no sabes cómo arreglar:
1. Documenta en un issue de GitHub con label `security`
2. Si es crítica (datos de usuarios expuestos), fix ASAP
3. Si es media/baja, planifica para el siguiente sprint

## 📚 Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Bandit Documentation](https://bandit.readthedocs.io/)
- [SonarQube Docs](https://docs.sonarqube.org/)
- [ZAP Documentation](https://www.zaproxy.org/docs/)
