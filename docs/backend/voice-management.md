# Voice Management

> **Fecha:** Mayo 2026 | **Sprint:** 3 (UI) + 6 (API) | **Status:** Implemented

---

## Voice Model Schema

**Source:** `backend/app/db/models.py:53-78`

```python
class Voice(Base):
    __tablename__ = "voices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    voicebox_profile_id = Column(String(255), nullable=True)
    gender = Column(String(50), nullable=False, default="neutral")
    language = Column(String(10), nullable=False, default="es")
    is_default = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    audio_sample_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.datetime.utcnow())
    updated_at = Column(DateTime, nullable=False, ...)
```

### Field Descriptions

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Unique voice identifier |
| `user_id` | UUID (FK) | Owner — required, indexed |
| `name` | String | Display name (e.g., "Kokoro ES (Default)") |
| `voicebox_profile_id` | String | Reference to Voicebox engine profile |
| `gender` | String | `male`, `female`, `neutral` |
| `language` | String | ISO 639-1 code (`es`, `en`, etc.) |
| `is_default` | Boolean | User's default voice (one per user) |
| `is_active` | Boolean | Soft delete flag |
| `audio_sample_path` | String | Path to uploaded voice clone sample |

---

## Voice Endpoints Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/voices/` | ✅ | List user voices (auto-creates default) |
| `POST` | `/api/voices/` | ✅ | Create new voice |
| `POST` | `/api/voices/{id}/upload-sample` | ✅ | Upload audio sample for cloning |
| `GET` | `/api/voices/{id}/preview` | ✅ | Generate TTS preview |
| `PUT` | `/api/voices/{id}` | ✅ | Update voice properties |
| `DELETE` | `/api/voices/{id}` | ✅ | Soft delete (cannot delete default) |

**Source:** `backend/app/api/voices.py`

---

## Voicebox Integration

Voice management integrates with the Voicebox TTS engine (Kokoro) for:

1. **Default voice creation:** When a user has no voices, a default Kokoro ES voice is auto-created on `GET /api/voices/`.

2. **Preview generation:** `POST /api/voices/{id}/preview` calls `generate_tts_with_voicebox()` to produce audio from text.

```python
# backend/app/api/voices.py:134-143
duration, audio_url = await generate_tts_with_voicebox(
    text=preview_data.text,
    scene_id=f"preview_{voice_id}",
)
return {"audio_url": audio_url, "duration": duration}
```

3. **Pipeline TTS:** During job processing, the pipeline uses Voicebox to generate audio with word-level timestamps.

---

## Audio Upload Flow

```
┌──────────┐     POST /api/voices/{id}/upload-sample     ┌───────────┐
│  Client  │  ┌─────────────────────────────────────┐   │  FastAPI  │
│  (React) │  │  1. Verify voice ownership          │   │  /voices  │
│          │  │  2. Create user-specific directory  │   │           │
│          │  │     /storage/voice_samples/{user_id}│   │           │
│          │  │  3. Save file with UUID name        │   │           │
│          │  │  4. Update audio_sample_path in DB  │   │           │
│          │  │  5. Return updated VoiceResponse    │   │           │
└──────────┘  └─────────────────────────────────────┘   └───────────┘
```

**File storage pattern:**
```
{STORAGE_PATH}/voice_samples/{user_id}/{uuid}.{ext}
```

**Source:** `backend/app/api/voices.py:83-115`

**Frontend upload helper:** `frontend/src/api/client.ts:38-76` (`apiUpload`)

---

## Preview Generation

```
┌──────────┐     POST /api/voices/{id}/preview     ┌───────────┐
│  Client  │  ┌─────────────────────────────────┐  │  FastAPI  │
│  (React) │  │  1. Verify voice ownership      │  │  /voices  │
│          │  │  2. Call generate_tts_with_     │  │           │
│          │  │     voicebox(text, scene_id)    │  │           │
│          │  │  3. Return {audio_url, duration}│  │           │
└────┬─────┘  └─────────────────────────────────┘  └───────────┘
     │
     │ Play audio_url in <audio> element
     ▼
┌─────────────────┐
│  PreviewPlayer  │
│  (Remotion)     │
└─────────────────┘
```

**Request:**
```json
{
  "text": "Esta es una prueba de voz."
}
```

**Response:**
```json
{
  "audio_url": "/storage/outputs/preview_abc123.mp3",
  "duration": 2.5
}
```

---

## Frontend Voice Integration

**Store:** `frontend/src/store/useDashboardStore.ts:374-434`

### Voice Actions

| Action | API Call | Description |
|---|---|---|
| `fetchVoices()` | `GET /api/voices/` | Load voices, map to frontend type |
| `createVoice(data)` | `POST /api/voices/` | Create new voice |
| `updateVoice(id, data)` | `PUT /api/voices/{id}` | Update properties |
| `deleteVoice(id)` | `DELETE /api/voices/{id}` | Soft delete |
| `uploadVoiceSample(id, file)` | `POST /api/voices/{id}/upload-sample` | Upload via `apiUpload` |
| `previewVoice(id, text)` | `POST /api/voices/{id}/preview` | Generate TTS preview |

### Type Mapping

Backend `VoiceResponse` → Frontend `Voice`:

```typescript
// backend → frontend type mapping
function mapBackendVoice(backend: BackendVoice): Voice {
  return {
    id: backend.id,
    name: backend.name,
    gender: backend.gender,
    language: backend.language,
    isDefault: backend.is_default,
    isActive: backend.is_active,
  };
}
```

**Source:** `frontend/src/types/job.ts`

---

## Default Voice Behavior

- **Auto-creation:** `GET /api/voices/` creates a default Kokoro ES voice if none exist
- **Single default:** Setting `is_default=true` on a voice automatically unsets it on all other voices for that user
- **Deletion protection:** The default voice cannot be deleted (returns 400)
- **Wizard integration:** NewProjectWizard step 2 uses the default voice if no selection is made
