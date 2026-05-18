# ADR-007: User-Job Relationship

> **Fecha:** Mayo 2026 | **Sprint:** 6 | **Status:** Implemented

---

## Context

With the introduction of user authentication (Sprint 5), all existing and new jobs need to be scoped to their owner. Previously, jobs had no user association — they were globally accessible.

Requirements:
- Every job must be associated with a user
- Users can only see/edit/delete their own jobs
- Existing jobs (created before auth) must not break
- The relationship should support future features (job sharing, team access)

---

## Decision

**Add a nullable foreign key `user_id` on the `jobs` table, with a migration period to backfill existing jobs.**

### Schema Change
```python
user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
```

### Why Nullable?
- **Backward compatibility:** Existing jobs without a user_id continue to work
- **Gradual migration:** Can backfill existing jobs with a default user or mark as orphaned
- **Zero downtime:** No need to modify existing data before deploying

### Ownership Enforcement
All job endpoints filter by `current_user.id`:

```python
job = db.query(JobModel).filter(
    JobModel.id == job_id,
    JobModel.user_id == current_user.id,
).first()
```

This ensures users cannot access jobs they don't own, even if the job exists.

### Future Plan
After migration period, make `user_id` NOT NULL to enforce ownership for all new jobs.

---

## Consequences

### Positive
- **Zero-downtime deployment:** Existing jobs are unaffected
- **Clean isolation:** Each user sees only their jobs
- **Indexed for performance:** `user_id` is indexed for fast lookups
- **Simple to implement:** Single column addition + query filter

### Negative
- **Orphaned jobs:** Pre-auth jobs have no owner (visible to no one after auth)
- **Migration needed:** Script required to assign existing jobs to users
- **Nullable constraint:** Application must handle NULL user_id until migration complete
- **No cascade delete:** Deleting a user doesn't delete their jobs (intentional for audit)

### Mitigations
- Seed script creates a pilot user for testing
- Jobs list returns only jobs where `user_id == current_user.id`
- Orphaned jobs (NULL user_id) are excluded from all queries
- TODO comment in model reminds to make non-nullable after migration

---

## Alternatives Considered

| Alternative | Pros | Cons | Decision |
|---|---|---|---|
| Non-nullable FK from start | Enforces ownership | Breaks existing jobs, requires data migration first | Rejected |
| Separate ownership table | Flexible (multiple owners) | Over-engineering for MVP | Deferred to v2 |
| Soft delete user_id | Preserves history | Adds complexity | Rejected |
| No user association | Simple | No multi-tenant support | Rejected (defeats auth purpose) |

---

## References
- Model: `backend/app/db/models.py:44`
- Job endpoints: `backend/app/api/jobs.py` (all endpoints filter by user_id)
- Migration: `backend/app/db/migrations/versions/` (add_user_id_to_jobs)
