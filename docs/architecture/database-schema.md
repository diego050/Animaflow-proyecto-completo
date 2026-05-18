# Database Schema

> **Fecha:** Mayo 2026 | **ORM:** SQLAlchemy 2.0 | **Migrations:** Alembic

---

## ERD Diagram

```
┌──────────────────────────────────────┐
│              users                    │
├──────────────────────────────────────┤
│ PK  id              VARCHAR(36) UUID │
│     email           VARCHAR(255) UK  │◄── unique, indexed
│     hashed_password VARCHAR(255)     │
│     name            VARCHAR(255)     │
│     role            VARCHAR(50)      │  ◄── founder | agency | pilot
│     is_active       BOOLEAN          │
│     created_at      DATETIME         │
│     updated_at      DATETIME         │
└──────────┬───────────────────────────┘
           │
           │ 1:N
           │
    ┌──────┴──────────────────────────────┐
    │              jobs                    │
    ├─────────────────────────────────────┤
    │ PK  id          VARCHAR(36) UUID    │
    │ FK  user_id     VARCHAR(36)         │◄── nullable (migration period)
    │     status      VARCHAR             │  ◄── pending → ... → completed
    │     script_text TEXT                │
    │     aspect_ratio VARCHAR            │  ◄── 9:16, 16:9, 1:1
    │     result_spec JSON                │  ◄── full spec.json
    │     video_url   VARCHAR             │
    │     created_at  DATETIME            │
    └─────────────────────────────────────┘

    ┌──────┬──────────────────────────────┐
    │      │ 1:N                          │
    │      │                              │
    │ ┌────┴─────────────────────────────┐│
    │ │            voices                ││
    │ ├──────────────────────────────────┤│
    │ │ PK  id              VARCHAR(36)  ││
    │ │ FK  user_id         VARCHAR(36)  ││◄── NOT NULL
    │ │     name            VARCHAR(255) ││
    │ │     voicebox_profile_id VARCHAR  ││
    │ │     gender          VARCHAR(50)  ││
    │ │     language        VARCHAR(10)  ││
    │ │     is_default      BOOLEAN      ││◄── one per user
    │ │     is_active       BOOLEAN      ││◄── soft delete
    │ │     audio_sample_path VARCHAR    ││
    │ │     created_at      DATETIME     ││
    │ │     updated_at      DATETIME     ││
    │ └──────────────────────────────────┘│
    └─────────────────────────────────────┘
```

---

## Table Descriptions

### users

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PK, default UUID | Unique user identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | Login email |
| `hashed_password` | VARCHAR(255) | NOT NULL | Bcrypt hash |
| `name` | VARCHAR(255) | NOT NULL | Display name |
| `role` | VARCHAR(50) | NOT NULL, default `pilot` | founder, agency, pilot |
| `is_active` | BOOLEAN | NOT NULL, default `true` | Account status |
| `created_at` | DATETIME | NOT NULL | Creation timestamp |
| `updated_at` | DATETIME | NOT NULL | Last update timestamp |

**Indexes:** `email` (unique)

**Model:** `backend/app/db/models.py:7-30`

---

### jobs

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PK, default UUID | Unique job identifier |
| `user_id` | VARCHAR(36) | FK → users.id, NULLABLE, INDEX | Owner (nullable during migration) |
| `status` | VARCHAR | default `pending` | Pipeline state |
| `script_text` | TEXT | NOT NULL | Input script |
| `aspect_ratio` | VARCHAR | default `9:16` | Output format |
| `result_spec` | JSON | NULLABLE | Full spec.json output |
| `video_url` | VARCHAR | NULLABLE | Rendered MP4 path |
| `created_at` | DATETIME | default UTC | Creation timestamp |

**Indexes:** `user_id`

**Model:** `backend/app/db/models.py:33-51`

**Job Statuses:**
```
pending → processing → tts_done → segmenting → llm_processing →
spec_ready → queued_render → rendering → completed
                              ↘ failed
```

---

### voices

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PK, default UUID | Unique voice identifier |
| `user_id` | VARCHAR(36) | FK → users.id, NOT NULL, INDEX | Owner |
| `name` | VARCHAR(255) | NOT NULL | Display name |
| `voicebox_profile_id` | VARCHAR(255) | NULLABLE | Voicebox engine reference |
| `gender` | VARCHAR(50) | NOT NULL, default `neutral` | male, female, neutral |
| `language` | VARCHAR(10) | NOT NULL, default `es` | Language code |
| `is_default` | BOOLEAN | NOT NULL, default `false` | User's default voice |
| `is_active` | BOOLEAN | NOT NULL, default `true` | Soft delete flag |
| `audio_sample_path` | VARCHAR(500) | NULLABLE | Path to uploaded sample |
| `created_at` | DATETIME | NOT NULL | Creation timestamp |
| `updated_at` | DATETIME | NOT NULL | Last update timestamp |

**Indexes:** `user_id`

**Model:** `backend/app/db/models.py:53-78`

**Constraints (application layer):**
- One `is_default=true` voice per user
- Default voice cannot be deleted

---

## Relationships

```
users (1) ────< jobs (N)
  └── user_id FK (nullable during migration, enforce non-null later)
  └── ON DELETE: no cascade (jobs preserved for audit)

users (1) ────< voices (N)
  └── user_id FK (NOT NULL)
  └── ON DELETE: no cascade (voices preserved for audit)
```

---

## Migration History

| Migration | Description | Tables Affected |
|---|---|---|
| Initial | Base schema (jobs table) | jobs |
| `add_users_table` | User model for authentication | users |
| `add_user_id_to_jobs` | FK user_id on jobs (nullable) | jobs |
| `create_voices_table` | Voice model with user FK | voices |

**Migration files:** `backend/app/db/migrations/versions/`

**Run migrations:**
```bash
cd backend
alembic upgrade head
```

---

## Index Strategy

| Table | Column | Type | Reason |
|---|---|---|---|
| users | email | UNIQUE | Login lookup, prevents duplicates |
| jobs | user_id | INDEX | Per-user job filtering (all job endpoints) |
| voices | user_id | INDEX | Per-user voice listing |

**Rationale:** All queries filter by `user_id` for multi-tenant isolation. The `email` unique index prevents duplicate registrations and speeds up login lookups.

---

## Storage Paths

All file storage is organized under `settings.STORAGE_PATH`:

```
{STORAGE_PATH}/
├── outputs/           # Rendered MP4 videos
├── voice_samples/     # User voice audio samples
│   └── {user_id}/     # User-specific subdirectory
├── ae_exports/        # After Effects project zips
└── specs/             # spec.json files
```
