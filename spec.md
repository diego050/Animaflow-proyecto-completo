# AnimaFlow — Product Specification

**Version:** 1.0.0
**Last Updated:** 2026-05-11
**Status:** MVP Definition

## Vision
Transformar texto/audio en proyectos de video editables y frame-accurate para Adobe After Effects, eliminando la aleatoriedad de la generación de video con IA mediante un pipeline determinista basado en `spec.json`.

## Problem Statement
Los creadores de contenido y agencias pierden horas editando videos generados por IA porque:
- Los outputs son MP4 planos sin capas editables
- No hay sincronización precisa entre audio, texto y animación
- Cada generación es impredecible y no reproducible

## Solution
Pipeline asíncrono que convierte input (texto/audio) en:
1. **MP4** — Video renderizado listo para publicar
2. **spec.json** — Proyecto estructurado con capas, timings, keyframes y propiedades de animación

## Core Features (MVP)

### 1. Text/Audio Input
- Input: texto script o archivo de audio
- Output inmediato: `job_id` para polling

### 2. TTS Pipeline
- Generación de voz con timestamps a nivel de palabra
- Providers: Voicebox.sh / Whisper
- Output: `audio.mp3` + `[{word, start_ms, end_ms}]`

### 3. Intelligent Segmentation
- División en chunks de ~7 segundos
- Basado en timestamps de palabras, no cortes arbitrarios
- Preserva contexto semántico

### 4. LLM Correction & Animation Generation
- Corrección de cortes a mitad de frase
- Generación de `media_query`: descripción de objeto visual concreto
- Generación de `animation_spec`: especificación estructurada de animación
- Generación de `remotion_props`: colores y assets
- Extracción de SFX cues: `[{keyword, time_in_seconds, file}]`

### 5. spec.json Assembly
Cada escena debe seguir el schema:

```json
{
  "start_time_seconds": 7.08,
  "duration_seconds": 9.64,
  "text": "El chocolate no es un capricho...",
  "type": "Scene_jobId_0",
  "media_query": "animated chocolate bar SVG symbolizing impulse purchase",
  "animation_spec": {
    "archetype": "chocolate_bar",
    "object": {
      "type": "svg",
      "size_px": 320,
      "description": "chocolate bar with 6 grid segments, golden highlight, spring bounce from top",
      "colors": ["#4a2c0a", "#6b3d12", "#f59e0b"],
      "entry_animation": "spring_bounce_from_top"
    },
    "background": {
      "type": "radial_gradient",
      "colors": ["#1a0a00", "#0a0a0a"],
      "glow_color": "#f59e0b",
      "glow_opacity": 0.15
    },
    "text": {
      "font_size": 64,
      "font_weight": 900,
      "letter_spacing": "-2px",
      "text_transform": "uppercase",
      "entry_frame": 25,
      "glow_color": "rgba(245,158,11,0.5)"
    }
  },
  "remotion_props": {
    "backgroundColor": "#0a0a0a",
    "textColor": "#f59e0b"
  },
  "sfx": [
    {"keyword": "chocolate unwrap", "time_in_seconds": 0.2, "file": "unwrap.mp3"}
  ],
  "audio_url": null
}
```

### 6. Remotion Render
- Interpretación de spec.json → componentes TSX
- 30fps locked, frame-accurate sync
- Output: MP4 + spec.json validado

## Animation Quality Standards

### Layer Architecture (4 capas obligatorias)
1. **FONDO** (zIndex 0): radial-gradient o linear-gradient, nunca color sólido
2. **AURA/GLOW** (zIndex 1): blur(80px), opacidad 0.12-0.2
3. **OBJETO PRINCIPAL** (zIndex 5): SVG 250-400px, spring animation
4. **TEXTO** (zIndex 10): 60-72px, 900 weight, uppercase, letterSpacing -2px

### Visual Archetype Catalog
| Concepto | Objeto SVG | Detalles |
|---|---|---|
| Impulso/compra | Barra de chocolate | 6 segmentos en grid, brillos en esquina, sombra inferior, glow dorado |
| Dinero/crecimiento | Gráfica de stock | Eje X/Y, línea animada con strokeDashoffset, área de relleno, puntos en picos |
| Tiempo/urgencia | Reloj analógico | 12 marcas de hora, agujas minuto/hora girando con interpolate |
| Seguridad | Candado | Cuerpo + arco, se cierra con spring, brillo metálico |
| Datos/métricas | Barras verticales | 6-8 barras con delay escalonado por índice |
| Red/conexión | Nodos conectados | 5-7 nodos con líneas que aparecen en secuencia con spring |
| Velocidad/eficiencia | Líneas de velocidad | Líneas paralelas con offsets distintos, efecto motion blur |
| Mensaje/comunicación | Sobre SVG | Vuela hacia cámara con scale spring + rotate |
| Productividad/trabajo | Checklist | Ticks que aparecen uno a uno con spring escalonado |
| Éxito/logro | Estrella o trofeo | Rayos que se expanden, partículas radiales en posiciones calculadas |

### Quality Validation Rule
Si una escena generada no tiene objeto visual en CAPA 3 (solo texto + fondo), debe ser rechazada y regenerada.

## Technical Architecture

### System Topology
```
Frontend (React) → FastAPI → Redis Queue → RQ Workers → PostgreSQL
                                                      ↓
                                               Remotion Render → MP4 + spec.json
```

### Worker Topology
- `tts_worker`: Generación de audio + timestamps
- `segment_worker`: División en chunks
- `llm_worker`: Corrección + generación de animación
- `render_worker`: Trigger de Remotion

### Data Contracts
- Frontend types ↔ Pydantic schemas (1:1 parity)
- spec.json schema versionado con migraciones
- OpenAPI spec para generación de tipos TypeScript

## User Roles
- **Founder**: Acceso completo, analytics, configuración
- **Agency**: Múltiples proyectos, colaboración
- **Pilot**: Early access, feedback loop prioritario

## MVP Scope (20 días)
### In Scope
- Input texto → TTS → segmentación → LLM → spec.json → Remotion → MP4 + spec.json
- Polling de estado de job
- Preview con Remotion player
- Dual export (descarga MP4 + spec.json)
- Auth JWT básico

### Out of Scope (v2)
- Editor visual drag-and-drop
- Integración directa con After Effects
- Multi-tenant avanzado
- Sistema de pagos/suscripciones
- Biblioteca de templates visuales

## Success Metrics
- 95% render success rate
- Frame sync accuracy: ±1 frame
- Pipeline end-to-end < 5 minutos para 60s de video
- Zero data loss en worker failures

## Risk Mitigation
| Riesgo | Mitigación |
|---|---|
| LLM falla en generación | Fallback a animación default + log |
| TTS timeout | Retry con backoff exponencial |
| Remotion crash | Job state preserved, re-trigger possible |
| Desync audio/video | Padding frames, validación de duración |

## Schema Evolution
Cualquier cambio a spec.json requiere:
1. Version bump (v1 → v2)
2. Actualización simultánea de Pydantic + TypeScript
3. Migración script para datos existentes
4. Documentación en /docs/adr/ 

 