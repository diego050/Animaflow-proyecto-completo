# Progress Tracking - Pipeline de Generación de Video

## Descripción General

El sistema de progress tracking permite al frontend mostrar el estado en tiempo real del pipeline de generación de video mediante polling asíncrono. El backend actualiza el estado del job en PostgreSQL en cada fase del procesamiento, permitiendo una UX transparente y detallada.

## Flujo Completo

```
┌─────────────┐
│   Usuario   │
│  (Frontend) │
└──────┬──────┘
       │ 1. POST /api/jobs/ { script_text }
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI (Backend)                        │
│  - Crea JobModel en PostgreSQL (status: "pending")          │
│  - Encola tarea en Redis: queue.enqueue(run_pipeline, ...)  │
│  - Retorna job_id inmediatamente (no bloquea)               │
└─────────────────────────────────────────────────────────────┘
       │
       │ 2. Redis notifica al Worker
       ▼
┌─────────────────────────────────────────────────────────────┐
│                   RQ Worker (Background)                    │
│  - Ejecuta run_pipeline(job_id, script_text)                │
│  - Actualiza estado en PostgreSQL en cada fase              │
└─────────────────────────────────────────────────────────────┘
       │
       │ 3. GET /api/jobs/{job_id} (cada 2s)
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend Polling (App.tsx)                     │
│  - setInterval cada 2000ms                                  │
│  - Lee estado y actualiza UI con mensajes descriptivos      │
│  - Detiene polling al llegar a "completed" o "failed"       │
└─────────────────────────────────────────────────────────────┘
```

## Estados del Pipeline

### Pipeline de Generación (spec.json)

| Estado | Descripción | Trigger en Backend | Mensaje Frontend |
|--------|-------------|-------------------|------------------|
| `pending` | Job creado, esperando worker | `POST /api/jobs/` crea JobModel | "Enviando trabajo a la cola..." |
| `segmenting` | Fragmentando guion en escenas de ~7s | `run_pipeline` línea 492 | "📝 Segmentando guion en escenas..." |
| `visuals_generating` | Generando prompts visuales con Gemini | `run_pipeline` línea 506 | "🎨 Generando prompts visuales con IA..." |
| `processing_scenes` | Procesando TTS + generando TSX por escena | `run_pipeline` línea 513 | "🎬 Procesando escenas (TTS + animaciones)..." |
| `completed` | Timeline generada exitosamente | `run_pipeline` línea 523 | "✅ ¡Timeline Generada!" |

### Pipeline de Renderizado (MP4)

| Estado | Descripción | Trigger en Backend | Mensaje Frontend |
|--------|-------------|-------------------|------------------|
| `queued_render` | Job encolado para renderizado | `POST /api/jobs/{job_id}/render` | "⏳ En cola para renderizado..." |
| `rendering` | Ejecutando Remotion CLI | `render_video_pipeline` línea 541 | "🎥 Renderizando video MP4..." |
| `completed_video` | Video MP4 exportado exitosamente | `render_video_pipeline` línea 574 | "🎉 ¡Video Renderizado con Éxito!" |

### Estados de Error

| Estado | Descripción | Causa Común | Mensaje Frontend |
|--------|-------------|-------------|------------------|
| `failed: <mensaje>` | Error en generación de spec | Timeout LLM, TTS fallido, error validación | "❌ Error: failed: <mensaje>" |
| `failed_render: <mensaje>` | Error en renderizado MP4 | Remotion CLI falló, falta memoria | "❌ Error: failed_render: <mensaje>" |

### Estrategia de Resiliencia con Modelos Gemini

Para errores transitorios del LLM (429, 503), el backend implementa:
- **Retry automático** con backoff exponencial (5s → 10s → 20s)
- **Fallback a modelo secundario** (`gemma-4-26b-a4b-it`) si el principal falla
- **Graceful degradation** a componente `FadeText` si ambos modelos fallan

