# AnimaFlow — Backend Scaling & Architecture Strategy
**Document Reference:** docs/architecture/backend_scaling_strategy.md  
**Status:** PROPOSED (Architectural Decision Record)  
**Author:** Antigravity (Advanced Agentic Coding)  

---

## 1. El Dilema Core en AnimaFlow

En plataformas SaaS de generación y procesamiento de vídeo/IA como **AnimaFlow**, el backend se enfrenta a cargas de trabajo extremadamente heterogéneas:

1. **FastAPI Web API (I/O Bound, Latencia Crítica):** Registro de usuarios, autenticación JWT, creación de proyectos y polling de estado. Debe ser ligero, ultra-rápido y con alta disponibilidad.
2. **TTS & AI Workers (Network & CPU Bound):** Llamadas a APIs externas de LLMs (Gemini/OpenAI), generación de audio (Voicebox, Kokoro) y alineación temporal de palabras (Whisper). Consumo medio de CPU, alta espera de red.
3. **Remotion Render Engine (Heavy CPU/GPU Bound, RAM-Intense):** Lanzar instancias headless de Google Chrome, evaluar React en tiempo de ejecución de vídeo y codificar a MP4 usando `ffmpeg`. Requiere gran cantidad de RAM y CPU, y es propenso a picos extremos de consumo.

---

## 2. Evaluación de Alternativas para el MVP (Sprint 1 - 5)

### Opción A: Microservicios Puros (Desaconsejado para el MVP)
*Dividir el backend en repositorios independientes: Auth Service, Job Service, TTS Service, Render Service, cada uno con su propia base de datos.*

* **Ventajas:** Aislamiento absoluto de fallos y escala independiente de recursos.
* **Inconvenientes:**
  * **Fricción de desarrollo extrema:** Mantener contratos de API (`spec.json`) sincronizados entre 4 repositorios diferentes dispararía el tiempo de desarrollo.
  * **Latencia y red:** Comunicaciones constantes por HTTP/gRPC entre servicios añaden overhead e inestabilidad.
  * **Complejidad de base de datos:** Manejar transacciones distribuidas (Saga Pattern) para el ciclo de vida de un `job_id` es excesivamente complejo a esta escala.
  * **Violación de Guardrail:** Supera con creces el límite de complejidad de 2 días y pone en riesgo el MVP en 20 días.

### Opción B: Monolito Tradicional Síncrono (Inviable)
*Ejecutar todo (API, LLMs, renderizado) dentro del mismo proceso de FastAPI.*

* **Ventajas:** Estructura de código sumamente simple y despliegue en un solo comando.
* **Inconvenientes:**
  * **Bloqueo del Event Loop:** Procesar un Remotion render o un TTS síncronamente bloquearía por completo el event loop de FastAPI, congelando el servidor para todos los demás usuarios.
  * **Inestabilidad del sistema:** Si un render agota la memoria del contenedor, el proceso completo de FastAPI se caería, desconectando a todos los usuarios activos.

### Opción C: Monolito Híbrido Modular + Workers de Ejecución Aislados (Altamente Recomendado)
*Mantener un **único repositorio de código (monorepo backend)** para compartir esquemas Pydantic, modelos SQLAlchemy de base de datos y utilidades, pero **decapitar la ejecución** en múltiples contenedores e hilos especializados usando colas de tareas (**Redis + RQ / Celery**).*

---

## 3. La Propuesta: Arquitectura de Monolito Híbrido (Hybrid Monolith + Workers)

Esta propuesta une lo mejor de ambos mundos: **la velocidad de desarrollo de un monolito** con **la resiliencia y escalabilidad de los microservicios**.

```mermaid
graph TD
    Client[Frontend / Client] <-->|HTTP / Polling| API[FastAPI Web Server]
    API <-->|SQLAlchemy| DB[(PostgreSQL)]
    API -->|Enqueue Task| Redis[(Redis Broker)]
    
    subgraph Execution Workers (Aislados)
        Redis -->|Queue: tts| TTSWorker[TTS Worker Container<br/>Python + Voicebox/Whisper]
        Redis -->|Queue: llm| LLMWorker[LLM Worker Container<br/>Python + Google GenAI]
        Redis -->|Queue: render| RenderWorker[Render Worker Container<br/>Node/Python + Chrome + FFmpeg]
    end

    TTSWorker <--> DB
    LLMWorker <--> DB
    RenderWorker <--> DB
    RenderWorker -->|Generates| Storage[(Local/S3 MP4 Storage)]
```

### Componentes de la Solución:

### 1. Repositorio Unificado (Single Codebase & Schema)
* Toda la lógica reside en `/backend`.
* Los esquemas Pydantic (`app/schemas`) actúan como la **fuente de verdad única** de la estructura `spec.json`.
* Cambios en la especificación se reflejan instantáneamente en toda la tubería y se exportan automáticamente al Frontend como tipos TypeScript (`/frontend/src/types`), eliminando el desajuste de tipos (*type drift*).

