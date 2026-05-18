# ADR-006: Authentication Strategy

> **Fecha:** Mayo 2026 | **Sprint:** 5 | **Status:** Implemented

---

## Context

AnimaFlow is transitioning from a single-user MVP to a multi-tenant SaaS platform. Users need to:
- Create accounts and authenticate
- Have their jobs scoped to their account (data isolation)
- Manage their own voices and settings
- Access the platform securely from any device

The previous implementation had no authentication — all jobs were shared and accessible without credentials.

---

## Decision

**Use JWT tokens stored in localStorage for MVP, migrate to httpOnly cookies in future.**

### Token Specification
- **Algorithm:** HS256
- **Payload:** `{ sub: user_id, exp: timestamp }`
- **Expiration:** 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- **Secret:** Environment variable `SECRET_KEY`

### Storage Strategy
- **MVP (current):** `localStorage` — simple to implement, works with SPA architecture
- **Future:** httpOnly cookies — XSS resistant, requires server-side cookie management

### Password Security
- **Hashing:** bcrypt via `passlib` (12 rounds, automatic salt)
- **Verification:** Timing-safe comparison
- **Error messages:** Generic ("Invalid email or password") to prevent email enumeration

### Route Protection
- All API routes except `/api/auth/register` and `/api/auth/login` require Bearer token
- FastAPI dependency: `get_current_active_user`
- Frontend: `ProtectedRoute` component + automatic 401 redirect

---

## Consequences

### Positive
- **Simple implementation:** JWT + localStorage works out of the box with React SPA
- **Stateless:** No server-side session storage needed
- **Fast:** Token validation is O(1) — decode + verify signature
- **Scalable:** Works across multiple API instances without shared session store
- **Quick to deploy:** No additional infrastructure needed

### Negative
- **XSS vulnerability:** localStorage is accessible to any JavaScript on the page
- **No server-side revocation:** Tokens are valid until expiration (30 min max)
- **Token theft:** If stolen, attacker has full access until expiration
- **CSRF not applicable:** Bearer tokens in headers are not auto-sent by browsers (unlike cookies)

### Mitigations
- Short expiration (30 minutes) limits damage window
- No sensitive data in token payload (only user ID)
- 401 responses trigger immediate client-side logout
- Future: httpOnly cookies eliminate XSS token theft vector

---

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Session cookies | Server-side control, easy revocation | Requires session store, less scalable | Rejected for MVP |
| httpOnly cookies | XSS resistant | Requires CORS config, more complex | Deferred to v2 |
| OAuth2 / social login | Better UX, no password management | Third-party dependency, overkill for MVP | Deferred to v2 |
| API keys | Simple, stateless | No user identity, poor UX | Not suitable for SaaS |

---

## References
- Implementation: `backend/app/core/security.py`
- API routes: `backend/app/api/auth.py`
- Frontend store: `frontend/src/store/useAuthStore.ts`
- API client: `frontend/src/api/client.ts`
