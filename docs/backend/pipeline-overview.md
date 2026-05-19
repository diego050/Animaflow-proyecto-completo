# Pipeline Overview

> **Fecha:** Mayo 2026 | **Workers:** RQ + Redis | **Status:** Implemented (Sprints 1-6)

---

## Full Pipeline Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PIPELINE OVERVIEW                              │
│                                                                       │
│  User Input (text)                                                    │
│       │                                                               │
│       ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Step 0: Job Creation (FastAPI, synchronous)                    │ │
│  │  POST /api/jobs/                                                 │ │
│  │  → Create JobModel (status: "pending")                           │ │
│  │  → Enqueue to Redis RQ: queue.enqueue(run_pipeline, job_id, ...) │ │
│  │  → Return job_id immediately (non-blocking)                      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│       │                                                               │
│       ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Step 1: TTS Worker (RQ)                                         │ │
│  │  run_pipeline(job_id, script_text)                               │ │
│  │  ┌───────────────────────────────────────────────────────────┐  │ │
│  │  │  Voicebox (Kokoro engine)                                  │  │ │
│  │  │  Input: script_text                                        │  │ │
│  │  │  Output: audio.mp3 + word-level timestamps                 │  │ │
│  │  │  Status update: "pending" → "processing" → "tts_done"     │  │ │
│  │  └───────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│       │                                                               │
│       ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Step 2: Segmentation Worker (RQ)                                │ │
│  │  ┌───────────────────────────────────────────────────────────┐  │ │
│  │  │  Split script into ~7 second chunks                        │  │ │
│  │  │  Each chunk → one scene in spec.json                       │  │ │
│  │  │  Calculate timing from word-level timestamps               │  │ │
│  │  │  Status update: "tts_done" → "segmenting" → "llm_processing"│ │
│  │  └───────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│       │                                                               │
│       ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Step 3: LLM Worker (RQ)                                         │ │
│  │  ┌───────────────────────────────────────────────────────────┐  │ │
│  │  │  LLM generates per-scene:                                  │  │ │
│  │  │  • media_query (image/video search query)                  │  │ │
│  │  │  • remotion_props (animation parameters)                   │  │ │
│  │  │  • SFX cues (sound effects)                                │  │ │
│  │  │  • Boundary correction (scene timing adjustments)          │  │ │
│  │  │  Status update: "llm_processing" → "spec_ready"           │  │ │
│  │  └───────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│       │                                                               │
│       ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Step 4: Render Worker (RQ, triggered on demand)                 │ │
│  │  POST /api/jobs/{id}/render                                      │ │
│  │  ┌───────────────────────────────────────────────────────────┐  │ │
│  │  │  Remotion renders spec.json → MP4                          │  │ │
│  │  │  Status update: "spec_ready" → "queued_render" →           │  │ │
│  │  │                   "rendering" → "completed"               │  │ │
│  │  └───────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│       │                                                               │
│       ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Step 5: AE Export (on demand, separate endpoint)                │ │
│  │  POST /api/jobs/{id}/export/after-effects                        │ │
│  │  ┌───────────────────────────────────────────────────────────┐  │ │
│  │  │  spec.json → After Effects project structure → .zip        │  │ │
│  │  └───────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Job Status State Machine

```
                    ┌──────────┐
                    │ pending  │
                    └────┬─────┘
                         │
                         ▼
                    ┌──────────┐
                    │processing│
                    └────┬─────┘
                         │
                         ▼
                    ┌──────────┐
                    │ tts_done │
                    └────┬─────┘
                         │
                         ▼
                    ┌────────────┐
                    │ segmenting │
                    └─────┬──────┘
                          │
                          ▼
                    ┌────────────────┐
                    │llm_processing  │
                    └──────┬─────────┘
                           │
                           ▼
                    ┌───────────┐
              ┌─────│ spec_ready│─────┐
              │     └─────┬─────┘     │
              │           │           │
              │           ▼           │
              │     ┌────────────┐    │
              │     │queued_render│   │
              │     └─────┬──────┘    │
              │           │           │
              │           ▼           │
              │     ┌──────────┐      │
              │     │ rendering│      │
              │     └────┬─────┘      │
              │          │            │
              │          ▼            │
              │     ┌──────────┐      │
              │     │ completed│      │
              │     └──────────┘      │
              │                       │
              ▼                       ▼
         ┌────────┐            ┌──────────┐
         │ failed │            │completed │
         └────────┘            │_video    │
                               └──────────┘
```

**Terminal statuses:** `completed`, `completed_video`, `failed`

**Polling stops** when a terminal status is reached (frontend: `isTerminalStatus()`).

---

## TTS Integration

**Engine:** Voicebox with Kokoro model

**Service:** `app.services.pipeline.generate_tts_with_voicebox()`

**Input:**
- `text`: Script text to convert
- `scene_id`: Unique identifier for output file naming

**Output:**
- `duration`: Audio duration in seconds
- `audio_url`: Path to generated MP3 file

**Word-level timestamps:** Generated during TTS for precise scene segmentation.

**Fallback:** If Voicebox fails, the pipeline should have a deterministic fallback (TBD).

---

## LLM Visual Spec Generation

**Triggered:** After segmentation (Step 3)

**Input per scene:**
- Scene text
- Duration
- Position in sequence

**Output per scene:**
```json
{
  "media_query": "futuristic cityscape at night, neon lights",
  "remotion_props": {
    "animation": "fade-in",
    "duration": 7.2,
    "transition": "crossfade"
  },
  "sfx": [
    {
      "type": "ambient",
      "cue": "city hum",
      "timestamp": 0.0
    }
  ]
}
```

**Model strategy:** Dual model with fallback (`gemma-4-31b-it` → `gemma-4-26b-a4b-it`)

**Source:** `backend/app/services/pipeline.py`

---

## Remotion Render Pipeline

**Triggered:** `POST /api/jobs/{id}/render` (on demand)

**Flow:**
1. Job status → `queued_render`
2. RQ enqueues `render_video_pipeline(job_id)`
3. Worker reads `result_spec` from database
4. Generates Remotion composition from spec
5. Renders to MP4 at 30fps
6. Updates `video_url` and status → `completed`

**Constraints:**
- 30fps locked
- Composition and Sequence components only
- No direct DOM mutations

---

## AE Export Pipeline

**Triggered:** `POST /api/jobs/{id}/export/after-effects` (on demand)

**Flow:**
1. Read `result_spec` from database
2. Generate After Effects project structure:
   - Compositions per scene
   - Text layers with timing
   - Shape layers for animations
   - Markers for SFX cues
3. Package as `.zip` with `ae_metadata`
4. Store in `{STORAGE_PATH}/ae_exports/`

**Download:** `GET /api/jobs/{id}/export/after-effects/download`

---

## RQ Worker Configuration

**Queue:** `default`

**Job timeout:** 10 minutes (`job_timeout="10m"`)

**Workers (development):** `SimpleWorker` (Windows compatible)

**Workers (production):** Separate worker containers per task type:
- TTS worker
- LLM worker
- Render worker

**Enqueue pattern:**
```python
queue.enqueue(run_pipeline, job_id, script_text, job_timeout="10m")
queue.enqueue(render_video_pipeline, job_id, job_timeout="10m")
```

**Source:** `backend/app/api/jobs.py:14-15, 35, 106`
