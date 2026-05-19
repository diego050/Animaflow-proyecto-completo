# Sprint 5-6 Report: Authentication System + Voice Endpoints + User-Job FK

> **Fecha:** Mayo 2026 | **Status:** ✅ Completado

---

## Goals

1. Implement full authentication system (backend + frontend)
2. Add user model with JWT auth and bcrypt password hashing
3. Protect all API routes with user ownership
4. Create voice management API endpoints
5. Add user-job foreign key relationship
6. Connect frontend voice management to real API
7. Remove all mock data from frontend

---

## What Was Completed

### Sprint 5: Authentication System

**Backend:**
- **User model** (`backend/app/db/models.py`)
  - Fields: id, email, hashed_password, name, role, is_active, timestamps
  - Email unique index for login lookup
- **JWT authentication** (`backend/app/core/security.py`)
  - `create_access_token()` — HS256, configurable expiration
  - `get_current_user()` — Bearer token extraction + validation
  - `get_current_active_user()` — Active user check
  - `get_password_hash()` / `verify_password()` — bcrypt via passlib
- **Auth endpoints** (`backend/app/api/auth.py`)
  - `POST /api/auth/register` — Create user + return token
  - `POST /api/auth/login` — Authenticate + return token
  - `GET /api/auth/me` — Get current user profile
  - `PUT /api/auth/me` — Update profile (name, email, password)
- **Route protection** — All job/export/audio routes protected with `get_current_active_user`
- **Alembic migration** — `add_users_table` migration
- **Admin creation script** — `scripts/create_admin.py` for initial admin setup

**Frontend:**
- **Auth store** (`frontend/src/store/useAuthStore.ts`)
  - State: user, token, isLoading, error, isAuthenticated
  - Actions: login, register, logout, fetchMe, updateProfile
- **API client** (`frontend/src/api/client.ts`)
  - Automatic Bearer token attachment
  - 401 handling → clear token → redirect to /login
  - `apiUpload` for multipart/form-data
- **ProtectedRoute** component — Route guards for all protected pages
- **LoginPage** — Connected to real auth API
- **DashboardLayout topbar** — User info display + logout button

### Sprint 6: Voice Endpoints + User-Job FK

**Backend:**
- **Voice model** (`backend/app/db/models.py`)
  - Fields: id, user_id (FK), name, voicebox_profile_id, gender, language, is_default, is_active, audio_sample_path, timestamps
- **6 voice endpoints** (`backend/app/api/voices.py`)
  - `GET /api/voices/` — List (auto-creates default)
  - `POST /api/voices/` — Create
  - `POST /api/voices/{id}/upload-sample` — Upload audio
  - `GET /api/voices/{id}/preview` — TTS preview
  - `PUT /api/voices/{id}` — Update
  - `DELETE /api/voices/{id}` — Soft delete
- **User-Job relationship**
  - Added `user_id` FK (nullable) to jobs table
  - All job endpoints filter by `current_user.id`
- **Alembic migrations**
  - `add_user_id_to_jobs` — FK on jobs
  - `create_voices_table` — Voices table

**Frontend:**
- **Connected VoicesPage to real API** — Removed all mock data
- **Voice selector in NewProjectWizard** — Uses real voice data
- **apiUpload helper** — For multipart voice sample uploads
- **Type mapping** — `mapBackendVoice()` converts backend response to frontend type

---

## Files Created/Modified

### Backend

| File | Action | Description |
|---|---|---|
| `backend/app/db/models.py` | Modified | Added User, Voice models; user_id FK on JobModel |
| `backend/app/core/security.py` | Created | JWT, bcrypt, auth dependencies |
| `backend/app/api/auth.py` | Created | Auth endpoints (register, login, me) |
| `backend/app/api/voices.py` | Created | Voice management endpoints |
| `backend/app/api/jobs.py` | Modified | Added auth to all endpoints, user_id filtering |
| `backend/app/schemas/auth.py` | Created | Pydantic schemas (UserCreate, Token, UserResponse) |
| `backend/app/schemas/voice.py` | Created | Pydantic schemas (VoiceCreate, VoiceResponse) |
| `backend/app/db/migrations/` | Created | Alembic migrations for users, user_id, voices |

### Frontend

| File | Action | Description |
|---|---|---|
| `frontend/src/store/useAuthStore.ts` | Created | Auth Zustand store |
| `frontend/src/api/client.ts` | Created | API client with Bearer token |
| `frontend/src/types/auth.ts` | Created | Auth TypeScript types |
| `frontend/src/components/ProtectedRoute.tsx` | Created | Route guard component |
| `frontend/src/pages/LoginPage.tsx` | Modified | Connected to real auth |
| `frontend/src/components/DashboardLayout.tsx` | Modified | Added topbar with user info + logout |
| `frontend/src/pages/VoicesPage.tsx` | Modified | Connected to real API, removed mock data |
| `frontend/src/pages/NewProjectWizard.tsx` | Modified | Voice selector uses real data |

---

## Key Decisions

| Decision | Rationale |
|---|---|
| JWT in localStorage (MVP) | Simple implementation, works with SPA; migrate to httpOnly cookies later |
| Nullable user_id FK | Backward compatible with existing jobs; enforce non-null after migration |
| Soft delete for voices | Preserve history, prevent broken job references |
| Auto-create default voice | New users get a working voice immediately |
| Generic login error message | Prevents email enumeration attacks |
| No cascade delete on user-job | Preserve jobs for audit even if user is deleted |

---

## Issues Encountered

### Alembic Migration Chain Issues

| Issue | Resolution |
|---|---|
| Migration order conflict | Ensured `add_users_table` runs before `add_user_id_to_jobs` |
| Existing jobs with no user_id | Made FK nullable; will backfill in migration script |
| Voice table depends on users | Created voices migration after users migration |
| Downgrade not tested | Migrations are forward-only for MVP; downgrade scripts TBD |

### Auth Integration

| Issue | Resolution |
|---|---|
| Token persistence across refresh | Store in localStorage, restore on app mount |
| 401 race condition | `apiFetch` clears token and redirects; store catches and calls logout |
| ProtectedRoute flash | Initial render checks localStorage synchronously (no async gap) |
| Password change validation | Backend requires current_password; frontend validates match |

---

## Metrics

- **Backend files created:** 5
- **Backend files modified:** 2
- **Frontend files created:** 4
- **Frontend files modified:** 4
- **API endpoints added:** 10 (4 auth + 6 voices)
- **Database tables added:** 2 (users, voices)
- **Alembic migrations:** 3
- **Lines of code:** ~1,500 (backend) + ~800 (frontend)

---

## Migration Notes

### Running Migrations

```bash
cd backend
alembic upgrade head
```

### Migration Order

1. `add_users_table` — Creates users table
2. `add_user_id_to_jobs` — Adds nullable FK to jobs
3. `create_voices_table` — Creates voices table with user FK

### Admin Setup

```bash
# Create admin user after deployment
python scripts/create_admin.py --email admin@animaflow.com --name "Admin"
```

**Then log in at `/login` with the created credentials.**
