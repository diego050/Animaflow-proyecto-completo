# ADR-008: Voice Management Approach

> **Fecha:** Mayo 2026 | **Sprint:** 3 (UI) + 6 (API) | **Status:** Implemented

---

## Context

Users need to manage TTS voices for their video projects. Requirements include:
- Multiple voices per user (custom, cloned, preset)
- Voice preview before use
- Audio sample upload for voice cloning
- One default voice per user (used when no selection is made)
- Voice selection in the project creation wizard

Previously, voices were hardcoded/mock data in the frontend with no backend persistence.

---

## Decision

**Create a separate `voices` model with user FK, soft delete, and single default per user enforced at the application layer.**

### Model Design
```python
class Voice(Base):
    __tablename__ = "voices"
    id = Column(String(36), primary_key=True, default=uuid4)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    voicebox_profile_id = Column(String(255), nullable=True)
    gender = Column(String(50), default="neutral")
    language = Column(String(10), default="es")
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)  # soft delete
    audio_sample_path = Column(String(500), nullable=True)
```

### Key Design Choices

**1. Separate model (not embedded in jobs):**
- Voices are reusable across multiple jobs
- Users manage voices independently of projects
- Clean separation of concerns

**2. User FK (required):**
- Every voice belongs to exactly one user
- Indexed for fast per-user queries
- NOT NULL enforced from the start

**3. Soft delete (`is_active`):**
- Voices are never physically deleted
- Preserves history and prevents broken job references
- Default voice cannot be deleted

**4. Single default per user:**
- Enforced at application layer (not DB constraint)
- Setting `is_default=true` on one voice unsets it on others
- Auto-created default Kokoro voice if user has none

**5. Voice storage:**
- Audio samples stored in user-specific directories: `{STORAGE_PATH}/voice_samples/{user_id}/`
- File names use UUID to prevent collisions

---

## Consequences

### Positive
- **Clean separation:** Voices are independent entities, not tied to jobs
- **Easy to extend:** New voice properties can be added without affecting jobs
- **User isolation:** Each user manages their own voices
- **Soft delete safety:** No data loss, easy to restore
- **Auto-default:** New users get a working voice immediately

### Negative
- **Application-layer constraint:** Default voice uniqueness not enforced by DB
- **Storage management:** Audio samples accumulate and need cleanup strategy
- **Voice cloning complexity:** Uploaded samples need processing pipeline (future)

### Mitigations
- Default voice logic is centralized in create/update endpoints
- Storage paths are user-scoped for easy cleanup
- Voice preview endpoint validates voice ownership before generating TTS

---

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Embed voice in job model | Simple | No reuse, no management | Rejected |
| Shared voice library | Users share voices | Privacy concerns, overkill for MVP | Deferred to v2 |
| External TTS service API | No storage needed | Vendor lock-in, cost | Deferred to v2 |
| Hard delete voices | Simpler | Data loss, broken references | Rejected |

---

## References
- Model: `backend/app/db/models.py:53-78`
- API endpoints: `backend/app/api/voices.py`
- Frontend store: `frontend/src/store/useDashboardStore.ts:374-434`
- Frontend page: `frontend/src/pages/VoicesPage.tsx`
