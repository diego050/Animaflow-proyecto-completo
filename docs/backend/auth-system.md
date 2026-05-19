# Authentication System

> **Fecha:** Mayo 2026 | **Sprint:** 5 | **Status:** Implemented

---

## Authentication Flow

```
┌──────────┐     POST /api/auth/login      ┌───────────┐
│          │  ┌─────────────────────────┐  │           │
│  Client  │  │  1. Validate credentials │  │  FastAPI  │
│  (React) │◄─┤  2. Verify bcrypt hash   │◄─┤  /auth    │
│          │  │  3. Create JWT token     │  │           │
│          │  │  4. Return {token, user} │  │           │
└────┬─────┘  └─────────────────────────┘  └───────────┘
     │
     │ Store token in localStorage
     │ Attach Bearer header to all requests
     ▼
┌─────────────────────────────────────────────┐
│  Subsequent Requests                         │
│                                              │
│  GET /api/jobs                               │
│  Authorization: Bearer eyJhbGci...           │
│                                              │
│  FastAPI:                                    │
│  1. Extract Bearer token                     │
│  2. Decode JWT (HS256, SECRET_KEY)           │
│  3. Lookup user by sub (user_id)             │
│  4. Check is_active                          │
│  5. Return User or 401                       │
└─────────────────────────────────────────────┘
```

---

## JWT Token Structure

**Algorithm:** HS256

**Payload:**
```json
{
  "sub": "user-uuid-here",
  "exp": 1716000000
}
```

**Claims:**
| Claim | Type | Description |
|---|---|---|
| `sub` | string | User ID (UUID) |
| `exp` | timestamp | Expiration time (default: 30 minutes) |

**Configuration:** `backend/app/core/config.py`
- `SECRET_KEY`: Environment variable (required)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Default 30

**Token creation:** `backend/app/core/security.py:31-38`

```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
```

---

## Password Hashing

**Library:** `passlib[bcrypt]`

**Algorithm:** bcrypt (via `CryptContext`)

**Source:** `backend/app/core/security.py:17-28`

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```

**Properties:**
- Automatic salt generation
- Cost factor: default (12 rounds)
- Irreversible: cannot recover original password
- Timing-safe verification

---

## Route Protection Pattern

All protected routes use the `get_current_active_user` dependency:

```python
from app.core.security import get_current_active_user

@router.get("/protected", response_model=SomeResponse)
def protected_endpoint(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # current_user is guaranteed to be authenticated and active
    # All queries filter by current_user.id for ownership
    ...
```

**Dependency chain:**
```
get_current_active_user
  └── get_current_user
        ├── HTTPBearer() → Extract Bearer token from header
        ├── jwt.decode() → Validate signature + expiration
        ├── db.query(User) → Lookup user by sub claim
        └── Check user.is_active
```

**Source:** `backend/app/core/security.py:41-77`

---

## Protected Routes (Sprint 5-6)

| Router | Endpoints | Auth |
|---|---|---|
| `/api/auth` | `GET /me`, `PUT /me` | ✅ Required |
| `/api/auth` | `POST /register`, `POST /login` | ❌ Public |
| `/api/jobs` | All endpoints | ✅ Required |
| `/api/voices` | All endpoints | ✅ Required |
| `/api/exports` | All endpoints | ✅ Required |
| `/api/audio` | All endpoints | ✅ Required |

---

## Security Considerations

### Current (MVP)

| Aspect | Implementation | Risk Level |
|---|---|---|
| Token storage | `localStorage` | Medium (XSS vulnerable) |
| Token expiration | 30 minutes | Low |
| Password hashing | bcrypt | Low |
| Error messages | Generic ("Invalid email or password") | Low (prevents enumeration) |
| HTTPS | Not enforced in dev | High (required in prod) |

### Future Improvements

| Improvement | Priority | Description |
|---|---|---|
| httpOnly cookies | High | Move token from localStorage to httpOnly cookie |
| Refresh tokens | Medium | Long-lived refresh + short-lived access tokens |
| Token blacklist | Medium | Redis-based token revocation on logout |
| Rate limiting | High | Prevent brute force on login endpoint |
| Email verification | Medium | Verify email before activating account |
| Password strength | Low | Enforce minimum complexity requirements |
| 2FA | Low | TOTP-based two-factor authentication |

---

## Frontend Auth Flow

**Store:** `frontend/src/store/useAuthStore.ts`

```
LoginPage
  └── useAuthStore.login()
        └── POST /api/auth/login
              └── localStorage.setItem('animaflow_token', token)
              └── set({ user, token, isAuthenticated: true })
                    └── Navigate to /dashboard

ProtectedRoute
  └── Check isAuthenticated
        ├── true → Render children
        └── false → Navigate to /login

apiFetch()
  └── Read token from localStorage
  └── Attach Authorization: Bearer header
  └── On 401 → Clear token → Redirect to /login
```

**Token lifecycle:**
1. Login → token stored in `localStorage`
2. Every API call → token attached as Bearer header
3. On 401 → token cleared, redirect to `/login`
4. Logout → token removed from `localStorage`

**Source:** `frontend/src/api/client.ts:5-36`
