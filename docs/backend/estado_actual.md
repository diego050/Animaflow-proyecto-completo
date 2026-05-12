# Estado del Backend

## Endpoints Implementados
- `POST /api/jobs`: Recibe `script_text`. Persiste en Postgres (estado `pending`). Encola tarea en Redis/RQ. Retorna `job_id`.
- `GET /api/jobs/{job_id}`: Retorna estado del trabajo y `result_spec` (en caso de estar completado) y `video_url` (si ya se exportó).
- `POST /api/jobs/{job_id}/scenes/{scene_index}/regenerate`: Regenera una escena específica (reprocesa TTS si cambia el texto, y re-genera el TSX con Gemini). Actualiza el `spec.json` y el `index.ts`. Retorna el trabajo actualizado de forma síncrona.
- `POST /api/jobs/{job_id}/render`: Encola la orden de exportación final a MP4. Retorna el job con estado `queued_render`.

## Modelos y Esquemas
- **DB Models**: `JobModel` (`id`, `status`, `script_text`, `result_spec`, `video_url`).
- **Pydantic**: `Spec`, `SFX`, `JobCreate`, `JobResponse`.

## Lógica de Workers (RQ)
- `worker.py`: Conectado a Redis usando inicialización moderna `Worker` (`SimpleWorker` en Windows para evitar errores de fork).
- `app/services/pipeline.py`: Función `run_pipeline` transiciona estado a `processing` y maneja tres bloques:
  - **Voicebox TTS:** Llama localmente a `127.0.0.1:17493`. 
  - **Gemini LLM (Code Gen):** Utiliza `google-genai` conectando a `gemini-3.1-flash-lite-preview`. Genera un array de TSX y lo guarda físicamente en `frontend/src/remotion/generated/`. Tiene protección Anti-Quota (429) y Backoff algorithm.
  - **Remotion Export (`render_video_pipeline`):** Llama mediante `subprocess` a `npx remotion render` para orquestar la conversión de los TSX, audio y Spec hacia un archivo físico `.mp4` ubicado en `frontend/public/videos/`.

## Variables de Entorno (.env)
Se configuró `python-dotenv` dentro de `config.py` para asegurar que `GEMINI_API_KEY`, `DATABASE_URL` y `REDIS_URL` sean siempre leídas globalmente por Pydantic Settings.

## Avances en la Integración de Voicebox (Sesión 2 - 11 Mayo 2026)

Se resolvió la integración completa del pipeline TTS con Voicebox usando el engine **Kokoro**. Ver ADR 003 para el detalle completo.

### Fixes aplicados:
1. **SoX añadido al Dockerfile:** `sox` agregado al bloque `apt-get install` del stage runtime para eliminar el warning de Chatterbox TTS. Requiere reconstruir imagen.
2. **Comportamiento lazy del modelo documentado:** Voicebox reporta `Ready` al arrancar pero **no carga el modelo TTS hasta la primera solicitud de generación**. La descarga inicial de ~4.5 GB desde HuggingFace es normal y solo ocurre una vez (se cachea en el volumen `huggingface-cache`).
3. **Fix de compatibilidad engine/perfil:** La causa del `HTTP 400` era que el perfil `"default"` existente tenía `voice_type: "cloned"`, incompatible con `engine: "kokoro"`. Voicebox requiere `voice_type: "preset"` para usar Kokoro.
4. **Auto-gestión del perfil Kokoro:** Se implementó `get_or_create_kokoro_profile()` en `pipeline.py` que crea automáticamente el perfil `"animaflow-kokoro-es"` (con `preset_voice_id: "em_alex"`) en la primera ejecución y lo reutiliza en las siguientes.

### Estado actual del flujo TTS:
```
POST /api/jobs → run_pipeline()
  → get_or_create_kokoro_profile()  # idempotente, crea perfil si no existe
  → POST /generate (engine="kokoro", language="es")
  → SSE polling de status
  → duration + audio_url ✅
```

### Voces en español disponibles (Kokoro):
- `em_alex` — Alex, masculino ← **activo**
- `ef_dora` — Dora, femenino
- `em_santa` — Santa, masculino

