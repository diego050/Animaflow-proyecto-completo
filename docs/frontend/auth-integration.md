# Auth Integration

> **Fecha:** Mayo 2026 | **Sprint:** 5 | **Status:** Implemented

---

## Auth Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     LOGIN FLOW                                │
│                                                               │
│  ┌──────────┐    POST /api/auth/login     ┌───────────────┐  │
│  │          │  ┌───────────────────────┐  │               │  │
│  │ LoginPage│──│  email + password     │──│  FastAPI      │  │
│  │          │  │  useAuthStore.login() │  │  /auth/login  │  │
│  └────┬─────┘  └───────────────────────┘  └───────┬───────┘  │
│       │                                            │          │
│       │  ← { access_token, token_type, user }      │          │
│       │                                            │          │
│       ▼                                            │          │
│  localStorage.setItem('animaflow_token', token)    │          │
│  useAuthStore.set({ user, token, isAuthenticated })│          │
│  Navigate to /                                     │          │
└────────────────────────────────────────────────────┴──────────┘

┌──────────────────────────────────────────────────────────────┐
│                   SESSION RESTORATION                         │
│                                                               │
│  1. App mounts                                                │
│  2. useAuthStore initializes:                                 │
│     token = localStorage.getItem('animaflow_token')           │
│     isAuthenticated = !!token                                 │
│  3. If token exists → fetchMe()                               │
│     GET /api/auth/me (with Bearer token)                      │
│  4. If 200 → set user in store                                │
│  5. If 401 → logout() (clear token)                           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   ROUTE GUARD FLOW                            │
│                                                               │
│  <ProtectedRoute>                                             │
│    └── Check useAuthStore.isAuthenticated                     │
│          ├── true → <Outlet /> (render page)                  │
│          └── false → <Navigate to="/login" />                 │
│                                                               │
│  Routes protected:                                            │
│    /, /project/:id, /new, /voices, /scripts,                  │
│    /downloads, /settings                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## Token Storage

**Location:** `localStorage`
**Key:** `animaflow_token`
**Value:** JWT string (HS256)

### Storage Lifecycle

| Event | Action |
|---|---|
| Login success | `localStorage.setItem('animaflow_token', token)` |
| Register success | `localStorage.setItem('animaflow_token', token)` |
| App init | `localStorage.getItem('animaflow_token')` → restore state |
| API 401 | `localStorage.removeItem('animaflow_token')` → redirect |
| Logout | `localStorage.removeItem('animaflow_token')` → reset state |

**Source:** `frontend/src/store/useAuthStore.ts:28-31, 37, 57, 74, 84-86`

### Security Considerations

**Current risk:** localStorage is accessible to JavaScript (XSS vulnerable)

**Mitigation (MVP):**
- Short token expiration (30 minutes)
- No sensitive data in token payload (only user ID)
- 401 auto-logout prevents stale token usage

**Future improvement:** Migrate to httpOnly cookies (server-set, JS-inaccessible)

---

## Route Guards

**Component:** `ProtectedRoute`

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

**Usage in router:**
```typescript
<Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
  <Route index element={<ProjectsList />} />
  <Route path="project/:id" element={<ProjectDetail />} />
  <Route path="new" element={<NewProjectWizard />} />
  {/* ... all protected routes */}
</Route>
```

---

## 401 Handling

**Location:** `frontend/src/api/client.ts:22-27`

```typescript
if (!res.ok) {
  if (res.status === 401) {
    localStorage.removeItem('animaflow_token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  // ... other error handling
}
```

**Behavior:**
1. Any API response with status 401 triggers immediate logout
2. Token is cleared from localStorage
3. Browser redirects to `/login`
4. Error is thrown (caught by store actions)

**Same pattern in `apiUpload()`:** Lines 65-69

---

## Profile Update

**Endpoint:** `PUT /api/auth/me`

**Store action:** `useAuthStore.updateProfile(data)`

**Accepted fields:**
```typescript
interface UpdateUserRequest {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
}
```

**Flow:**
```
SettingsPage (Perfil tab)
  └── User fills form
        └── useAuthStore.updateProfile(data)
              └── PUT /api/auth/me
                    └── On success: update user in store
                    └── On error: set error state
```

**Password change requirements:**
- `current_password` must be provided and valid
- `new_password` is hashed server-side with bcrypt

**Source:**
- Frontend: `frontend/src/store/useAuthStore.ts:89-101`
- Backend: `backend/app/api/auth.py:79-108`

---

## Topbar User Display

**Component:** `DashboardLayout` topbar

Displays:
- User name (from `useAuthStore.user.name`)
- Logout button (calls `useAuthStore.logout()`)

**Source:** `frontend/src/components/DashboardLayout.tsx`

---

## Auth Store Initialization

```typescript
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('animaflow_token'),  // Restore on mount
  isLoading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('animaflow_token'),
  // ... actions
}));
```

The store reads from localStorage on creation, enabling session persistence across page refreshes.
