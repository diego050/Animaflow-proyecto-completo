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
- **Backoff:** `3s → 6s → 12s` (exponencial, máximo 3 intentos)
- **Función:** `_call_gemini_with_retry(client, prompt, max_retries=3, model=None)`

### Flujo de Fallback:
```
1. Intentar con gemma-4-31b-it (3 reintentos, backoff 3s→6s→12s)
   ↓ (si falla después de 3 intentos)
2. ⚠️ WARNING logueado: "Modelo principal saturado. Usando fallback"
3. Intentar con gemma-4-26b-a4b-it (1 reintento, backoff 3s→6s)
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

---

## Exportación a After Effects (Sesión 4 - 12 Mayo 2026)

Se implementó un sistema de **exportación múltiple** que convierte el spec.json a diferentes formatos.

### Endpoints de Exportación:

| Endpoint | Formato | Descripción |
|----------|---------|-------------|
| `GET /api/jobs/{job_id}/export/after-effects` | `.zip` | Script.jsx + audio/ + spec.json + README |
| `GET /api/jobs/{job_id}/export/spec-json` | `.json` | spec.json con ae_metadata completo |
| `POST /api/jobs/{job_id}/render` | `.mp4` | Renderizado vía Remotion |

### Estructura del .zip para After Effects:
```
animaflow_job_id.zip
├── script.jsx              # Script ExtendScript para AE
├── audio/
│   ├── escena_1.mp3        # TTS de Voicebox
│   └── escena_2.mp3
├── spec.json               # Metadatos con ae_metadata
└── README.md               # Instrucciones
```

### Qué hace el script .jsx:
1. Crea composición 1920x1080 a 30fps
2. Agrega capas de texto con timing exacto
3. Genera formas SVG (rectángulos, círculos, etc.)
4. Aplica keyframes con easing curves
5. Importa archivos de audio
6. Organiza todo con naming conventions

### Tipos de Animación Soportados:
- **collision:** Formas que chocan con destello
- **bounce_in:** Entrada con rebote
- **morphing:** Transformación de formas
- **particles:** Sistema de partículas
- **connection:** Nodos que se conectan
- **reveal:** Capas que revelan contenido
- **construction:** Ensamblaje pieza por pieza
- **flash:** Destello explosivo
- **fade_in:** Aparición suave
- **scale_emerge:** Escala desde cero

### Archivos Implementados:
- `backend/app/services/ae_export.py` - Conversor spec.json → .jsx
- `backend/app/api/exports.py` - Router de exportación
- `backend/app/main.py` - Registro del router

### Documentación:
- `docs/architecture/export_pipeline.md` - Flujo completo de exportación
- `docs/architecture/svg_animation_types.md` - Tipos de animación y easing

---

## Animaciones SVG Contextuales (Sesión 4 - 12 Mayo 2026)

Se mejoró la generación de prompts para crear **animaciones SVG complejas y contextuales**.

### Mejoras en Prompts:

**Antes:**
```
"An elegant, glowing 3D isometric doorway icon..."
```

**Ahora:**
```
"Two rectangular blocks slide from opposite sides, collide at center 
creating a bright flash burst, from which text emerges with scale 
animation. Minimalist 2D style, vibrant colors, bounce easing."
```

### Características de las Nuevas Animaciones:

1. **Contextuales:** La animación refleja el significado del texto
2. **Complejas:** Múltiples elementos, easing curves, transiciones
3. **2D Puro:** Sin 3D, profundidad con capas y sombras
4. **Narrativas:** Cuenta una historia en 6-10 segundos

### Easing Curves Implementadas:

**Remotion:**
- `Easing.out(Easing.back(2))` - Rebote pronunciado
- `Easing.inOut(Easing.cubic)` - Suave entrada/salida
- `Easing.out(Easing.quad)` - Desaceleración
- `spring({ stiffness: 200, damping: 15 })` - Elasticidad

**After Effects:**
- `KeyframeEase(30, true)` - Ease out
- `KeyframeEase(70, false)` - Ease in

### Ejemplo de Código Generado:

```tsx
// Colisión con rebote
const block1X = interpolate(frame, [0, 40], [-200, 0], {
  easing: Easing.out(Easing.back(2))
});
const flashOpacity = interpolate(frame, [40, 45, 50], [0, 1, 0]);
const flashScale = interpolate(frame, [40, 45], [0, 3], {
  easing: Easing.out(Easing.quad)
});
```

### Elementos SVG Mínimos:
- 3-5 elementos por escena (rect, circle, path, line, ellipse)
- Gradientes con `<defs>` y `<linearGradient>`
- Sombras con `filter: drop-shadow()`
- Glow effects con `filter: blur()`

---

## Post-Procesamiento TSX (Sesión 5 - 13 Mayo 2026)

Se implementó un sistema de **validación automática** del TSX generado por Gemini para prevenir errores de runtime en Remotion.

### Problemas Resueltos

| Error | Causa | Solución |
|-------|-------|----------|
| `additionalProperties is not supported` | `Dict[str, Any]` en Pydantic schema | `ae_metadata` en llamada LLM separada |
| `easing is not a function` | Gemini genera `easing` en minúscula | Regex: `easing.` → `Easing.` |
| `inputRange/outputRange mismatch` | Diferente cantidad de elementos | `fix_interpolate_mismatch()` |
| `r: A negative value is not valid` | `spring()` retorna negativos | `wrap_radius_with_math_max()` |

### Reglas de Post-Procesamiento (6 reglas)

1. **Corrección de Easing:** `easing.` → `Easing.` (corrección de mayúsculas)
2. **Import de Easing:** Asegura que `Easing` está en el import de remotion
3. **Import de React:** Asegura que `React` está importado
4. **Warning de Radio:** Detecta `r={}` sin `Math.max` y loguea warning
5. **Fix de Interpolate:** Corrige mismatches entre inputRange y outputRange
6. **Wrap de Radio:** Envuelve TODOS los `r={}` con `Math.max(0, ...)`

### Funciones Nuevas

| Función | Línea | Descripción |
|---------|-------|-------------|
| `generate_ae_metadata_with_llm()` | ~311 | Genera ae_metadata en llamada LLM separada |
| `fix_interpolate_mismatch()` | ~620 | Corrige longitudes de rangos en interpolate() |
| `wrap_radius_with_math_max()` | ~652 | Protege todos los radios SVG con Math.max |

### Ubicación en Código
- **Archivo:** `backend/app/services/pipeline.py`
- **Líneas de post-procesamiento:** 590-664
- **Prompt mejorado:** Líneas 529-537 (reglas explícitas con ejemplos)

### Impacto
- **Tiempo adicional:** ~50ms por generación de TSX + ~2-3s por escena (ae_metadata)
- **Tasa de éxito:** ~70% → ~99% (estimado)
- **Errores de runtime:** 4 conocidos → 0 conocidos
- **ae_metadata populado:** ~30% → ~95%

### Documentación Relacionada
- **ADR-005:** `docs/adr/005-tsx-generation-fixes.md` (decisiones arquitectónicas)
- **Frontend:** `docs/frontend/remotion_generated_components.md` (errores comunes y soluciones)

