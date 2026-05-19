# API Reference

> **Fecha:** Mayo 2026 | **Base URL:** `http://localhost:8000` | **Auth:** Bearer JWT

---

## Authentication

All endpoints except `POST /api/auth/register` and `POST /api/auth/login` require a valid Bearer token.

```
Authorization: Bearer <token>
```

**401 Response:** Token missing, invalid, or expired → client redirects to `/login`.

---

## Auth Endpoints

### POST /api/auth/register

Create a new user account and return an access token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name",
  "role": "user"
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "is_active": true,
    "created_at": "2026-05-18T00:00:00",
    "updated_at": "2026-05-18T00:00:00"
  }
}
```

**Errors:**
| Code | Detail |
|---|---|
| 400 | Email already registered |

**Source:** `backend/app/api/auth.py:20-46`

---

### POST /api/auth/login

Authenticate and receive an access token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):** Same as register response.

**Errors:**
| Code | Detail |
|---|---|
| 401 | Invalid email or password |
| 400 | Inactive user |

**Source:** `backend/app/api/auth.py:49-70`

---

### GET /api/auth/me

Get current user profile.

**Auth:** Required

**Response (200):** `UserResponse` schema (see above).

**Errors:**
| Code | Detail |
|---|---|
| 401 | Could not validate credentials |

**Source:** `backend/app/api/auth.py:73-76`

---

### PUT /api/auth/me

Update current user profile.

**Auth:** Required

**Request:**
```json
{
  "name": "New Name",
  "email": "new@example.com",
  "current_password": "oldpass",
  "new_password": "newpass"
}
```

All fields are optional. `current_password` is required when changing password.

**Response (200):** Updated `UserResponse`.

**Errors:**
| Code | Detail |
|---|---|
| 400 | Email already in use |
| 400 | Invalid current password |

**Source:** `backend/app/api/auth.py:79-108`

---

## Job Endpoints

### GET /api/jobs

List all jobs for the current user (max 50, newest first).

**Auth:** Required

**Response (200):**
```json
[
  {
    "job_id": "uuid",
    "status": "completed",
    "script_text": "Hello world...",
    "video_url": "/storage/outputs/...",
    "created_at": "2026-05-18T00:00:00"
  }
]
```

**Source:** `backend/app/api/jobs.py:141-163`

---

### POST /api/jobs/

Create a new job and enqueue pipeline processing.

**Auth:** Required

**Request:**
```json
{
  "script_text": "Hello world. This is a test.",
  "aspect_ratio": "9:16"
}
```

**Response (201):**
```json
{
  "job_id": "uuid",
  "status": "pending"
}
```

**Source:** `backend/app/api/jobs.py:18-37`

---

### GET /api/jobs/{job_id}

Get job status and result.

**Auth:** Required (ownership verified)

**Response (200):**
```json
{
  "job_id": "uuid",
  "status": "spec_ready",
  "result_spec": {
    "scenes": [...],
    "metadata": {...}
  },
  "video_url": null
}
```

**Errors:**
| Code | Detail |
|---|---|
| 404 | Job no encontrado |

**Source:** `backend/app/api/jobs.py:40-59`

---

### DELETE /api/jobs/{job_id}

Delete a job.

**Auth:** Required (ownership verified)

**Response (200):**
```json
{
  "status": "deleted",
  "job_id": "uuid"
}
```

**Source:** `backend/app/api/jobs.py:62-78`

---

### POST /api/jobs/{job_id}/render

Trigger video render for a job with a generated spec.

**Auth:** Required (ownership verified)

**Response (200):** JobResponse with status `queued_render`.

**Errors:**
| Code | Detail |
|---|---|
| 404 | Job no encontrado |
| 400 | El job aún no tiene un Spec generado para renderizar |
| 400 | El job ya se está renderizando |

**Source:** `backend/app/api/jobs.py:81-116`

---

### POST /api/jobs/generate-script

Generate a script from project info using LLM.

**Auth:** Required

**Request:**
```json
{
  "info": "A 30-second explainer about AI for small businesses"
}
```

**Response (200):**
```json
{
  "script_text": "Did you know that AI can transform..."
}
```

**Source:** `backend/app/api/jobs.py:130-138`

---

### POST /api/jobs/{job_id}/scenes/{scene_index}/regenerate

Regenerate a specific scene with new parameters.

**Auth:** Required (ownership verified)

**Request:**
```json
{
  "media_query": "futuristic cityscape at night",
  "text": "The future is now."
}
```

**Response (200):** JobResponse with updated `result_spec`.

**Errors:**
| Code | Detail |
|---|---|
| 404 | Job no encontrado o sin spec |
| 400 | Índice de escena inválido |
| 500 | Internal error |

**Source:** `backend/app/api/jobs.py:166-211`

---

## Voice Endpoints

### GET /api/voices/

List all voices for the current user. Auto-creates default Kokoro voice if none exist.

**Auth:** Required

**Response (200):**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Kokoro ES (Default)",
    "gender": "neutral",
    "language": "es",
    "is_default": true,
    "is_active": true,
    "voicebox_profile_id": "kokoro-default",
    "audio_sample_path": null,
    "created_at": "2026-05-18T00:00:00",
    "updated_at": "2026-05-18T00:00:00"
  }
]
```

**Source:** `backend/app/api/voices.py:19-53`

---

### POST /api/voices/

Create a new voice.

**Auth:** Required

**Request:**
```json
{
  "name": "My Custom Voice",
  "gender": "female",
  "language": "es",
  "is_default": false
}
```

**Response (201):** `VoiceResponse`

**Source:** `backend/app/api/voices.py:56-80`

---

### POST /api/voices/{voice_id}/upload-sample

Upload an audio sample for voice cloning.

**Auth:** Required (ownership verified)

**Request:** `multipart/form-data` with `file` field.

**Response (200):** Updated `VoiceResponse` with `audio_sample_path`.

**Errors:**
| Code | Detail |
|---|---|
| 404 | Voice not found |

**Source:** `backend/app/api/voices.py:83-115`

---

### GET /api/voices/{voice_id}/preview

Generate a TTS preview for a voice.

**Auth:** Required (ownership verified)

**Request:**
```json
{
  "text": "Esta es una prueba de voz."
}
```

**Response (200):**
```json
{
  "audio_url": "/storage/outputs/preview_...",
  "duration": 2.5
}
```

**Errors:**
| Code | Detail |
|---|---|
| 404 | Voice not found |
| 500 | TTS generation failed |

**Source:** `backend/app/api/voices.py:118-143`

---

### PUT /api/voices/{voice_id}

Update voice properties.

**Auth:** Required (ownership verified)

**Request:** Any subset of `{name, gender, language, is_default}`.

**Response (200):** Updated `VoiceResponse`.

**Source:** `backend/app/api/voices.py:146-179`

---

### DELETE /api/voices/{voice_id}

Soft delete a voice (sets `is_active = false`).

**Auth:** Required (ownership verified)

**Response (204):** No content.

**Errors:**
| Code | Detail |
|---|---|
| 404 | Voice not found |
| 400 | Cannot delete default voice |

**Source:** `backend/app/api/voices.py:182-203`

---

## Error Response Format

All errors follow this format:

```json
{
  "detail": "Human-readable error message"
}
```

### Common HTTP Status Codes

| Code | Meaning | When |
|---|---|---|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST (register, create job, create voice) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, business logic violation |
| 401 | Unauthorized | Missing/invalid/expired token |
| 404 | Not Found | Resource not found or not owned by user |
| 500 | Internal Server Error | Unexpected server error |
