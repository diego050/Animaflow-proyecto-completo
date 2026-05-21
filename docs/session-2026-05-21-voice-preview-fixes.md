# Session Report: Voice Preview Critical Fixes

**Fecha:** 2026-05-21
**Agente:** @documentation
**Tipo de sesión:** Debugging y hotfixes críticos en producción
**Severidad global:** Alta (múltiples bugs bloqueaban preview de voz)

---

## Resumen Ejecutivo

Esta sesión abordó una cadena de fallos críticos que impidieron el funcionamiento del **preview de voz** en el dashboard de AnimaFlow. Lo que comenzó como un simple error 400 por API key inválida reveló una cascada de problemas: desde OOM por Whisper hasta errores de autorización y rutas de archivos incorrectas. Se resolvieron **5 bugs principales** con modificaciones en 9 archivos del backend, frontend y configuración de infraestructura.

---

## Lista de Bugs Resueltos

### 1. API Key de Gemini Expirada

- **Severidad:** Crítico
- **Síntoma:** Error 400 `API_KEY_INVALID` al generar guiones
- **Causa Raíz:** La variable de entorno `GEMINI_API_KEY` en `.env` estaba expirada o revocada
- **Fix Aplicado:** El usuario renovó la clave directamente en Google AI Studio
- **Impacto:** Bloqueaba todo el pipeline de generación de guiones LLM

### 2. Preview de Voz: 502 Bad Gateway (OOM por Whisper)

- **Severidad:** Crítico
- **Síntoma:** El backend se reiniciaba al hacer preview de voz, devolviendo 502
- **Causa Raíz:** `generate_tts_with_timestamps()` cargaba el modelo Whisper "small" (~1GB RAM) solo para extraer timestamps, operación innecesaria para un preview rápido de audio
- **Fix Aplicado:**
  - Crear función `generate_tts_audio_only()` en `backend/app/modules/tts/service.py` que genera TTS sin invocar Whisper
  - Modificar endpoint de preview en `backend/app/api/voices.py` para usar la nueva función
  - Instalar binario `ffmpeg` en `backend/Dockerfile` (antes solo existía el wrapper `ffmpeg-python`)
  - Modificar `get_audio_duration()` en `backend/app/modules/tts/whisper_timestamps.py` para usar `ffmpeg.probe()` o el módulo `wave` de Python, eliminando el fallback a Whisper
- **Impacto:** Cada preview consumía ~1GB RAM innecesariamente, causando reinicios en el contenedor

### 3. Preview de Voz: 401 Unauthorized (audio por query param)

- **Severidad:** Alto
- **Síntoma:** El navegador no podía reproducir audio con el tag `<audio>` debido a error 401
- **Causa Raíz:** El endpoint `/api/audio/{filename}` requería `HTTPBearer()` que lanzaba 401 automáticamente cuando no había header `Authorization`. Los tags `<audio>` del navegador **no pueden enviar headers custom**
- **Fix Aplicado:**
  - Crear `security_optional = HTTPBearer(auto_error=False)` en `backend/app/core/security.py`
  - Crear `get_current_user_from_token()` que acepta token por query param (`?token=...`) con fallback al header Bearer estándar
  - Modificar endpoint de audio para usar la nueva dependencia
  - Modificar frontend (`frontend/src/pages/dashboard/VoicesPage.tsx`) para agregar `?token=<jwt>` a la URL del audio
- **Impacto:** El preview no era reproducible en el navegador aunque el archivo existiera

### 4. Preview de Voz: 404 Not Found (archivo en subdirectorio)

- **Severidad:** Alto
- **Síntoma:** Audio generado en `/app/storage/audio/piper/537604471193.wav` pero el endpoint buscaba en `/app/storage/audio/537604471193.wav`
- **Causa Raíz:** `os.walk()` fallaba silenciosamente (posiblemente por permisos de lectura en contenedor Docker o race condition), y el fallback no manejaba subdirectorios de proveedor
- **Fix Aplicado:**
  - Reemplazar fallback de `os.walk()` con búsqueda directa en subdirectorios conocidos: `piper/`, `elevenlabs/`, `google/`, `gemini/`
  - Agregar logging estructurado con `get_logger("animaflow.audio")` para diagnóstico futuro
  - Mantener `os.walk()` como último recurso si fallan las rutas directas
- **Impacto:** El endpoint no encontraba archivos aunque estuvieran presentes en disco

