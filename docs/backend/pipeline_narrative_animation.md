# Backend: Pipeline de Animación Narrativa

- **Fecha:** 2026-05-11
- **Archivo principal:** `backend/app/services/pipeline.py`
- **Relacionado:** ADR-004

---

## Cambios implementados

### 1. `generate_batch_visuals_with_llm` — Prompt de metáforas visuales

El prompt fue rediseñado para forzar al LLM a identificar un **objeto visual concreto** por escena en lugar de descripciones abstractas de fondo.

**Antes:** "Genera una descripción visual para animar esta escena"  
**Después:** "Identifica el objeto visual más representativo del concepto (barra de chocolate, gráfica de stock, candado...) y descríbelo en inglés como si fuera una instrucción para un motion designer"

### 2. `generate_remotion_component` — Prompt de alta fidelidad

El prompt fue completamente rediseñado con:

#### Estándares de calidad explícitos
```
1. TAMAÑO: SVG principal 250-400px (fallo si menor)
2. DETALLE: Mínimo 5-8 elementos SVG con <defs>/<linearGradient>
3. FONDO: Nunca negro puro — radial-gradient o linear-gradient
4. GLOW: Div con filter: blur(80px), opacidad 0.12-0.2
5. TIPOGRAFÍA: fontSize 60-72px, fontWeight 900, letterSpacing -2px, uppercase
6. ENTRADA: spring() con damping 10, stiffness 150 + rotación -15° → 0°
```

#### Catálogo de 10 arquetipos con especificaciones
- CHOCOLATE/CAPRICHO → 6 segmentos en grid, glow dorado
- INVERSIÓN/DINERO → strokeDashoffset animado, área de relleno
- TIEMPO → reloj con 12 marcas, agujas girando
- SEGURIDAD → candado cerrándose con spring
- DATOS → barras con delay escalonado por índice
- RED/CONEXIÓN → nodos con líneas en secuencia
- VELOCIDAD → líneas paralelas con motion blur
- ÉXITO → estrella/trofeo con partículas radiales
- MENSAJE → sobre volando con scale+rotate
- TRABAJO → checklist con ticks escalonados

### 3. Solución de SyntaxErrors en f-strings

El prompt se construye en **dos partes concatenadas**:

```python
# PARTE 1: f-string con variables dinámicas
prompt_header = (
    f"Texto del guion: \"{text}\"\n"
    f"Duración: {duration} segundos\n"
    ...
)

# PARTE 2: string plano — sin f-string, las llaves {} son literales seguros
prompt_code = (
    "export const SceneComponent = ({ text, durationInFrames }) => {\n"
    "    const { fps } = useVideoConfig();\n"
    ...
    f"    backgroundColor: '{bg_color}'\n"  # ← f-string solo donde hay variable Python
)

prompt = prompt_header + prompt_code
```

**Por qué:** Las llaves `{}` de JSX/TypeScript dentro de f-strings de Python se interpretan como interpolación de variables, causando `SyntaxError`. La separación permite usar `{}` libremente en el string plano.

### 4. Restauración de `_process_chunks_async`

La función `_process_chunks_async` fue accidentalmente eliminada durante las ediciones de corrección de syntax. El cuerpo del loop `for i, chunk in enumerate(chunks):` quedó dentro del bloque `except` de `generate_remotion_component`, haciéndolo inalcanzable.

**Solución:** Se restauró `async def _process_chunks_async(...)` como función independiente y se añadió `return "FadeText"` al bloque `except` de `generate_remotion_component`.

---

## Flujo actual del pipeline

```
run_pipeline(job_id, script_text)
    │
    ├─ split_text_into_chunks()           → 3-5 chunks de ~7s
    │
    ├─ generate_batch_visuals_with_llm()  → BatchVisualSpec (media_query + colors)
    │    └─ Gemini API (1 call batch)
    │
    └─ asyncio.run(_process_chunks_async())
         │
         ├─ [per scene] generate_tts_with_voicebox()   → duration, audio_url
         │                                               (fallback: len/15 si Voicebox no disponible)
         ├─ [per scene] generate_remotion_component()  → TSX file + component name
         │    └─ Gemini API (1 call per scene, max 3 retries en 429)
         │    └─ asyncio.sleep(4) entre escenas (rate limit)
         │
         └─ write_index_ts()   → frontend/src/remotion/generated/index.ts
```

---

## Notas de debugging

- **Job completa en <15s**: `_process_chunks_async` no se está ejecutando → verificar que la función existe como `async def` en el archivo
- **Componente TSX vacío o placeholder**: El LLM ignoró las instrucciones → revisar que el prompt_header contenga los estándares de calidad completos
- **NameError en runtime**: Variable Python referenciada dentro de string de prompt → usar `bg_color = visual_spec.backgroundColor` antes del bloque y f-string solo en esa línea
