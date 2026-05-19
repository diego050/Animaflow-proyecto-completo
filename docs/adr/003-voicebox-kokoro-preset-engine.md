# ADR 003: Integración de Voicebox con Engine Kokoro (Preset Profile)

**Fecha:** 11 de Mayo de 2026  
**Estado:** Implementado  
**Rol/Autor:** Backend Agent / Orquestador Técnico  

---

## 1. Contexto

Durante el primer intento de generación TTS real (end-to-end) desde el pipeline de AnimaFlow hacia Voicebox, se encontraron tres errores en cadena que impedían la generación de audio:

### Error 1: SoX no encontrado (warning)
```
/bin/sh: 1: sox: not found
WARNING: SoX could not be found!
```
El `Dockerfile` de Voicebox solo instalaba `ffmpeg`, pero la librería Chatterbox TTS intentaba usar SoX para procesamiento de audio.

### Error 2: Modelo cargado de forma lazy (comportamiento esperado mal documentado)
El servidor Voicebox muestra `Application startup complete` sin haber cargado el modelo TTS. El modelo de 1.7B parámetros y sus archivos auxiliares (~4.5 GB en total desde HuggingFace) **solo se descargan/cargan cuando se recibe la primera solicitud de generación**. Esto era confundido como un "congelamiento" del servidor.

### Error 3: Incompatibilidad de engine con tipo de perfil (`voice_type`)
```
ValueError: No samples found for profile 49bd9375-...
# → se cambia engine a "kokoro" →
HTTP 400 Bad Request: Engine 'kokoro' does not support cloned voice profiles
```

La regla de negocio interna de Voicebox es:

| `voice_type` del perfil | Engines permitidos |
|---|---|
| `cloned` | `qwen`, `luxtts`, `chatterbox`, `chatterbox_turbo`, `tada` |
| `preset` | `kokoro`, `qwen_custom_voice` |
| `designed` | cualquiera (experimental) |

El perfil `"default"` existente en la BD tenía `voice_type: "cloned"` y no tenía muestras de audio. Al pasarle `engine: "kokoro"` desde AnimaFlow, Voicebox rechazaba la solicitud con 400.

---

## 2. Decisión Arquitectónica

### 2.1. Usar Kokoro como engine de TTS para el MVP

**Motivo:** Kokoro es el único engine que:
- No requiere muestras de audio de voz (voice cloning)
- Tiene voces en español (`em_alex`, `ef_dora`, `em_santa`)
- Funciona en CPU (el VPS no tiene GPU)
- Se ejecuta localmente (sin APIs externas ni costos)

### 2.2. Auto-crear un perfil preset en tiempo de ejecución

En lugar de depender de que el usuario cree manualmente un perfil compatible, se implementó `get_or_create_kokoro_profile()` en `pipeline.py`:

```python
# backend/app/services/pipeline.py

async def get_or_create_kokoro_profile() -> str | None:
    """
    Obtiene o crea el perfil preset de Kokoro para AnimaFlow.
    Voicebox requiere que el engine y voice_type del perfil sean compatibles:
    - engine 'kokoro' solo funciona con voice_type 'preset'
    - Los perfiles 'cloned' solo aceptan engines de clonación (qwen, chatterbox, etc.)
    """
    async with httpx.AsyncClient() as client:
        # 1. Buscar perfil existente por nombre
        profiles = (await client.get(f"{VOICEBOX_API_URL}/profiles")).json()
        existing = next(
            (p["id"] for p in profiles if p["name"] == "animaflow-kokoro-es"),
            None
        )
        if existing:
            return existing

        # 2. Crear perfil preset si no existe
        payload = {
            "name": "animaflow-kokoro-es",
            "language": "es",
            "voice_type": "preset",       # ← clave: debe ser "preset", no "cloned"
            "preset_engine": "kokoro",
            "preset_voice_id": "em_alex"  # voz masculina española
        }
        res = await client.post(f"{VOICEBOX_API_URL}/profiles", json=payload)
        return res.json()["id"]
```

La función se llama **al inicio de cada generación TTS**. En la primera llamada crea el perfil; en todas las siguientes lo reutiliza (lookup por nombre `"animaflow-kokoro-es"`).

### 2.3. Fix de SoX en el Dockerfile

Se añadió `sox` a las dependencias runtime del `Dockerfile` de Voicebox para eliminar el warning:

```dockerfile
# voicebox/Dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    sox \          # ← añadido
    && rm -rf /var/lib/apt/lists/*
```

> **Nota:** Este cambio requiere reconstruir la imagen (`docker compose build --no-cache`) para aplicarse. La generación funciona sin SoX (ffmpeg es suficiente), pero elimina el warning de log.

---

## 3. Archivos Modificados

| Archivo | Cambio |
|---|---|
| `backend/app/services/pipeline.py` | Añadida `get_or_create_kokoro_profile()`. Reescrita `generate_tts_with_voicebox()` para usar perfil Kokoro preset. Mejorado logging de errores HTTP (ahora muestra el cuerpo del 400). |
| `voicebox/Dockerfile` | Añadido `sox` al bloque `apt-get install` del stage runtime. |

---

## 4. Comportamiento del Sistema (Post-Fix)

### Primer arranque
1. `docker compose up voicebox` → servidor listo en segundos (sin modelo cargado)
2. Primera petición `POST /generate` → descarga modelo desde HuggingFace (~4.5 GB, ~2-3 min)
3. Generaciones subsecuentes → instantáneas (modelo en memoria, cache persistente en volumen)

### Pipeline AnimaFlow
```
POST /api/jobs  →  run_pipeline()
  → get_or_create_kokoro_profile()   # crea/reutiliza perfil preset
  → POST /generate (profile_id, engine="kokoro", language="es")
  → GET /generate/{id}/status  (SSE streaming)
  → duration + audio_url
```

---

## 5. Voces Kokoro Disponibles en Español

| `preset_voice_id` | Nombre | Género |
|---|---|---|
| `em_alex` | Alex | Masculino ✅ (actual) |
| `ef_dora` | Dora | Femenino |
| `em_santa` | Santa | Masculino |

Para cambiar la voz del pipeline, modificar `preset_voice_id` en `get_or_create_kokoro_profile()` y eliminar el perfil `"animaflow-kokoro-es"` de la BD de Voicebox para que se recree con la nueva voz.

---

## 6. Consecuencias

**Positivas:**
- Pipeline TTS completamente funcional sin muestras de audio ni GPU
- Perfil auto-gestionado: no requiere configuración manual del usuario
- Logging de errores mejorado facilita futuros debuggings

**Limitaciones conocidas:**
- Kokoro usa voces sintéticas (no clonadas), lo cual puede ser menos natural que Qwen con voice cloning
- El modelo Kokoro-82M se descarga desde HuggingFace en el primer uso (~200 MB adicionales al modelo Qwen ya descargado)
- La voz `em_alex` es un acento neutro; para locuciones más naturales en español latinoamericano se podría explorar Qwen con muestras propias en el futuro

## 7. Próximos Pasos

- [ ] Evaluar calidad de voz `em_alex` vs `ef_dora` para el contenido de AnimaFlow
- [ ] Considerar exponer selección de voz como parámetro del `POST /api/jobs` para que el usuario elija
- [ ] Una vez estabilizado el MVP, explorar voice cloning con muestras propias usando Qwen