### 5. Configuración MCP de Hostinger Mal Formada

- **Severidad:** Medio
- **Síntoma:** MCP no funcionaba por errores de formato en `opencode.json`
- **Causa Raíz:**
  - `command` era un string + `args` separado (debe ser un array único)
  - Faltaba el campo obligatorio `"type": "local"`
- **Fix Aplicado:**
  - Corregir formato del MCP en `opencode.json` siguiendo el esquema correcto
  - Agregar `opencode.json` a `.gitignore` para proteger el API token de Hostinger
- **Impacto:** Obstruía el uso de herramientas MCP para gestión de infraestructura

---

## Archivos Modificados

| Archivo | Cambio Principal |
|---------|------------------|
| `backend/Dockerfile` | Instalación del binario `ffmpeg` (no solo el wrapper Python) |
| `backend/app/modules/tts/service.py` | Nueva función `generate_tts_audio_only()` sin Whisper |
| `backend/app/modules/tts/whisper_timestamps.py` | `get_audio_duration()` usa `ffmpeg.probe()` o `wave`, sin fallback a Whisper |
| `backend/app/api/voices.py` | Preview usa `generate_tts_audio_only()` y devuelve URL relativa al audio |
| `backend/app/api/audio.py` | Búsqueda directa en subdirectorios de proveedor, logging estructurado |
| `backend/app/core/security.py` | `security_optional`, `get_current_user_from_token()` con soporte query param |
| `frontend/src/pages/dashboard/VoicesPage.tsx` | Agrega `?token=<jwt>` a la URL del elemento `<audio>` |
| `opencode.json` | Fix del formato del MCP de Hostinger |
| `.gitignore` | Ignorar `opencode.json` para no exponer tokens |

---

## Lecciones Aprendidas

1. **No cargar modelos pesados para operaciones triviales.** Cargar Whisper solo para obtener duración de audio era un desperdicio de RAM inaceptable. Siempre separar el "path pesado" del "path liviano" para previews.

2. **Los tags `<audio>` del navegador no pueden enviar headers.** Cualquier endpoint que sirva archivos multimedia directamente al DOM debe soportar autenticación por query param o cookies, nunca solo por `Authorization: Bearer`.

3. **Los contenedores Docker tienen permisos distintos.** `os.walk()` puede fallar silenciosamente en producción aunque funcione localmente. Siempre usar rutas determinísticas con logging explícito.

4. **Dockerfile debe incluir binarios, no solo wrappers Python.** `ffmpeg-python` sin el binario `ffmpeg` provoca errores en runtime que son difíciles de diagnosticar.

5. **Proteger archivos con credenciales.** `opencode.json` contenía un API token en texto plano. Ahora está en `.gitignore` y debe rotarse si estuvo en control de versiones previamente.

6. **Un bug suele esconder otro.** El error 400 de Gemini era solo la punta del iceberg; cada fix reveló el siguiente problema en la cadena.

---

## Próximos Pasos Recomendados

1. **Rotar API tokens expuestos:** Si `opencode.json` fue comiteado previamente, rotar el API token de Hostinger inmediatamente.

2. **Monitorear uso de RAM:** Validar en staging que los previews de voz ya no provocan picos de memoria. Considerar limites de memoria (`memory_limit`) en Docker Compose.

3. **Refactor `get_audio_duration()`:** Mover la función a un módulo utilitario genérico (`backend/app/utils/audio.py`) ya que ahora es independiente de Whisper.

4. **Tests de regresión:** Añadir tests unitarios para:
   - `generate_tts_audio_only()` devuelve archivo válido sin cargar Whisper
   - `get_current_user_from_token()` acepta token por query param
   - Endpoint `/api/audio/{filename}` encuentra archivos en subdirectorios `piper/` y `elevenlabs/`

5. **Documentar API audio:** Agregar en la documentación de API (OpenAPI/FastAPI docs) que `/api/audio/{filename}` soporta `?token=` para autenticación.

6. **Agregar healthcheck de TTS:** Un endpoint `/health/tts` que valide que ffmpeg está disponible y que el directorio `storage/audio/` tiene permisos de escritura.

7. **Mejorar manejo de errores de Gemini:** Implementar retry con backoff exponencial cuando la API key sea renovada, para evitar errores 400 transitorios.

---

*Documento generado por agente de documentación. Última actualización: 2026-05-21.*
