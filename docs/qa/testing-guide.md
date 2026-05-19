# Testing Guide

> **Fecha:** Mayo 2026 | **Sprints:** 1-6 | **Status:** Manual testing guide

---

## How to Run the App

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker + Docker Compose
- PostgreSQL 16+
- Redis 7+

### Start Infrastructure
```bash
docker-compose up -d postgres redis
```

### Start Backend
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Test Credentials

Para testing local, crea un usuario admin con el script:
```bash
cd backend
python scripts/create_admin.py --email admin@animaflow.com --name "Admin"
```

Luego usa esas credenciales para login, o registra nuevos usuarios vía `/register`.

---

## Test Scenarios

### Authentication (Sprint 5)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| A1 | Register new user | 1. Go to /login 2. Click "Register" 3. Fill form 4. Submit | Account created, redirected to dashboard, token stored |
| A2 | Login with valid credentials | 1. Go to /login 2. Enter email/password 3. Submit | Redirected to dashboard, user info in topbar |
| A3 | Login with invalid credentials | 1. Go to /login 2. Enter wrong password 3. Submit | Error message "Invalid email or password" |
| A4 | Session persistence | 1. Login 2. Refresh page | Still logged in, no redirect to login |
| A5 | Session expiry | 1. Login 2. Wait 30 min (or delete token) 3. Make API call | Redirected to /login |
| A6 | Logout | 1. Click logout in topbar | Token cleared, redirected to /login |
| A7 | Protected route access | 1. Not logged in 2. Navigate to / | Redirected to /login |
| A8 | Update profile | 1. Go to Settings → Perfil 2. Change name 3. Save | Name updated in topbar and profile |
| A9 | Change password | 1. Settings → Perfil 2. Enter current + new password 3. Save | Password changed, can login with new password |
| A10 | Change password (wrong current) | 1. Settings → Perfil 2. Enter wrong current password 3. Save | Error "Invalid current password" |

---

### Dashboard & Projects (Sprint 1-2)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| P1 | View projects list | 1. Login 2. View home page | List of user's projects with status badges |
| P2 | Create project (manual script) | 1. Click "Nuevo Proyecto" 2. Enter info 3. Enter script 4. Submit | Job created, polling starts |
| P3 | Create project (AI script) | 1. Click "Nuevo Proyecto" 2. Enter info 3. Click "Generate Script" 4. Submit | Script generated, job created |
| P4 | Job polling | 1. Create project 2. Watch status | Status updates every 3s until terminal |
| P5 | View project detail | 1. Click on project card 2. View tabs | 4 tabs: Guión, Preview, Editor, Exportar |
| P6 | Delete project | 1. Click delete on project card 2. Confirm | Project removed from list |
| P7 | Trigger render | 1. Go to project detail → Exportar 2. Click "Render" | Status changes to queued_render |
| P8 | Regenerate scene | 1. Go to Editor tab 2. Select scene 3. Enter new query 4. Regenerate | Scene updated in spec |

---

### Voice Management (Sprint 3 + 6)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| V1 | List voices | 1. Go to /voices | Voices listed, default voice shown first |
| V2 | Auto-create default voice | 1. New user with no voices 2. Go to /voices | Default Kokoro ES voice created automatically |
| V3 | Create voice | 1. Go to /voices 2. Click "Create" 3. Fill form 4. Submit | New voice appears in list |
| V4 | Set default voice | 1. Create/edit voice 2. Set as default 3. Save | Voice marked as default, previous default unset |
| V5 | Preview voice | 1. Click preview on voice 2. Enter text 3. Generate | Audio plays, duration shown |
| V6 | Upload voice sample | 1. Edit voice 2. Upload audio file 3. Save | Sample path updated |
| V7 | Delete voice | 1. Click delete on non-default voice 2. Confirm | Voice removed (soft delete) |
| V8 | Cannot delete default voice | 1. Try to delete default voice | Error "Cannot delete default voice" |
| V9 | Voice selector in wizard | 1. Create new project 2. Go to Step 2 | Voice dropdown shows real voices from API |

---