Ver [Estrategia de Modelos](../backend/estado_actual.md#estrategia-de-modelos-y-resiliencia) para detalles completos.

## Implementación Backend

### Actualización de Estados (`backend/app/services/pipeline.py:490-530`)

```python
def run_pipeline(job_id: str, script_text: str):
    db: Session = SessionLocal()
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    
    try:
        # Estado 1: Segmentación
        job.status = "segmenting"
        db.commit()
        
        chunks = split_text_into_chunks(script_text)
        
        # Estado 2: Generando visuales con Gemini
        job.status = "visuals_generating"
        db.commit()
        
        batch_visuals = generate_batch_visuals_with_llm(chunks)
        
        # Estado 3: Procesando escenas (TTS + TSX)
        job.status = "processing_scenes"
        db.commit()
        
        timeline_scenes = asyncio.run(_process_chunks_async(job_id, chunks, batch_visuals))
        
        # Estado 4: Completado
        job.result_spec = spec_obj.model_dump()
        job.status = "completed"
        db.commit()
        
    except Exception as e:
        job.status = f"failed: {str(e)}"
        db.commit()
    finally:
        db.close()
```

### Endpoint de Polling (`backend/app/api/jobs.py:29-40`)

```python
@router.get("/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(JobModel).filter(JobModel.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    
    return JobResponse(
        job_id=job.id, 
        status=job.status, 
        result_spec=job.result_spec,
        video_url=job.video_url
    )
```

## Implementación Frontend

### Polling Automático (`frontend/src/App.tsx:79-110`)

```typescript
const pollJob = async (currentJobId: string, isRendering = false) => {
  const statusMessages: Record<string, string> = {
    segmenting: "📝 Segmentando guion en escenas...",
    visuals_generating: "🎨 Generando prompts visuales con IA...",
    processing_scenes: "🎬 Procesando escenas (TTS + animaciones)...",
    completed: "✅ ¡Timeline Generada!",
    queued_render: "⏳ En cola para renderizado...",
    rendering: "🎥 Renderizando video MP4...",
    completed_video: "🎉 ¡Video Renderizado con Éxito!"
  };
  
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/jobs/${currentJobId}`);
      const data = await res.json();
      
      const displayStatus = statusMessages[data.status] || `Procesando: ${data.status}`;
      setStatus(displayStatus);
      
      if (data.status === "completed" && !isRendering) {
        setSpec(data.result_spec);
        setLoading(false);
        clearInterval(interval);
      } else if (data.status === "completed_video") {
        setVideoUrl(data.video_url);
        setLoading(false);
        clearInterval(interval);
      } else if (data.status.startsWith("failed")) {
        setStatus("❌ Error: " + data.status);
        setLoading(false);
        clearInterval(interval);
      }
    } catch (e) {
      clearInterval(interval);
      setStatus("❌ Error haciendo polling");
      setLoading(false);
    }
  }, 2000); // Polling cada 2 segundos
};
```

## Consideraciones de Diseño

### Frecuencia de Polling
- **Intervalo**: 2000ms (2 segundos)
- **Razón**: Balance entre actualización en tiempo real y carga del servidor
- **Alternativa descartada**: WebSockets (complejidad innecesaria para MVP)

### Transiciones de Estado
- **Inmutables**: Una vez que un job llega a `completed` o `failed`, no transiciona a otro estado
- **Idempotentes**: El polling puede continuar después de completar sin efectos secundarios
- **No regresivas**: Los estados nunca retroceden (ej: `completed` → `processing`)

### Manejo de Errores
- **Errores de red**: El frontend captura excepciones del fetch y detiene el polling
- **Errores de negocio**: El backend captura excepciones en `run_pipeline` y guarda el mensaje en `status`
- **Timeout**: No hay timeout explícito; el usuario puede cancelar manualmente

## Métricas y Monitoreo

### Tiempos Esperados (por estado)

| Estado | Duración Típica | Variable Dependiente |
|--------|----------------|---------------------|
| `segmenting` | < 1 segundo | Longitud del script |
| `visuals_generating` | 5-15 segundos | Cantidad de escenas, quota Gemini |
| `processing_scenes` | 10-60 segundos | Cantidad de escenas, TTS Voicebox |
| `rendering` | 30-180 segundos | Duración total del video, hardware |

### Logs de Auditoría
Cada transición de estado queda registrada en:
1. **PostgreSQL**: `JobModel.status` con timestamp implícito (último commit)
2. **Worker logs**: `print(f"[{job_id}] ...")` en cada fase del pipeline

## Futuras Mejoras (v2)

- [ ] **WebSockets**: Reemplazar polling con push notifications en tiempo real
- [ ] **Progreso porcentual**: Estimar % completado basado en cantidad de escenas procesadas
- [ ] **Retry automático**: Reintentar jobs fallidos con backoff exponencial
- [ ] **Cancelación de jobs**: Endpoint `DELETE /api/jobs/{job_id}` mientras está en proceso
- [ ] **Cola de prioridad**: Permitir priorizar jobs críticos en Redis

## Referencias

- **Backend**: `backend/app/services/pipeline.py:490-530`
- **API**: `backend/app/api/jobs.py:29-40`
- **Frontend**: `frontend/src/App.tsx:79-110`
- **Modelo DB**: `backend/app/db/models.py:JobModel`
