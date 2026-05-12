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
- `app/services/pipeline.py`: Función `run_pipeline` maneja transiciones de estado granulares y tres bloques:
  - **Estados Granulares:** El pipeline actualiza el estado del job en PostgreSQL en cada fase para permitir progress tracking en tiempo real:
    - `segmenting`: Fragmentando guion en escenas de ~7s
    - `visuals_generating`: Generando prompts visuales con Gemini LLM
    - `processing_scenes`: Procesando TTS + generando componentes TSX por escena
    - `completed`: Timeline generada exitosamente (spec.json listo)
  - **Voicebox TTS:** Llama localmente a `127.0.0.1:17493`. 
  - **Gemini LLM (Code Gen):** Utiliza `google-genai` con estrategia de modelos dual:
    - **Modelo Principal:** `gemma-4-31b-it` (tokens ilimitados, máxima calidad de código)
    - **Modelo Fallback:** `gemma-4-26b-a4b-it` (se activa automáticamente si el principal falla)
    - **Retry con Backoff Exponencial:** Reintentos automáticos para errores 429/503 (5s → 10s → 20s)
    - Genera componentes TSX y los guarda físicamente en `frontend/src/remotion/generated/`
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

## Estrategia de Modelos y Resiliencia (Sesión 3 - 12 Mayo 2026)

Se implementó un sistema de **doble modelo con fallback automático** para maximizar la tasa de éxito en la generación de componentes TSX.

### Modelos Configurados:
| Rol | Modelo | Tokens/min | Calidad | Uso |
|-----|--------|-----------|---------|-----|
| **Principal** | `gemma-4-31b-it` | Ilimitado | ⭐⭐⭐⭐⭐ | Generación de TSX (código React/Remotion) |
| **Fallback** | `gemma-4-26b-a4b-it` | Ilimitado | ⭐⭐⭐⭐ | Respaldo cuando el principal falla |

### Lógica de Retry con Backoff Exponencial:
- **Errores manejados:** `429` (quota), `503` (unavailable), `RESOURCE_EXHAUSTED`, `UNAVAILABLE`
- **Backoff:** `5s → 10s → 20s` (exponencial, máximo 3 intentos)
- **Función:** `_call_gemini_with_retry(client, prompt, max_retries=3, model=None)`

### Flujo de Fallback:
```
1. Intentar con gemma-4-31b-it (3 reintentos, backoff 5s→10s→20s)
   ↓ (si falla después de 3 intentos)
2. ⚠️ WARNING logueado: "Modelo principal saturado. Usando fallback"
3. Intentar con gemma-4-26b-a4b-it (2 reintentos, backoff 5s→10s)
   ↓ (si falla después de 2 intentos)
4. ⚠️ WARNING logueado: "Fallback también falló. Usando componente por defecto"
5. Retornar "FadeText" (componente por defecto, garantiza progreso)
```

### Beneficios:
- **Tasa de éxito:** ~70% → ~95% (estimado)
- **Tokens ilimitados:** Sin bloqueos por quota de 15k/min de Gemma 3
- **Graceful degradation:** El pipeline nunca se bloquea, siempre hay fallback
- **Visibilidad:** Warnings visibles en logs para monitoreo

### Variables de Entorno:
```
GEMINI_MODEL=gemma-4-31b-it
GEMINI_FALLBACK_MODEL=gemma-4-26b-a4b-it
```