### Scripts & Downloads (Sprint 3)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| S1 | View scripts | 1. Go to /scripts | Scripts derived from completed jobs listed |
| S2 | Copy script | 1. Click copy on script card | Script text copied to clipboard |
| S3 | View downloads | 1. Go to /downloads | Exports grouped by project |
| S4 | Download spec.json | 1. Click download spec.json | JSON file downloaded |
| S5 | View spec in JSON viewer | 1. Click view on spec.json | Formatted JSON displayed |

---

### Settings (Sprint 4)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| T1 | View settings | 1. Go to /settings | 4 tabs visible: Perfil, Preferencias, API Keys, Facturación |
| T2 | Update preferences | 1. Go to Preferencias tab 2. Change aspect ratio 3. Save | Preference saved to localStorage |
| T3 | Preference persistence | 1. Change preference 2. Refresh page 3. Go to settings | Preference still set |
| T4 | Default settings | 1. New user 2. Go to settings | Default: 9:16, kokoro-es, es, dark |
| T5 | API Keys tab | 1. Go to API Keys tab | Placeholder message (not implemented) |
| T6 | Billing tab | 1. Go to Facturación tab | Placeholder message (not implemented) |

---

## Known Issues

| Issue | Severity | Description | Workaround |
|---|---|---|---|
| K1 | Low | Orphaned jobs (pre-auth) not visible after auth migration | Run backfill script to assign user_id |
| K2 | Low | Token expiration not shown to user | User discovers on next API call (redirect to login) |
| K3 | Medium | No rate limiting on login endpoint | Manual testing only; add rate limiting before production |
| K4 | Low | Voice preview requires Voicebox engine running | Ensure Voicebox is installed and configured |
| K5 | Low | Settings not synced across devices | localStorage is device-specific; future: sync via API |

---

## Manual Testing Checklist

### Pre-flight
- [ ] Docker containers running (postgres, redis)
- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Database migrations applied (`alembic upgrade head`)
- [ ] Admin user created (via create_admin.py script)

### Authentication
- [ ] A1: Register new user
- [ ] A2: Login with valid credentials
- [ ] A3: Login with invalid credentials
- [ ] A4: Session persistence
- [ ] A5: Session expiry
- [ ] A6: Logout
- [ ] A7: Protected route access
- [ ] A8: Update profile
- [ ] A9: Change password
- [ ] A10: Change password (wrong current)

### Dashboard & Projects
- [ ] P1: View projects list
- [ ] P2: Create project (manual script)
- [ ] P3: Create project (AI script)
- [ ] P4: Job polling
- [ ] P5: View project detail
- [ ] P6: Delete project
- [ ] P7: Trigger render
- [ ] P8: Regenerate scene

### Voice Management
- [ ] V1: List voices
- [ ] V2: Auto-create default voice
- [ ] V3: Create voice
- [ ] V4: Set default voice
- [ ] V5: Preview voice
- [ ] V6: Upload voice sample
- [ ] V7: Delete voice
- [ ] V8: Cannot delete default voice
- [ ] V9: Voice selector in wizard

### Scripts & Downloads
- [ ] S1: View scripts
- [ ] S2: Copy script
- [ ] S3: View downloads
- [ ] S4: Download spec.json
- [ ] S5: View spec in JSON viewer

### Settings
- [ ] T1: View settings
- [ ] T2: Update preferences
- [ ] T3: Preference persistence
- [ ] T4: Default settings
- [ ] T5: API Keys tab
- [ ] T6: Billing tab

### Cross-browser (if applicable)
- [ ] Chrome
- [ ] Firefox
- [ ] Safari

### Mobile responsive
- [ ] Sidebar collapses on mobile
- [ ] All pages usable on 375px width

---

## Tests de Autenticación

Los tests de autenticación cubren:
- Registro de usuarios (éxito y duplicados)
- Login (éxito, password incorrecto, usuario inactivo)
- Protección de rutas (sin token, token inválido, token expirado)
- Perfil de usuario (/me)

## Tests de Shape Renderers

Los tests de renderers verifican:
- El registry contiene todos los shapes esperados
- Cada renderer genera ExtendScript válido (no vacío)
- Cada renderer retorna el tipo correcto (string/list)
- Renderers con efectos y keyframes funcionan