### 2. Segregación de Colas (Queue Isolation)
Dividimos los RQ Workers actuales en colas dedicadas para evitar que tareas rápidas (como corregir un JSON de LLM) queden bloqueadas detrás de tareas lentas (renderizar un vídeo de 60s):
* **`queue_default`:** Para transacciones rápidas de base de datos o correos.
* **`queue_tts`:** Dedicada a la síntesis de voz (Voicebox/Kokoro) y transcripción de Whisper.
* **`queue_llm`:** Dedicada a la segmentación y corrección de prompts con el modelo LLM.
* **`queue_render`:** Exclusiva para el renderizador de Remotion.

### 3. Aislamiento de Ejecución a Nivel de Contenedores (Production Docker Isolation)
Aunque el código sea el mismo, en producción (VPS/Docker Compose) se levantan diferentes imágenes o comandos especializados. Esto evita que los pesados requerimientos de Remotion (Node, Chromium, ffmpeg) o de IA (PyTorch, CUDA) infecten el servidor web principal.

#### Blueprint de Contenedores:
* **`web-api` (Contenedor Web):** Corre `uvicorn app.main:app`. Imagen de docker alpina muy ligera, escalable horizontalmente en segundos.
* **`worker-tts` (Contenedor TTS):** Corre `python worker.py tts`.
* **`worker-render` (Contenedor Render):** Corre `python worker.py render`. Su Dockerfile contiene Node.js, Chromium headless y FFmpeg instalados. Es el único que consume alta memoria RAM. Si se cuelga por un render defectuoso, Docker lo reinicia automáticamente sin afectar a la API ni interrumpir las sesiones activas de los usuarios.

---

## 4. Hoja de Ruta Evolutiva (Evolutionary Path)

```
[Sprint 1-2: MVP]          [Sprint 3-4: Scale]         [Sprint 5+: Enterprise]
Monolito Modular           Aislamiento de Contenedores  Extracción de Render a
FastAPI + RQ (Compartido)  (Mismo Repo, Colas RQ Sep.)  Microservicio Node.js Nativo
```

### Fase 1: Monolito Modular con RQ (Estado Actual - Optimizar)
Mantener la base de datos PostgreSQL compartida y la cola RQ. El primer paso de optimización es simplemente **separar el arranque del worker en colas separadas** (`rq worker tts`, `rq worker render`).

### Fase 2: Aislamiento en Docker (Escala Media)
Configurar el `docker-compose.yml` para levantar 3 réplicas del worker:
1. `animaflow-api`
2. `animaflow-worker-heavy` (Remotion)
3. `animaflow-worker-light` (LLM + TTS)

### Fase 3: Extracción a Microservicio Remotion Nativo (Escala Alta / Post-MVP)
Si en el futuro Remotion requiere optimizaciones extremas o se desea programar renders en Serverless (ej. AWS Lambda o GCP Cloud Run con contenedores de Chrome), el componente `app/services/ae_export.py` / Remotion render se extrae a un microservicio escrito en **Node.js/TypeScript nativo**.
* FastAPI envía un webhook HTTP POST con el `spec.json` al microservicio de Render.
* El microservicio renderiza de forma óptima el MP4 usando la API de Node de Remotion y notifica de vuelta (callback) a la API de FastAPI.

---

## 5. Tabla Comparativa de Decisiones

| Criterio | Monolito Tradicional | Microservicios Puros | Monolito Híbrido con Workers (Propuesto) |
| :--- | :---: | :---: | :---: |
| **Velocidad de Desarrollo (MVP 20 días)** | ⚡ Alta | 🐌 Muy Baja | ⚡⚡ Muy Alta |
| **Aislamiento de Fallos en Renderizado** | ❌ Ninguno |  Excelente |  Excelente (vía RQ/Docker) |
| **Consistencia de Datos (spec.json)** | Simple | ❌ Compleja (Eventos) | Simple (SQL Transactions) |
| **Facilidad de Despliegue** | Muy Simple | ❌ Compleja (K8s/Compose) | Simple (Docker Compose) |
| **Paridad de Tipos (Python -> TS)** | Excelente | ❌ Compleja | Excelente (Vía FastAPI OpenAPI) |

---

## Recomendación Final de Ingeniería

> [!IMPORTANT]
> **NO pases a microservicios puros en este momento.** Hacerlo violaría los guardrails del proyecto descritos en `AGENTS.md` (*MVP funcional en 20 días máx* y *priorizar funcional y estable sobre perfecto y escalable*).
> 
> **Nuestra recomendación firme es aplicar la Opción C (Monolito Híbrido Modular con Workers Aislados por Cola):**
> 1. Conserva la codebase unificada en `backend/app`.
> 2. Separa lógicamente los procesos de trabajo en colas dedicadas de Redis (`tts`, `llm`, `render`).
> 3. En producción, despliega contenedores dedicados para la API y los Workers de forma independiente, asegurando que un desborde de memoria en Remotion jamás tire abajo el sistema de cara al usuario.
