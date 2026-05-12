# Arquitectura: Campo `animation_spec` — Evolución de `media_query`

- **Fecha:** 2026-05-11
- **Estado:** Propuesto (iteración futura)
- **Relacionado:** ADR-004, system_prompt.md §spec.json Schema

---

## Problema

El campo `media_query` es un string de texto libre (<500 chars). Funciona como contexto para el LLM pero:

1. **No es estructurado**: El LLM debe interpretar qué tipo de objeto, qué tamaño, qué colores, qué animación de entrada...
2. **No es validable programáticamente**: No podemos verificar que el componente generado cumple con los estándares de calidad sin ejecutarlo
3. **No es editable en la UI**: El usuario no puede ajustar "quiero la barra de chocolate más grande" sin reescribir el string

## Propuesta: Campo `animation_spec`

### Relación con `media_query`

```
media_query    → texto libre, legible por humanos, contexto semántico
animation_spec → JSON estructurado, especificación técnica completa
```

Son complementarios: `media_query` describe el "qué", `animation_spec` describe el "cómo".

### Schema propuesto

```typescript
interface AnimationSpec {
  archetype: string;           // Clave del catálogo: "chocolate_bar" | "stock_chart" | "clock" | ...
  
  object: {
    type: "svg" | "div_composite";
    size_px: number;           // 250-400
    description: string;       // Descripción detallada del SVG para el LLM
    colors: string[];          // Paleta de colores del objeto
    entry_animation:           // Tipo de entrada
      "spring_bounce_from_top" | "spring_bounce_from_bottom" |
      "slide_from_left" | "scale_in" | "rotate_in";
    entry_config?: {
      damping: number;         // Default: 10
      stiffness: number;       // Default: 150
      initial_rotation_deg?: number; // Default: -15
    };
  };
  
  background: {
    type: "radial_gradient" | "linear_gradient" | "solid";
    colors: string[];          // Stops del gradiente
    glow_color: string;        // Color del aura detrás del objeto
    glow_opacity: number;      // 0.1-0.25
    glow_blur_px?: number;     // Default: 80
  };
  
  text: {
    font_size: number;         // 60-72
    font_weight: number;       // 800-900
    letter_spacing: string;    // "-2px" | "-3px"
    text_transform: "uppercase" | "none";
    entry_frame: number;       // Frame donde empieza el fade-in (ej: 25)
    glow_color: string;        // Sombra del texto: "rgba(R,G,B,0.5)"
  };
}
```

### Ejemplo completo: Escena de chocolate

```json
{
  "start_time_seconds": 0.0,
  "duration_seconds": 8.0,
  "text": "El chocolate no es un capricho, es tu mejor inversión.",
  "type": "Scene_abc123_0",
  "media_query": "animated chocolate bar SVG symbolizing impulse purchase, golden glow",
  "animation_spec": {
    "archetype": "chocolate_bar",
    "object": {
      "type": "svg",
      "size_px": 320,
      "description": "chocolate bar 320x200px: dark brown rectangle with 6 grid segments (2x3), golden highlight line in top-left corner, drop shadow below, all filled with linearGradient from #6b3d12 to #3d1f05",
      "colors": ["#4a2c0a", "#6b3d12", "#f59e0b", "#fbbf24"],
      "entry_animation": "spring_bounce_from_top",
      "entry_config": { "damping": 10, "stiffness": 150, "initial_rotation_deg": -12 }
    },
    "background": {
      "type": "radial_gradient",
      "colors": ["#1a0800", "#0a0a0a"],
      "glow_color": "#f59e0b",
      "glow_opacity": 0.15,
      "glow_blur_px": 100
    },
    "text": {
      "font_size": 64,
      "font_weight": 900,
      "letter_spacing": "-2px",
      "text_transform": "uppercase",
      "entry_frame": 25,
      "glow_color": "rgba(245, 158, 11, 0.5)"
    }
  },
  "remotion_props": {
    "backgroundColor": "#0a0a0a",
    "textColor": "#f59e0b"
  },
  "sfx": [],
  "audio_url": "https://cdn.animaflow.io/audio/scene_0.mp3"
}
```

---

## Plan de implementación (iteración futura)

### Fase 1: Generación automática en Batch Visuals
Modificar `generate_batch_visuals_with_llm` para que Gemini devuelva `animation_spec` como JSON estructurado junto al `media_query`.

```python
# Respuesta actual de Gemini:
# { "scenes": [{ "media_query": "...", "backgroundColor": "...", "textColor": "..." }] }

# Respuesta futura:
# { "scenes": [{ "media_query": "...", "animation_spec": {...}, "backgroundColor": "...", "textColor": "..." }] }
```

### Fase 2: Validación de Pydantic

```python
class AnimationSpecObject(BaseModel):
    type: Literal["svg", "div_composite"]
    size_px: int = Field(ge=250, le=400)
    description: str
    colors: list[str]
    entry_animation: str

class AnimationSpec(BaseModel):
    archetype: str
    object: AnimationSpecObject
    background: dict
    text: dict

class VisualSpecResult(BaseModel):
    media_query: str
    animation_spec: Optional[AnimationSpec] = None  # opcional hasta impl. completa
    backgroundColor: str
    textColor: str
```

### Fase 3: Inyección en el prompt de generación de componentes

Cuando `animation_spec` esté disponible, se inyecta en el prompt de `generate_remotion_component`:

```python
if visual_spec.animation_spec:
    anim = visual_spec.animation_spec
    prompt_header += (
        f"ESPECIFICACIÓN EXACTA DEL OBJETO:\n"
        f"- Tamaño: {anim.object.size_px}px\n"
        f"- Descripción: {anim.object.description}\n"
        f"- Colores: {', '.join(anim.object.colors)}\n"
        ...
    )
```

### Fase 4: Editor visual en frontend

La UI puede exponer los campos de `animation_spec` como controles editables:
- Slider de tamaño del objeto (250-400px)
- Color picker para `glow_color`
- Selector de `entry_animation`
- Slider de `entry_frame` para el texto

---

## Estado actual

El pipeline actual usa **solo `media_query`** como input al LLM, que debe inferir todos los detalles de calidad a partir del prompt de instrucciones. `animation_spec` está documentado en el schema como campo opcional para la próxima iteración.
