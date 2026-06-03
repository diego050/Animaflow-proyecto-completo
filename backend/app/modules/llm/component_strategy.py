"""
Estrategia de generacion de componentes: genera un JSON AnimaComposer.

El LLM evalúa cada escena y decide cómo animarla usando exclusivamente
componentes de la Standard Library.
Todo se retorna como un AnimaComposerSpec válido.
"""
import json
import math
import re
from typing import Any, Optional
from sqlalchemy.orm import Session
from google import genai
from google.genai import types
from app.core.logging import get_logger
from app.schemas.spec import AnimaComposerSpec, AnimaBackground, AnimaLayer
from app.services.iconify_search import find_best_icons
from app.modules.llm.spec_validator import validate_and_fix

logger = get_logger("llm.strategy")


def _sanitize_llm_json(raw: str) -> str:
    """Truncate numbers with excessive decimal places from LLM output."""
    return re.sub(r'(\d+\.\d{6})\d+', r'\1', raw)


# ── Numeric coercion helper ──────────────────────────────────────────────────

def _coerce_number(value: Any) -> Any:
    """Convert string numbers to int/float, return unchanged if not convertible."""
    if isinstance(value, str):
        try:
            if "." in value:
                return float(value)
            return int(value)
        except (ValueError, TypeError):
            return value
    return value


# ── Canvas dimensions helper ─────────────────────────────────────────────────

def _get_canvas_dimensions(aspect_ratio: str) -> tuple[int, int]:
    """Get canvas dimensions for a given aspect ratio or custom size."""
    # Standard presets
    presets = {
        "9:16": (1080, 1920),
        "16:9": (1920, 1080),
        "1:1": (1080, 1080),
        "4:5": (1080, 1350),
        "4:3": (1440, 1080),
        "3:4": (1080, 1440),
    }

    # Check if it's a standard preset
    if aspect_ratio in presets:
        return presets[aspect_ratio]

    # Check if it's a custom size in format "WxH" (e.g., "500x800")
    if "x" in aspect_ratio.lower():
        try:
            parts = aspect_ratio.lower().split("x")
            w, h = int(parts[0]), int(parts[1])
            if 100 <= w <= 4096 and 100 <= h <= 4096:
                return (w, h)
        except (ValueError, IndexError):
            pass

    # Fallback
    return (1080, 1920)


# ── Path Normalizer ──────────────────────────────────────────────────────────

def _normalize_paths(spec: dict, width: int, height: int) -> dict:
    """
    Normalize absolute SVG path coordinates to be centered around (0, 0).

    If pathData contains numbers that look absolute (> 100 heuristic),
    subtract width/2 from X coordinates and height/2 from Y coordinates.
    Skips paths containing 'A' (arc) commands to avoid breaking complex curves.
    """
    half_w = width / 2
    half_h = height / 2

    for layer in spec.get("layers", []):
        path_data = layer.get("pathData")
        if not path_data or not isinstance(path_data, str):
            continue

        # Skip arc commands — too complex to normalize safely
        if "A" in path_data or "a" in path_data:
            continue

        # Find all numbers in the path
        numbers = re.findall(r'(-?\d+\.?\d*)', path_data)

        if not numbers:
            continue

        # Heuristic: only normalize if the first number looks absolute
        try:
            first_num = float(numbers[0])
            if first_num <= 100:
                continue
        except ValueError:
            continue

        # Replace numbers: even index = X (subtract half_w), odd index = Y (subtract half_h)
        counter = 0

        def replace_number(match: re.Match) -> str:
            nonlocal counter
            original = match.group(0)
            try:
                value = float(original)
                if counter % 2 == 0:
                    value -= half_w
                else:
                    value -= half_h
                # Format: keep as int if whole number, otherwise 2 decimal places
                formatted = f"{value:.0f}" if value == int(value) else f"{value:.2f}"
            except ValueError:
                formatted = original
            counter += 1
            return formatted

        layer["pathData"] = re.sub(r'-?\d+\.?\d*', replace_number, path_data)

    return spec


# ── Smart Layout Engine ──────────────────────────────────────────────────────

def _apply_smart_layout(spec: dict) -> dict:
    """
    Assign default x/y positions to layers that are missing them,
    distributing elements vertically to avoid overlap.

    - background: x=0, y=0
    - text: start at y=150, increment by 80 per text layer
    - path, circle, component, rect, image: start at y=-150, increment by 150 per layer
    - x defaults to 0 if missing
    """
    text_y = 150
    visual_y = -150

    for layer in spec.get("layers", []):
        layer_type = layer.get("type", "")

        # Default x to 0 if missing
        if "x" not in layer or layer["x"] is None:
            layer["x"] = 0

        # Default y based on type if missing
        if "y" not in layer or layer["y"] is None:
            if layer_type == "background":
                layer["y"] = 0
            elif layer_type == "text":
                layer["y"] = text_y
                text_y += 80
            elif layer_type in ("path", "circle", "component", "rect", "image"):
                layer["y"] = visual_y
                visual_y += 150
            else:
                # Fallback: treat as visual
                layer["y"] = visual_y
                visual_y += 150

    return spec


# ── Coordinate Clamping ──────────────────────────────────────────────────────

def _clamp_coordinates(spec: dict, width: int, height: int) -> dict:
    """
    Clamp layer x/y coordinates to keep elements within safe screen margins.

    Calculates a 10% margin on each axis and ensures no layer position
    exceeds the safe range, preventing elements from rendering off-screen.
    """
    margin_x = width * 0.1
    margin_y = height * 0.1

    min_x = -(width / 2 - margin_x)
    max_x = width / 2 - margin_x
    min_y = -(height / 2 - margin_y)
    max_y = height / 2 - margin_y

    for layer in spec.get("layers", []):
        if "x" in layer and layer["x"] is not None:
            layer["x"] = max(min_x, min(max_x, layer["x"]))
        if "y" in layer and layer["y"] is not None:
            layer["y"] = max(min_y, min(max_y, layer["y"]))

    return spec


# ── Catálogo de componentes disponibles ──────────────────────────────────────
# Mantener sincronizado con frontend/src/remotion/registry.ts
AVAILABLE_COMPONENTS: list[str] = [
    "APIRequestFlow", "AbstractWave", "AnimatedArrow", "AnimatedIcon", "AnimatedLine", "AnimatedShape",
    "AppStoreButtons", "AudioSpectrumBars", "BarChartReveal", "BreakingNewsAlert", "BreakingNewsTicker",
    "BrowserWindow", "CalendarDatePop", "CodeBlockHighlight", "CountdownTimer", "CounterNumber",
    "CursorClick", "EmojiFloat", "FeatureChecklist", "FeatureUnlock", "FlashSaleTimer", "FloatingBadge",
    "FloatingBlobs", "FollowerCounter", "FunnelChart", "GitCommitGraph", "GlitchTitle", "GlitchTransition",
    "GlobalVFX", "GradientOverlay", "GridPerspective", "HighlightText", "HorizontalBarRace", "InstagramPost",
    "KineticBackground", "LightLeakTransition", "LoadingSpinner", "LowerThird",
    "MaskedReveal", "MediaFrame", "MessageBubble", "MusicPlayerUI", "NetworkNodes", "NotificationToast",
    "ParticleField", "PercentageRing", "PhoneMockup", "PieChartReveal", "PodcastGuestCard", "PricingTableReveal",
    "ProductCardReveal", "ProgressPill", "PromoCodeBanner", "QuoteBlock", "RadarSpiderChart", "RaysOfLight",
    "RippleEffect", "ScoreboardCounter", "SearchEngineTyping", "ShoppingCartBadge", "SizeSelector",
    "SocialProgressBar", "SocialSharePopup", "SoundWaveCircle", "SplitScreenGrid", "SplitText",
    "StockCandlestick", "StrikethroughText", "SubscribeButton", "TerminalHacker", "TestimonialReview",
    "TextBubble", "TextReveal", "TextSwap", "TikTokOverlay", "TinderSwipeCard", "TrendLine", "TweetCard",
    "Typewriter", "UnderlineReveal", "VersusScreen", "WaveformVisualizer", "WipeTransition",
    "YouTubeEndScreen", "ZoomBlurTransition"
]


# ── Prompt base ──────────────────────────────────────────────────────────────

def _build_strategy_prompt(
    text: str,
    media_query: str,
    available_components: list[dict],
    aspect_ratio: str = "9:16",
    icon_candidates: list[dict] | None = None,
    duration_seconds: float = 0.0,
    suggested_bg_color: Optional[str] = None,
    suggested_text_color: Optional[str] = None,
) -> str:
    # Group components by role
    by_role = {}
    for comp in available_components:
        role = comp.get("role", "general")
        if role not in by_role:
            by_role[role] = []
        by_role[role].append(comp)

    # Format as structured list
    role_emojis = {
        "background": "🎨",
        "text": "📝",
        "transition": "🔄",
        "ui": "🖥️",
        "dataviz": "📊",
        "decorative": "✨",
        "social": "📱",
        "general": "📦",
    }

    components_list_parts = []
    for role, comps in by_role.items():
        emoji = role_emojis.get(role, "📦")
        role_title = role.upper()
        for c in comps:
            props_str = c.get("props", "none required")
            components_list_parts.append(
                f"{emoji} {role_title}: **{c['name']}** — {c['description']}\n"
                f"   Props: {props_str}\n"
                f"   Posición: x=0 y=0 es centro del canvas"
            )

    components_list = "\n".join(components_list_parts)

    # Build compact reference for ONLY the components selected by vector search
    # This replaces the hardcoded 108-component library to save ~2,500 tokens per call
    selected_component_ref = "\n".join(
        f"- **{c['name']}** ({c.get('role', 'general')}): {c.get('description', '')}\n  Props: {c.get('props', 'none required')}"
        for c in available_components
    )

    # Also check which Style* components are in the selected list
    style_components_in_list = [c for c in available_components if c['name'].startswith('Style')]
    style_component_ref = ""
    if style_components_in_list:
        style_component_ref = "\n\n## Style* Components Available (support LayerStyle overrides):\n" + "\n".join(
            f"- **{c['name']}**: {c.get('description', '')}\n  Props: {c.get('props', 'none required')}"
            for c in style_components_in_list
        )

    # Build icon suggestions section if candidates are available
    icon_section = ""
    if icon_candidates:
        # Build detailed icon list with tags for LLM context
        icon_lines = []
        for c in icon_candidates:
            tags = c.get("tags", [])
            tags_str = ", ".join(tags[:5]) if tags else "no tags"
            icon_lines.append(f'  - {c["full_id"]} (score: {c.get("score", 0):.2f}) — representa: {tags_str}')

        icon_list = "\n".join(icon_lines)
        icon_section = f"""

ÍCONOS SUGERIDOS PARA ESTA ESCENA (basados en el TEXTO de la escena):
{icon_list}

REGLA CRÍTICA DE ÍCONOS:
- SOLO selecciona íconos que representen LITERALMENTE el sujeto del texto de la escena.
- Si el texto habla de "gatos", usa un ícono de gato. Si habla de "dinero", usa un ícono de dinero.
- NO uses íconos abstractos, de "ambiente" o "atmósfera".
- Usa tantos íconos como la escena necesite. Si el texto menciona múltiples conceptos, usa un ícono para cada uno.
- Si ningún ícono es relevante para el sujeto del texto, NO incluyas ningún ícono.
- Los íconos pueden ser decorativos, funcionales (dentro de botones/badges), o representativos del contenido.
- Usa type: "component", componentName: "IconifyIcon", icon: "nombre_exacto"

Ejemplo correcto (texto sobre gatos): {{"type": "component", "componentName": "IconifyIcon", "icon": "mdi:cat", "size": 120, "color": "#ffffff", "x": 0, "y": -200}}
Ejemplo incorrecto (texto sobre gatos): {{"type": "component", "componentName": "IconifyIcon", "icon": "material-symbols:computer-sound-sharp", ...}} ← NO representa un gato
"""

    width, height = _get_canvas_dimensions(aspect_ratio)
    half_w = width // 2
    half_h = height // 2

    # Calculate safe zones dynamically
    safe_margin_x = int(width * 0.1)  # 10% margin from edges
    safe_margin_y = int(height * 0.1)
    max_font_size = int(min(width, height) * 0.12)  # 12% of smallest dimension (~130px for 1080p)
    
    text_safe_zone = f"""- **TEXTO:** El texto debe estar dentro del "Safe Zone" para no cortarse en los bordes.
  - Rango seguro X: entre -{half_w - safe_margin_x} y {half_w - safe_margin_x}.
  - Rango seguro Y: entre -{half_h - safe_margin_y} y {half_h - safe_margin_y}.
  - Si usas `textAlign: "center"`, `x: 0` es el centro perfecto.
  - Si quieres texto a la izquierda: usa `x: -{int(half_w * 0.7)}` a `-{int(half_w * 0.5)}`.
  - Si quieres texto a la derecha: usa `x: {int(half_w * 0.5)}` a `{int(half_w * 0.7)}`.
  - fontSize máximo: {max_font_size} (valores mayores se salen del canvas)."""

    layout_section = """
SISTEMA DE LAYOUT (FLEXBOX):
En lugar de usar coordenadas absolutas (x, y) para cada elemento, usa estructuras de layout para organizar elementos de forma flexible y responsive.

Ejemplo 1: Fila horizontal con espacio entre elementos
{
  "type": "group",
  "layout": "flex",
  "direction": "row",
  "justifyContent": "space-between",
  "alignItems": "center",
  "gap": 40,
  "children": [
    { "type": "component", "componentName": "IconifyIcon", "icon": "mdi:cat", "flex": 1 },
    { "type": "text", "text": "Los gatos son increíbles", "flex": 2 }
  ]
}

Ejemplo 2: Columna vertical centrada
{
  "type": "group",
  "layout": "flex",
  "direction": "column",
  "justifyContent": "center",
  "alignItems": "center",
  "gap": 20,
  "children": [
    { "type": "component", "componentName": "PercentageRing", "value": 73 },
    { "type": "text", "text": "73% de los usuarios" }
  ]
}

Ejemplo 3: Overlay (botón encima de fondo)
{
  "layers": [
    { "type": "component", "componentName": "KineticBackground", "zIndex": 0 },
    { "type": "group", "layout": "flex", "direction": "column", "alignItems": "center", "zIndex": 10, "children": [
      { "type": "text", "text": "Texto encima" },
      { "type": "component", "componentName": "SubscribeButton" }
    ]}
  ]
}

Ejemplo 4: Elemento con posición absoluta (overlay específico)
{
  "type": "component",
  "componentName": "NotificationToast",
  "position": "absolute",
  "top": 20,
  "right": 20
}

PROPIEDADES DE LAYOUT DISPONIBLES:
- layout: "flex" | "grid" | "absolute"
- direction: "row" | "column"
- justifyContent: "flex-start" | "center" | "space-between" | "space-around"
- alignItems: "flex-start" | "center" | "stretch"
- gap: número (espaciado entre hijos en píxeles)
- flex: número (factor de crecimiento relativo)
- zIndex: número (orden de apilamiento, mayor = encima)
- position: "relative" | "absolute"
- top, right, bottom, left: números (para posición absoluta)
- stagger: número (retraso entre animaciones de hijos en segundos)

REGLAS DE LAYOUT:
1. Usa "group" con "layout: flex" para organizar múltiples elementos.
2. Usa "zIndex" para controlar qué va encima de qué.
3. Usa "gap" para espaciado consistente entre elementos.
4. NO uses coordenadas x/y dentro de un grupo flex — el layout las calcula automáticamente.
5. El texto y los iconos son OPCIONALES. Usa solo lo que la escena necesite.
6. Puedes anidar grupos flex dentro de otros grupos para layouts complejos.
"""

    positioning_rules = f"""REGLAS DE POSICIONAMIENTO (CANVAS {width}x{height}, formato {aspect_ratio}):
- El centro del canvas es (0, 0). Los bordes son aproximadamente x: ±{half_w}, y: ±{half_h}.
- Para centrar un elemento: usa x: 0, y: 0.
- Para texto principal: usa y: {int(-half_h * 0.2)} a y: {int(half_h * 0.2)} (zona central, legible).
- Para elementos decorativos: distribúyelos en y: {int(-half_h * 0.6)} a y: {int(half_h * 0.6)}, x: {int(-half_w * 0.5)} a x: {int(half_w * 0.5)}.
- Usa transform: "translate(x, y)" o las propiedades x/y del layer para posicionar.
{text_safe_zone}
"""

    # Timing context
    timing_context = ""
    if duration_seconds > 0:
        fps = 30
        duration_in_frames = int(duration_seconds * fps)
        words = len(text.split())
        wps = words / duration_seconds if duration_seconds > 0 else 0
        rhythm = "rápido" if wps > 4 else ("medio" if wps > 2.5 else "lento")
        max_entry_delay = round(duration_seconds * 0.2, 1)

        timing_context = f"""
DURACIÓN DE LA ESCENA: {duration_seconds} segundos ({duration_in_frames} frames a 30fps)
PALABRAS: {words}
RITMO DEL AUDIO: {rhythm} ({wps:.1f} palabras/segundo)

TIMING RECOMENDADO:
- Entrada de elementos: frames 0 a {int(duration_in_frames * 0.25)}
- Elementos visibles: frames {int(duration_in_frames * 0.25)} a {int(duration_in_frames * 0.7)}
- Salida de elementos (exit): frames {int(duration_in_frames * 0.7)} a {duration_in_frames}
- entryDelay máximo: {max_entry_delay} segundos (no más del 20% de la duración)
- Si la escena dura menos de 3 segundos, usa entryDelay de 0 o muy pequeño.
"""

    # Exit animation instructions
    exit_start_frame = "los últimos frames"
    if duration_seconds > 0:
        exit_start_frame = str(int(duration_seconds * 30 * 0.75))

    exit_instructions = f"""
ANIMACIONES DE SALIDA (exit) — OBLIGATORIO:
CADA layer (excepto background) DEBE tener una animación de salida. Sin excepción.
Valores válidos: "fade-out", "slide-up-out", "slide-down-out", "slide-left-out", "slide-right-out", "scale-out", "spring-out", "bounce-out"
Agrega `exitDelay` (segundos antes de que empiece la salida) y `exitDuration` (duración en segundos).

Ejemplo de layer CON exit:
  {{"type": "text", "text": "Hola", "x": 0, "y": -100, "exit": "slide-up-out", "exitDelay": 0.3, "exitDuration": 0.5}}
  {{"type": "component", "componentName": "IconifyIcon", "icon": "mdi:heart", "x": 0, "y": -200, "exit": "fade-out", "exitDelay": 0.2, "exitDuration": 0.4}}

El background NO necesita exit.
Las animaciones de salida deben empezar en el frame {exit_start_frame} (último 25% de la escena).
"""

    # Color coherence section
    color_section = ""
    if suggested_bg_color or suggested_text_color:
        color_section = f"""
COLORES SUGERIDOS (del análisis visual de la escena):
- Color de fondo sugerido: {suggested_bg_color or 'No especificado'}
- Color de texto sugerido: {suggested_text_color or 'No especificado'}
Usa estos colores como BASE para mantener coherencia visual con la dirección artística.
Puedes variarlos ligeramente (±10% luminosidad) pero NO los ignores.
"""

    return f"""Eres el director de escena de AnimaFlow. Tu trabajo es diseñar la composición de UNA escena de video devolviendo un JSON AnimaComposerSpec.

TEXTO DE LA ESCENA: "{text}"
DESCRIPCION VISUAL: "{media_query}"
{color_section}
DIRECCIÓN ARTÍSTICA DEL USUARIO (ALTA PRIORIDAD):
"{media_query}"
Todos los componentes, colores y estilos deben ser coherentes con esta dirección.
Si la dirección sugiere un tono (cálido, tech, minimalista, etc.), refléjalo en:
- Paleta de colores del background
- Variantes de componentes
- Tipografía y tamaños
{timing_context}
PASO 1 - IDENTIFICA EL SUJETO: Lee el texto y la descripción visual. ¿Cuál es el objeto/sujeto/tema principal de esta escena? (ej: un perro, una manzana, el dinero, un corazón, un planeta, etc.)

PASO 2 - COMPOSICIÓN LIBRE: Selecciona TODOS los componentes necesarios para representar visualmente el sujeto y el mensaje de la escena. NO hay límite de componentes. Puedes usar 1 componente o 15 — lo que la escena necesite.

Ejemplos de composiciones válidas:
- Simple: 1 background + 1 texto (escena minimalista)
- Media: 1 background + 2 botones + 1 texto arriba + 1 badge (CTA con contexto)
- Compleja: 1 background + 3 cards en grid + 2 badges + 1 texto título + 1 ícono decorativo (comparativa)
- Rica: 1 background + 1 gráfico + 2 textos + 1 progress bar + 2 íconos + 1 watermark (data-driven)

REGLA: Usa grupos flex/grid para organizar múltiples elementos. Cada componente debe tener un propósito claro en la escena.

REGLA CRÍTICA: SOLO usa type: "component" para elementos visuales y type: "text" para el texto hablado. NO uses type: "path", "rect", "circle". Esos tipos están PROHIBIDOS.

Tienes acceso a componentes de nuestra Standard Library.
COMPONENTES DISPONIBLES PARA ESTA ESCENA (organizados por rol):
{components_list}
{icon_section}
INSTRUCCIONES:
Debes generar un JSON válido que describa el 'background' y una lista de 'layers'.
Usa componentes de la lista anterior con type: "component" y componentName: "NOMBRE_EXACTO".

REGLAS DE ORO PARA EL DISEÑO:
1. **USA SOLO COMPONENTES DE LA STANDARD LIBRARY:** No crees formas desde cero con primitivas. Selecciona y combina componentes de la lista proporcionada. Si necesitas un elemento visual específico, busca el componente más cercano en la lista y adáptalo con sus props.
2. **COHERENCIA TEMÁTICA ESTRICTA:** Solo elige componentes de la Standard Library si tienen una relación DIRECTA y LÓGICA con el guion. Si el video es un documental sobre peces, NO uses un "SubscribeButton" o "TinderSwipeCard". Usa tu juicio semántico: si no encaja perfecto con la vibra de la escena, no lo uses.
3. **NO APILES ELEMENTOS UNO ENCIMA DEL OTRO EN EL CENTRO**. Usa la propiedad `y` (ejemplo: `y: -300` para arriba, `y: 0` para el centro, `y: 300` para abajo) o la propiedad `x` para distribuir las capas y evitar superposiciones.
4. El texto hablado principal DEBE aparecer en pantalla de manera legible. Pásalo a tu componente de texto usando `"text": "{{text}}"`.
5. **POSICIONAMIENTO OBLIGATORIO:** ABSOLUTAMENTE TODOS los layers DEBEN tener `x` e `y`. Si los omites, el JSON será inválido.
    - `"x": 0, "y": 0` = centro del canvas
    - `"x": 0, "y": -200` = arriba del centro
    - `"x": 0, "y": 200` = abajo del centro
    - `"x": -200, "y": 0` = izquierda del centro
    - `"x": 200, "y": 0` = derecha del centro
    - EJEMPLO CORRECTO: {{"type": "text", "text": "Hola", "x": 0, "y": 0}}
    - EJEMPLO INCORRECTO: {{"type": "text", "text": "Hola"}} ← FALTA x/y, INVÁLIDO
6. **FORMATO NUMÉRICO ESTRICTO:** Para `lineWidth`, usa SOLO números ENTEROS (0, 1, 2, 3... 20). NUNCA uses decimales. Ejemplos válidos: `0`, `4`, `10`. Ejemplos INVÁLIDOS: `0.5`, `4.5`, `10.25`.
7. **MÚLTIPLES ICONOS PERMITIDOS CON POSICIONAMIENTO:** Puedes usar varios iconos en la escena si tienen sentido visual (ej: iconos de fuego alrededor de un texto central, iconos de fiesta decorando una palabra). REGLAS:
   - Cada icono DEBE tener x/y diferentes — NUNCA superpongas iconos en la misma posición.
   - Distribúyelos alrededor del elemento central (ej: en círculo, en fila, en esquinas).
   - Si usas el mismo icon múltiples veces, varía el `scale` (ej: 0.8, 1.0, 1.2) para crear profundidad.
   - Máximo 5-6 iconos decorativos por escena para no saturar.

{layout_section}

GUÍA DE TAMAÑOS DE TEXTO PARA VIDEO VERTICAL (1080x1920):
┌─────────────────────────────────────────────────────┐
│ Rol del texto              │ fontSize recomendado   │
├─────────────────────────────────────────────────────┤
│ Texto hablado / principal  │ 80-120 (GRANDE)        │
│ Título de sección          │ 72-96                  │
│ Subtítulo                  │ 48-64                  │
│ Caption / etiqueta         │ 28-36                  │
│ Texto pequeño / crédito    │ 20-24                  │
└─────────────────────────────────────────────────────┘
REGLA: El texto hablado SIEMPRE debe ser fontSize >= 80.
Es video para móvil, no un documento. Si dudas, usa 96.

NOTA sobre lineWidth: SOLO úsalo para componentes de tipo shape/path (líneas, bordes).
NUNCA lo uses en componentes de texto, charts, cards o contadores.

## Video Style System

Every layer supports a `style` object with these properties:

### Spacing
- `padding`: number or [top, right, bottom, left] — Internal spacing
- `margin`: number or [top, right, bottom, left] — External spacing

### Borders
- `borderWidth`: number — Border thickness
- `borderColor`: string — Border color (hex or rgba)
- `borderStyle`: "solid" | "dashed" | "dotted"
- `borderRadius`: number — Corner radius (use 999 for pill shape)

### Effects
- `boxShadow`: {{x, y, blur, spread, color}} — Drop shadow
- `opacity`: 0-1 — Transparency
- `blur`: number — Blur amount
- `backdropBlur`: number — Glassmorphism blur

### Filters
- `brightness`: 0-3 — Brightness multiplier
- `contrast`: 0-3 — Contrast multiplier
- `saturate`: 0-3 — Saturation multiplier
- `grayscale`: boolean — Convert to grayscale
- `hueRotate`: 0-360 — Hue rotation in degrees
- `invert`: boolean — Invert colors

### Transforms
- `rotate`: -360 to 360 — Rotation in degrees
- `scale`: number or [x, y] — Scale multiplier
- `transformOrigin`: string — Transform origin point

### Typography
- `lineHeight`: number — Line height multiplier
- `textShadow`: {{x, y, blur, color}} — Text shadow
- `textDecoration`: "underline" | "line-through" | "none"

### Background
- `backgroundImage`: string — URL or gradient
- `backgroundSize`: "cover" | "contain" | "auto"
- `backgroundPosition`: string — Position (center, top, etc.)
- `backgroundOpacity`: 0-1 — Background opacity

### Layout
- `overflow`: "hidden" | "visible" | "scroll"
- `aspectRatio`: string — Aspect ratio (e.g., "16/9")
- `objectFit`: "cover" | "contain" | "fill"
- `flexWrap`: "wrap" | "nowrap"
- `flexGrow`: number — Flex grow factor
- `flexShrink`: number — Flex shrink factor
- `order`: number — Visual order

## Video Style System (Style* Components)
Estos componentes soportan overrides completos de LayerStyle. Solo se incluyen los relevantes para esta escena.

## New Components

### StyleButton
A premium CTA button for video.
- `componentName`: "StyleButton"
- `text`: Button text
- `variant`: "primary" | "secondary" | "ghost" | "outline"
- `size`: "sm" | "md" | "lg"
- `icon`: Iconify icon name (optional)
- `iconPosition`: "left" | "right"
- Use for: CTAs, "Subscribe", "Link in bio", "Learn More"

### StyleCard
A container for grouping content with visual hierarchy.
- `componentName`: "StyleCard"
- `title`: Card title
- `subtitle`: Card subtitle
- `variant`: "elevated" | "filled" | "outlined" | "glass"
- `width`: Card width in pixels
- Use for: Info cards, data containers, grouped content

### StyleBadge
A pill-shaped label for categories, prices, tags.
- `componentName`: "StyleBadge"
- `text`: Badge text
- `variant`: "success" | "warning" | "error" | "info" | "neutral"
- `size`: "sm" | "md" | "lg"
- `icon`: Iconify icon name (optional)
- Use for: "NEW", "73% OFF", "LIMITED", categories, tags

### StyleAvatar
An icon-based avatar with animated ring and optional badge.
- `componentName`: "StyleAvatar"
- `icon`: Iconify icon name (e.g., "mdi:account")
- `name`: Display name below avatar
- `subtitle`: Optional subtitle (e.g., rating, title)
- `size`: "sm" | "md" | "lg"
- `variant`: "solid" | "ring" | "gradient"
- `showBadge`: boolean — Show notification badge
- `badgeText`: Badge text (e.g., "NEW", "•")
- Use for: Testimonials, team members, social profiles, user mentions

### StyleProgressBar
A progress indicator with linear and circular variants.
- `componentName`: "StyleProgressBar"
- `value`: Current value (0-100)
- `max`: Maximum value
- `variant`: "linear" | "circular"
- `color`: Progress bar color
- `showLabel`: boolean — Show percentage label
- `labelPosition`: "top" | "bottom" | "inside"
- `size`: Size for circular variant (default 120)
- `strokeWidth`: Stroke width for circular variant
- Use for: Survey results, completion status, statistics, comparisons

### StyleDivider
A visual separator with multiple styles.
- `componentName`: "StyleDivider"
- `orientation`: "horizontal" | "vertical"
- `style`: "solid" | "dashed" | "dotted" | "gradient"
- `color`: Divider color
- `thickness`: Line thickness
- `width`: Width for horizontal dividers
- `height`: Height for vertical dividers
- Use for: Section separators, visual breaks, content grouping

### StyleChip
A tag/chip for filters, categories, and tech stacks.
- `componentName`: "StyleChip"
- `text`: Chip text
- `icon`: Iconify icon name (optional)
- `deletable`: boolean — Show delete X icon
- `variant`: "filled" | "outlined" | "soft"
- `size`: "sm" | "md" | "lg"
- Use for: Tech stacks, filter tags, category labels, skill badges

### StyleTextBlock
A text block for longer content with variants and line clamping.
- `componentName`: "StyleTextBlock"
- `text`: Text content
- `variant`: "heading" | "body" | "caption" | "quote"
- `align`: "left" | "center" | "right"
- `maxLines`: number — Limit visible lines (optional)
- `width`: Width in pixels
- Use for: Titles, descriptions, quotes, captions, body text

### StyleCallout
An annotation with arrow pointing to a target area.
- `componentName`: "StyleCallout"
- `text`: Annotation text
- `direction`: "left" | "right" | "top" | "bottom"
- `variant`: "arrow" | "circle" | "highlight"
- Use for: Pointing to features, highlighting areas, tutorial annotations

### StyleWatermark
A brand logo overlay with controlled opacity.
- `componentName`: "StyleWatermark"
- `src`: Image URL (optional)
- `icon`: Iconify icon name (fallback)
- `position`: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
- `opacity`: 0-1 (default 0.3)
- `size`: Size in pixels (default 60)
- Use for: Branding, logos, watermarks

### StyleVideoPlayer
A video embed for picture-in-picture and media.
- `componentName`: "StyleVideoPlayer"
- `src`: Video URL
- `variant`: "pip" | "fullscreen" | "inline"
- `size`: "sm" | "md" | "lg"
- `autoplay`: boolean (default true)
- `loop`: boolean (default true)
- `muted`: boolean (default true)
- Use for: B-roll, screen recordings, PiP content

### StyleBarChart
An animated bar chart for data visualization.
- `componentName`: "StyleBarChart"
- `data`: (array of objects with: label, value, color)
- `variant`: "vertical" | "horizontal"
- `showLabels`: boolean
- `showValues`: boolean
- Use for: Comparisons, monthly data, rankings

### StyleLineChart
An animated line chart with dots and grid.
- `componentName`: "StyleLineChart"
- `data`: (array of objects with: x, y)
- `showDots`: boolean
- `showGrid`: boolean
- `showLabels`: boolean
- `lineColor`: string
- `fillArea`: boolean
- Use for: Trends, growth, time series

### StylePieChart
An animated pie/donut chart.
- `componentName`: "StylePieChart"
- `data`: (array of objects with: label, value, color)
- `variant`: "pie" | "donut"
- `showLabels`: boolean
- `showValues`: boolean
- `explodeSlice`: index of slice to explode (optional)
- Use for: Percentages, distribution, market share

### StyleAnimateNumber
An animated counter that counts from 0 to a target value.
- `componentName`: "StyleAnimateNumber"
- `value`: Target number
- `from`: Starting number (default 0)
- `prefix`: Text before number (e.g., "$", "+")
- `suffix`: Text after number (e.g., "%", "K")
- `format`: "number" | "currency" | "percentage" | "compact"
- `decimals`: Number of decimal places
- `duration`: Animation duration in frames
- Use for: Statistics, metrics, revenue, growth numbers

### StyleScrambleText
Text that decodes from random characters to the final message.
- `componentName`: "StyleScrambleText"
- `text`: Final text to reveal
- `speed`: Characters revealed per frame
- `characters`: Random character set (default: "#$%&@!?*+=^~01")
- `loop`: boolean — Re-scramble after reveal
- Use for: Tech intros, cybersecurity, suspense reveals, hacker-style effects

### StyleTicker
Horizontally scrolling text (news/crypto style).
- `componentName`: "StyleTicker"
- `text`: Ticker content (use " • " as separator)
- `speed`: Pixels per frame
- `separator`: Text separator between repeats
- Use for: Breaking news, crypto prices, stock tickers, live updates

### StyleSimulatedHover
Simulates a hover state at a specific frame.
- `componentName`: "StyleSimulatedHover"
- `text`: Button/card text
- `icon`: Iconify icon name (optional)
- `hoverFrame`: Frame when hover starts
- `hoverDuration`: Duration of hover effect in frames
- `variant`: "button" | "card" | "link"
- Use for: Product demos, UI tutorials, interactive-looking buttons

### StyleFakeScroll
Simulates scrolling through a list of items.
- `componentName`: "StyleFakeScroll"
- `items`: (array of objects with: content, subtitle, icon)
- `speed`: Pixels per frame
- `itemHeight`: Height of each item
- `visibleItems`: Number of visible items
- `showScrollbar`: boolean
- Use for: Social media feeds, testimonials, product lists, comments

### StyleCursor
Animated cursor that moves between points and simulates clicks.
- `componentName`: "StyleCursor"
- `points`: (array of objects with: x, y, click (boolean), holdFrames (number))
- `speed`: Movement speed
- `showRipple`: boolean — Show click ripple effect
- Use for: Tutorials, demos, showing user interactions

### StyleBarRace
Horizontal bar race chart where items compete and reorder.
- `componentName`: "StyleBarRace"
- `data`: (array of objects with: label, value, color)
- `barHeight`: Height of each bar
- `gap`: Gap between bars
- `showLabels`: boolean
- `showValues`: boolean
- `duration`: Animation duration in frames
- Use for: Rankings, competitions, "top 10" videos, comparisons

### StyleFunnelChart
A conversion funnel chart with animated stages.
- `componentName`: "StyleFunnelChart"
- `data`: (array of objects with: label, value, color)
- `showLabels`: boolean
- `showValues`: boolean
- `showPercentages`: boolean — Shows conversion rate between stages
- Use for: Conversion funnels, sales pipelines, user journey, drop-off analysis

### StyleRadarChart
A radar/spider chart for multi-dimensional data visualization.
- `componentName`: "StyleRadarChart"
- `data`: (array of objects with: label, value)
- `maxValue`: Maximum value (default 100)
- `showLabels`: boolean
- `showGrid`: boolean — Show concentric grid circles
- `showValues`: boolean — Show values next to labels
- `fillColor`: Fill color with alpha (default "rgba(0, 255, 171, 0.15)")
- `lineColor`: Line color (default "#00FFAB")
- `size`: Chart size in pixels (default 240)
- Use for: Skill comparisons, performance metrics, multi-axis analysis

### Grid Layout
Use `layout: "grid"` for 2D layouts instead of flex.
- `layout`: "grid"
- `gridCols`: number of columns
- `gridRows`: number of rows (auto-calculated if omitted)
- `gap`: spacing between cells
- `justifyContent`: "flex-start" | "center" | "flex-end" — horizontal alignment within cells
- `alignItems`: "flex-start" | "center" | "stretch" — vertical alignment within cells
- Use for: Feature grids, team layouts, comparison tables, card grids

## Componentes Seleccionados para Esta Escena (vector search)
Estos son los componentes más relevantes para el texto y contexto de esta escena:
{selected_component_ref}
{style_component_ref}

## Reglas de Selección de Componentes
1. **NO HAY LÍMITE DE COMPONENTES** — Usa tantos como la escena necesite. Una escena puede tener 1 elemento o 20+.
2. **Los componentes listados arriba** son los más relevantes para esta escena. Úsalos como base.
3. **Si necesitas un componente que no está en la lista**, puedes usar cualquier componente de la Standard Library, pero prioriza los seleccionados.
4. **Íconos libres** — Usa IconifyIcon para representar conceptos visuales. Múltiples íconos por escena están permitidos.
5. **Jerarquía visual** — Usa zIndex, tamaños y posición para crear jerarquía. El elemento más importante debe ser el más prominente.
6. **No sobre-cargar** — Aunque no hay límite, cada componente debe tener un propósito. Evita elementos decorativos sin función.
7. **Combina componentes** usando layout groups (flex/grid) para escenas complejas.

## Ejemplos de Referencia: Composiciones Complejas
Estos ejemplos muestran cómo combinar múltiples componentes usando layout groups:

Ejemplo A - Escena con múltiples botones y texto:
{{
    "background": {{"type": "linear-gradient", "colors": ["#0f172a", "#1e293b"]}},
    "layers": [
      {{
        "type": "group",
        "layout": "flex",
        "direction": "column",
        "alignItems": "center",
        "gap": 30,
        "children": [
          {{"type": "text", "text": "Elige tu plan", "fontSize": 96, "fontWeight": 900}},
          {{
            "type": "group",
            "layout": "flex",
            "direction": "row",
            "gap": 20,
            "children": [
              {{"type": "component", "componentName": "StyleButton", "text": "Básico", "variant": "outline"}},
              {{"type": "component", "componentName": "StyleButton", "text": "Pro", "variant": "primary"}},
              {{"type": "component", "componentName": "StyleButton", "text": "Enterprise", "variant": "outline"}}
            ]
          }},
          {{"type": "component", "componentName": "StyleBadge", "text": "Ahorra 50%", "variant": "success"}}
        ]
      }}
    ]
}}

Ejemplo B - Escena con cards, badges e íconos:
{{
  "background": {{"type": "linear-gradient", "colors": ["#0f172a", "#1e293b"]}},
  "layers": [
    {{
      "type": "group",
      "layout": "grid",
      "gridCols": 2,
      "gap": 24,
      "children": [
        {{
          "type": "group",
          "layout": "flex",
          "direction": "column",
          "gap": 12,
          "children": [
            {{"type": "component", "componentName": "IconifyIcon", "icon": "mdi:rocket-launch", "size": 48}},
            {{"type": "component", "componentName": "StyleCard", "title": "Rápido", "subtitle": "Deploy en segundos"}},
            {{"type": "component", "componentName": "StyleBadge", "text": "NEW", "variant": "info"}}
          ]
        }},
        {{
          "type": "group",
          "layout": "flex",
          "direction": "column",
          "gap": 12,
          "children": [
            {{"type": "component", "componentName": "IconifyIcon", "icon": "mdi:shield-check", "size": 48}},
            {{"type": "component", "componentName": "StyleCard", "title": "Seguro", "subtitle": "SSL incluido"}},
            {{"type": "component", "componentName": "StyleBadge", "text": "POPULAR", "variant": "warning"}}
          ]
        }}
      ]
    }}
  ]
}}

Ejemplo C - Escena data-driven con múltiples elementos:
{{
  "background": {{"type": "linear-gradient", "colors": ["#0f172a", "#1e293b"]}},
  "layers": [
    {{
      "type": "group",
      "layout": "flex",
      "direction": "column",
      "alignItems": "center",
      "gap": 20,
      "children": [
        {{"type": "text", "text": "Resultados del trimestre", "fontSize": 84, "fontWeight": 900}},
        {{"type": "component", "componentName": "StyleBarChart", "data": [{{"label": "Q1", "value": 65}}, {{"label": "Q2", "value": 80}}, {{"label": "Q3", "value": 95}}]}},
        {{
          "type": "group",
          "layout": "flex",
          "direction": "row",
          "gap": 16,
          "children": [
            {{"type": "component", "componentName": "StyleAnimateNumber", "value": 95, "suffix": "%", "prefix": "+"}},
            {{"type": "component", "componentName": "StyleAnimateNumber", "value": 2400, "prefix": "$", "format": "compact"}},
            {{"type": "component", "componentName": "StyleProgressBar", "value": 73, "showLabel": true}}
          ]
        }}
      ]
    }}
  ]
}}

EJEMPLO DE POSICIONAMIENTO SIN GRUPOS (coordenadas absolutas):
Si NO usas grupos flex/grid, CADA layer debe tener x/y diferentes para evitar superposición:
{{
  "layers": [
    {{"type": "component", "componentName": "KineticBackground", "x": 0, "y": 0}},
    {{"type": "component", "componentName": "IconifyIcon", "icon": "mdi:heart", "x": 0, "y": -200}},
    {{"type": "text", "text": "Tu mensaje aquí", "x": 0, "y": 100, "fontSize": 96}},
    {{"type": "component", "componentName": "StyleBadge", "text": "CTA", "x": 0, "y": 300}}
  ]
}}
REGLA: NUNCA pongas todos los layers en x:0, y:0. Distribúyelos verticalmente usando y negativo (arriba), y=0 (centro), y positivo (abajo).

## Improved Spring Physics

All entrance/exit animations now use improved spring physics based on Framer Motion's formula:
- `F = -kx - cv` (Hooke's Law + Damping)
- More natural, organic movement compared to basic springs
- 6 presets available: `gentle`, `default`, `snappy`, `bouncy`, `stiff`, `slow`

### Spring Presets
| Preset | Stiffness | Damping | Mass | Feel |
|---|---|---|---|---|
| gentle | 80 | 12 | 1.2 | Soft, smooth |
| default | 100 | 10 | 1.0 | Balanced |
| snappy | 180 | 12 | 0.8 | Quick, responsive |
| bouncy | 120 | 6 | 0.6 | Playful bounce |
| stiff | 260 | 20 | 0.9 | Firm, precise |
| slow | 60 | 15 | 1.5 | Relaxed, heavy |

## Layout Transitions

When elements change position between scenes, smooth transitions are automatically generated:
- `transitionDuration`: Duration in frames (default: 15)
- `transitionEasing`: "ease-out" | "ease-in-out" | "spring"
- `transitionSpring`: Spring preset name (when easing is "spring")

Transitions are detected automatically when:
- An element's position changes by more than 2px between scenes
- The element has a consistent `id` across scenes

### Example
```json
{{
  "type": "component",
  "componentName": "StyleBadge",
  "id": "badge-1",
  "text": "NEW",
  "x": 540,
  "y": 300,
  "transitionDuration": 20,
  "transitionEasing": "spring",
  "transitionSpring": "bouncy"
}}
```

{positioning_rules}

TRANSICIONES DE SALIDA (out_transition):
Analiza la continuidad entre esta escena y la siguiente (si la hay).
- Si hay un cambio drástico de tema o emoción: usa "ZoomBlurTransition" o "GlitchTransition".
- IMPORTANTE: Usa duration_frames entre 10 y 15 (0.3-0.5 segundos). Transiciones largas (>20 frames) cortan el audio.
- Si hay continuidad visual pero cambio de contenido: usa "WipeTransition" o "LightLeakTransition".
- Si las escenas fluyen naturalmente sin corte brusco: usa "NONE" o "GradientOverlay".

Incluye "out_transition" en tu JSON solo si quieres una transición al final de esta escena.
Ejemplo: "out_transition": {{"type": "ZoomBlurTransition", "duration_frames": 15}}

Ejemplo de estructura JSON esperada:
{{
  "background": {{
    "type": "linear-gradient",
    "colors": ["#0f172a", "#1e293b"]
  }},
  "layers": [
    {{
      "type": "component",
      "componentName": "FloatingBlobs",
      "color": "#3b82f6",
      "count": 8,
      "x": 0,
      "y": 0
    }},
    {{
      "type": "component",
      "componentName": "TextReveal",
      "text": "{{text}}",
      "fontSize": 48,
      "color": "#ffffff",
      "animation": "slide_up",
      "x": 0,
      "y": 100
    }}
  ]
}}

ANIMACIONES DE ENTRADA (entry):
Usa la propiedad `entry` para animaciones de entrada simples. Valores válidos:
- "fade-in": aparece gradualmente
- "slide-up": entra desde abajo hacia arriba
- "slide-down": entra desde arriba hacia abajo
- "slide-left": entra desde la derecha hacia la izquierda
- "slide-right": entra desde la izquierda hacia la derecha
- "scale-in": aparece con efecto de escala
- "spring-in": aparece con efecto de resorte
- "bounce-in": aparece con efecto de rebote
Opcionalmente agrega `entryDelay` (en segundos) para retrasar la animación.
Ejemplo: `"entry": "slide-up", "entryDelay": 0.5`
{exit_instructions}
IMPORTANTE:
- Si un componente necesita propiedades adicionales (como speed, color, textColor, url, x, y), pásalas directamente como propiedades de la capa, en el mismo nivel que "type" y "componentName". La propiedad "props" NO existe.
DEVUELVE SOLO JSON VALIDO, SIN MARKDOWN."""


# ── Función principal ────────────────────────────────────────────────────────

def generate_scene_composer(
    text: str,
    media_query: str,
    available_components: list[dict] | None = None,
    api_key: str = "",
    model: str = "gemini-2.0-flash",
    db: Optional[Session] = None,
    aspect_ratio: str = "9:16",
    composition_version: str = "v2",
    duration_seconds: float = 0.0,
    suggested_bg_color: Optional[str] = None,
    suggested_text_color: Optional[str] = None,
) -> AnimaComposerSpec:
    """
    Pregunta al LLM por la composición AnimaComposer (JSON) de la escena.

    composition_version: "v1" = legacy (primitivas permitidas),
                         "v2" = component-only (default)
    """
    if db is not None:
        # Use intelligent vector search with diversity quotas
        from app.services.embedding import get_relevant_components
        relevant = get_relevant_components(db, text, media_query, top_k=15)
        components = relevant  # Already list[dict] from _format_component
        component_names = [c["name"] for c in relevant]
        logger.info("Vector search returned %d relevant components: %s", len(component_names), component_names[:5])
    else:
        # Fallback to hardcoded list (for tests/backward compat)
        fallback = available_components or [{"name": n, "role": "general", "category": "general", "description": ""} for n in AVAILABLE_COMPONENTS]
        components = fallback

    # Buscar iconos relevantes para la escena
    icon_candidates = []
    try:
        icon_candidates = find_best_icons(db, text, limit=5)
        logger.info("Found %d relevant icons for scene", len(icon_candidates))
    except Exception as e:
        logger.warning("Icon search failed, continuing without icons: %s", e)

    prompt = _build_strategy_prompt(text, media_query, components, aspect_ratio, icon_candidates, duration_seconds,
        suggested_bg_color=suggested_bg_color,
        suggested_text_color=suggested_text_color,
    )

    # Fallback default si hay error
    default_fallback = AnimaComposerSpec(
        background=AnimaBackground(type="radial-gradient", colors=["#1a1a2e", "#16213e"]),
        layers=[
            AnimaLayer(
                type="rect",
                width=300,
                height=4,
                fill="#e94560",
                x=0,
                y=-60,
                entry="slide-right",
                entryDelay=0.2
            ),
            AnimaLayer(
                type="text",
                text="{{text}}",
                fontSize=48,
                color="#ffffff",
                x=0,
                y=60,
                textAlign="center",
                entry="slide-up",
                entryDelay=0.5
            )
        ]
    )

    if not api_key:
        logger.warning("No API key provided. Defaulting to fallback.")
        return default_fallback

    # Retry up to 2 times if response is corrupted
    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            from app.modules.llm.client import _call_llm_sync
            client = genai.Client(api_key=api_key)

            gemini_schema = {
                "type": "OBJECT",
                "properties": {
                    "version": {"type": "STRING"},
                    "background": {
                        "type": "OBJECT",
                        "properties": {
                            "type": {"type": "STRING"},
                            "colors": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "angle": {"type": "NUMBER"},
                            "center": {"type": "ARRAY", "items": {"type": "NUMBER"}}
                        },
                        "required": ["type", "colors"]
                    },
                    "layers": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "id": {"type": "STRING"},
                                "type": {"type": "STRING"},
                                "componentName": {"type": "STRING"},
                                "x": {"type": "NUMBER", "minimum": -1000, "maximum": 1000},
                                "y": {"type": "NUMBER", "minimum": -1000, "maximum": 1000},
                                "scale": {"type": "NUMBER", "minimum": 0.1, "maximum": 10},
                                "rotation": {"type": "NUMBER", "minimum": -360, "maximum": 360},
                                "opacity": {"type": "NUMBER", "minimum": 0, "maximum": 1},
                                "width": {"type": "NUMBER", "minimum": 10, "maximum": 1920},
                                "height": {"type": "NUMBER", "minimum": 10, "maximum": 1920},
                                "borderRadius": {"type": "NUMBER", "minimum": 0, "maximum": 500},
                                "fill": {"type": "STRING"},
                                "stroke": {"type": "STRING"},
                                "strokeWidth": {"type": "NUMBER", "minimum": 0, "maximum": 20},
                                "r": {"type": "NUMBER", "minimum": 5, "maximum": 500},
                                "pathData": {"type": "STRING"},
                                "text": {"type": "STRING"},
                                "fontSize": {"type": "NUMBER", "minimum": 12, "maximum": 250},
                                "fontWeight": {"type": "NUMBER", "minimum": 100, "maximum": 900},
                                "letterSpacing": {"type": "NUMBER", "minimum": -10, "maximum": 20},
                                "textAlign": {"type": "STRING"},
                                "src": {"type": "STRING"},
                                "fit": {"type": "STRING"},
                                "count": {"type": "INTEGER", "minimum": 1, "maximum": 200},
                                "shape": {"type": "STRING"},
                                "spread": {"type": "NUMBER", "minimum": 0, "maximum": 500},
                                "colors": {"type": "ARRAY", "items": {"type": "STRING"}},
                                "entry": {"type": "STRING"},
                                "entryDelay": {"type": "NUMBER", "minimum": 0, "maximum": 10},
                                "filter": {"type": "STRING"},
                                "color": {"type": "STRING"},
                                "color1": {"type": "STRING"},
                                "color2": {"type": "STRING"},
                                "bgColor": {"type": "STRING"},
                                "textColor": {"type": "STRING"},
                                "speed": {"type": "NUMBER", "minimum": 0.01, "maximum": 10},
                                "delay": {"type": "NUMBER", "minimum": 0, "maximum": 10},
                                "intensity": {"type": "NUMBER", "minimum": 0, "maximum": 1},
                                "theme": {"type": "STRING"},
                                "url": {"type": "STRING"},
                                "query": {"type": "STRING"},
                                "animation": {"type": "STRING"},
                                "lineWidth": {"type": "INTEGER", "minimum": 0, "maximum": 20},
                                "icon": {"type": "STRING"},
                                "variant": {"type": "STRING"},
                                "title": {"type": "STRING"},
                                "subtitle": {"type": "STRING"},
                                "data": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "label": {"type": "STRING"},
                                            "value": {"type": "NUMBER"},
                                            "color": {"type": "STRING"}
                                        }
                                    }
                                },
                                "value": {"type": "NUMBER"},
                                "max": {"type": "NUMBER"},
                                "size": {"type": "STRING"},
                                "prefix": {"type": "STRING"},
                                "suffix": {"type": "STRING"},
                                "format": {"type": "STRING"},
                                "items": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "label": {"type": "STRING"},
                                            "value": {"type": "STRING"},
                                            "icon": {"type": "STRING"}
                                        }
                                    }
                                },
                                "points": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "label": {"type": "STRING"},
                                            "value": {"type": "NUMBER"}
                                        }
                                    }
                                },
                                "maxLines": {"type": "INTEGER", "minimum": 1, "maximum": 10},
                                "showLabel": {"type": "BOOLEAN"},
                                "showLabels": {"type": "BOOLEAN"},
                                "showValues": {"type": "BOOLEAN"},
                                "showGrid": {"type": "BOOLEAN"},
                                "showDots": {"type": "BOOLEAN"},
                                "lineColor": {"type": "STRING"},
                                "fillArea": {"type": "BOOLEAN"},
                                "decimals": {"type": "INTEGER", "minimum": 0, "maximum": 4},
                                "characters": {"type": "STRING"},
                                "loop": {"type": "BOOLEAN"},
                                "separator": {"type": "STRING"},
                                "barHeight": {"type": "NUMBER"},
                                "gap": {"type": "NUMBER"},
                                "visibleItems": {"type": "INTEGER", "minimum": 1, "maximum": 20},
                                "showScrollbar": {"type": "BOOLEAN"},
                                "showRipple": {"type": "BOOLEAN"},
                                "showPercentages": {"type": "BOOLEAN"},
                                "maxValue": {"type": "NUMBER"},
                                "explodeSlice": {"type": "INTEGER"},
                                "autoplay": {"type": "BOOLEAN"},
                                "muted": {"type": "BOOLEAN"},
                                "name": {"type": "STRING"},
                                "orientation": {"type": "STRING"},
                                "thickness": {"type": "NUMBER"},
                                "deletable": {"type": "BOOLEAN"},
                                "labelPosition": {"type": "STRING"},
                                "iconPosition": {"type": "STRING"},
                                "showBadge": {"type": "BOOLEAN"},
                                "badgeText": {"type": "STRING"},
                                "from": {"type": "NUMBER"},
                                "duration": {"type": "NUMBER"},
                            },
                            "required": ["type", "x", "y"]
                        }
                    },
                    "out_transition": {
                        "type": "OBJECT",
                        "nullable": True,
                        "properties": {
                            "type": {
                                "type": "STRING",
                                "enum": ["ZoomBlurTransition", "WipeTransition", "LightLeakTransition", "GlitchTransition", "GradientOverlay", "NONE"]
                            },
                            "duration_frames": {"type": "INTEGER"},
                            "target_scene": {"type": "STRING", "nullable": True}
                        },
                        "required": ["type"]
                    }
                },
                "required": ["background", "layers"]
            }

            response = _call_llm_sync(
                client=client,
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=gemini_schema,
                    temperature=0.3,
                    max_output_tokens=6000,  # Increased from 4000 to accommodate new props
                ),
                label="LLM Component Strategy"
            )

            raw_text = response.text if response.text else "(empty)"
            logger.info(
                "RAW Gemini response for scene composer (%d chars): %s",
                len(raw_text),
                raw_text[:1500],
            )

            # Reject corrupted responses
            if len(raw_text) > 10000:
                logger.warning("Response too long (%d chars), likely corrupted. Attempt %d/%d.", len(raw_text), attempt + 1, max_retries + 1)
                if attempt < max_retries:
                    continue  # Retry
                return default_fallback

            result = response.parsed

            if result is not None:
                result_str = str(result)
                logger.info(
                    "Parsed result type: %s, length: %d, preview: %s",
                    type(result).__name__,
                    len(result_str),
                    result_str[:1500],
                )
            else:
                logger.warning("response.parsed is None. Attempt %d/%d.", attempt + 1, max_retries + 1)
                if attempt < max_retries:
                    continue  # Retry
                logger.warning("All retries failed. Defaulting to fallback.")
                return default_fallback

            logger.info("Generated AnimaComposerSpec for scene.")
            try:
                if isinstance(result, str):
                    result = _sanitize_llm_json(result)
                    result = json.loads(result)
                if isinstance(result, dict):
                    # Post-processing: Sanitize invalid icon values
                    for layer in result.get("layers", []):
                        icon = layer.get("icon")
                        if icon and isinstance(icon, str) and icon.lower().strip() in ("none", "null", "undefined", "", "n/a"):
                            del layer["icon"]
                            logger.info("Removed invalid icon value: '%s'", icon)

                    # ── Fase 1.1: Fix 'items' → 'children' in groups ──
                    LAYOUT_HINT_VALUES = {"center", "left", "right", "top", "bottom", "start", "end", "stretch", "flex-start", "flex-end", "space-between", "space-around"}
                    scene_text = text  # Available from function parameter scope

                    for layer in result.get("layers", []):
                        if layer.get("type") == "group" and "items" in layer and "children" not in layer:
                            items = layer.pop("items")
                            if isinstance(items, list):
                                children = []
                                for item in items:
                                    if isinstance(item, dict):
                                        # Icon items
                                        if "icon" in item:
                                            children.append({
                                                "type": "component",
                                                "componentName": "IconifyIcon",
                                                "icon": item["icon"],
                                                "x": 0, "y": 0,
                                                "size": item.get("size", 64),
                                            })
                                        # Text items — but filter out layout hints and duplicates
                                        elif "text" in item:
                                            text_val = item["text"]
                                            if text_val and len(text_val) > 5:
                                                children.append({
                                                    "type": "text",
                                                    "text": text_val,
                                                    "x": 0, "y": 0,
                                                    "fontSize": item.get("fontSize", 48),
                                                })
                                        elif "label" in item or "value" in item:
                                            value = item.get("value", item.get("label", ""))
                                            # Skip layout hints
                                            if isinstance(value, str) and value.strip().lower() in LAYOUT_HINT_VALUES:
                                                # Apply as alignment hint to the group
                                                if "alignItems" not in layer:
                                                    layer["alignItems"] = value.strip().lower()
                                                continue
                                            # Skip if value matches scene text (duplicate)
                                            if value and scene_text and value.strip() == scene_text.strip():
                                                continue
                                            # Only add as text child if it's meaningful content
                                            if value and len(value) > 5:
                                                children.append({
                                                    "type": "text",
                                                    "text": value,
                                                    "x": 0, "y": 0,
                                                    "fontSize": 48,
                                                })
                                layer["children"] = children if children else []
                                if "orientation" not in layer and "layout" not in layer:
                                    layer["layout"] = "flex"
                                    layer["direction"] = "column"
                                    layer["alignItems"] = layer.get("alignItems", "center")
                                if "gap" not in layer:
                                    layer["gap"] = 20
                            logger.info(
                                "Sanitized group: converted 'items' (%d) to 'children' (%d)",
                                len(items) if isinstance(items, list) else 0,
                                len(layer.get("children", [])),
                            )

                    # ── Fase 1.2: Fix type: "text" with componentName → type: "component" ──
                    for layer in result.get("layers", []):
                        if layer.get("type") == "text" and layer.get("componentName"):
                            original_type = layer["type"]
                            layer["type"] = "component"
                            logger.info(
                                "Fixed type conflict: '%s' → 'component' for componentName: %s",
                                original_type,
                                layer.get("componentName"),
                            )

                    # ── Fase 1.3: Deduplicate text across layers ──
                    seen_texts: set[str] = set()
                    layers_to_remove: list[int] = []
                    for i, layer in enumerate(result.get("layers", [])):
                        text = layer.get("text", "")
                        if text and len(text) > 10:
                            text_normalized = text.strip().lower()
                            if text_normalized in seen_texts:
                                layers_to_remove.append(i)
                                logger.info(
                                    "Removing duplicate text layer [%d]: '%s...'",
                                    i,
                                    text[:50],
                                )
                            else:
                                seen_texts.add(text_normalized)

                    for layer in result.get("layers", []):
                        if layer.get("type") == "group" and layer.get("children"):
                            group_seen: set[str] = set()
                            group_children = layer["children"]
                            children_to_remove: list[int] = []
                            for j, child in enumerate(group_children):
                                child_text = child.get("text", "")
                                if child_text and len(child_text) > 10:
                                    child_norm = child_text.strip().lower()
                                    if child_norm in seen_texts or child_norm in group_seen:
                                        children_to_remove.append(j)
                                    else:
                                        group_seen.add(child_norm)
                                        seen_texts.add(child_norm)
                            for j in reversed(children_to_remove):
                                group_children.pop(j)

                    for i in reversed(layers_to_remove):
                        result["layers"].pop(i)

                    # ── Fase 1.4: Normalize string numbers to actual numbers ──
                    NUMERIC_KEYS = {"width", "height", "fontSize", "strokeWidth", "gap",
                                    "speed", "delay", "borderRadius", "letterSpacing", "glowIntensity"}
                    # Note: "size" removed — it's handled by Pydantic validator

                    for layer in result.get("layers", []):
                        for key in NUMERIC_KEYS:
                            if key in layer:
                                original = layer[key]
                                layer[key] = _coerce_number(original)
                                if original != layer[key]:
                                    logger.info(
                                        "Normalized %s: '%s' (str) → %s (%s)",
                                        key, original, layer[key], type(layer[key]).__name__,
                                    )
                        for child in layer.get("children", []):
                            for key in NUMERIC_KEYS:
                                if key in child:
                                    child[key] = _coerce_number(child[key])

                    # ── Fase 1.5: Remove garbage props from text components ──
                    TEXT_COMPONENTS_GARBAGE = {"Typewriter", "TextReveal", "StyleTextBlock", "StyleScrambleText"}
                    GARBAGE_PROPS = {
                        "showScrollbar", "showRipple", "showPercentages", "autoplay", "muted",
                        "deletable", "showBadge", "from", "duration", "fillArea", "orientation",
                        "thickness", "labelPosition", "iconPosition", "badgeText", "showLabel",
                        "showLabels", "showValues", "showGrid", "showDots", "decimals",
                        "separator", "barHeight", "visibleItems", "loop", "characters",
                    }

                    for layer in result.get("layers", []):
                        comp = layer.get("componentName", "")
                        if comp in TEXT_COMPONENTS_GARBAGE:
                            removed = []
                            for prop in GARBAGE_PROPS:
                                if prop in layer:
                                    del layer[prop]
                                    removed.append(prop)
                            if removed:
                                logger.info(
                                    "Removed %d garbage props from %s: %s",
                                    len(removed), comp, removed,
                                )

                    # ── Fase 4.1: Validate component names against registry ──
                    VALID_COMPONENTS = set(AVAILABLE_COMPONENTS)
                    FALLBACK_COMPONENTS = {
                        "RippleEffect": "ParticleField",
                        "GlowOrb": "FloatingBlobs",
                        "NeonText": "TextReveal",
                        "GradientMesh": "AbstractWave",
                    }

                    for layer in result.get("layers", []):
                        comp = layer.get("componentName", "")
                        if comp and comp not in VALID_COMPONENTS:
                            fallback = FALLBACK_COMPONENTS.get(comp)
                            if fallback:
                                logger.info("Replaced unknown component '%s' → '%s'", comp, fallback)
                                layer["componentName"] = fallback
                            else:
                                logger.warning("Unknown component '%s' — marking for removal", comp)
                                layer["_remove"] = True

                    result["layers"] = [l for l in result.get("layers", []) if not l.get("_remove")]

                    # Also validate children in groups
                    for layer in result.get("layers", []):
                        for child in layer.get("children", []):
                            comp = child.get("componentName", "")
                            if comp and comp not in VALID_COMPONENTS:
                                fallback = FALLBACK_COMPONENTS.get(comp)
                                if fallback:
                                    logger.info("Replaced unknown child component '%s' → '%s'", comp, fallback)
                                    child["componentName"] = fallback
                                else:
                                    child["_remove"] = True
                        layer["children"] = [c for c in layer.get("children", []) if not c.get("_remove")]

                    # ── Fase 2.4: Auto-fit text fontSize based on text length and canvas width ──
                    canvas_w, canvas_h = _get_canvas_dimensions(aspect_ratio)
                    max_text_width = canvas_w * 0.85

                    TEXT_LAYER_TYPES = {"text", "component"}
                    TEXT_COMPONENT_NAMES = {"Typewriter", "TextReveal", "StyleTextBlock", "StyleScrambleText"}

                    def _auto_fit_layer_text(layer: dict, max_width: float, canvas_height: float) -> None:
                        """Scale down fontSize if text is estimated to overflow, accounting for line wrapping."""
                        text = layer.get("text", "")
                        font_size = layer.get("fontSize")
                        if not text or not font_size or not isinstance(font_size, (int, float)):
                            return

                        # Multi-line estimation (matching frontend fitText.ts)
                        min_font_size = 48  # Minimum readable size for mobile video
                        max_font_size = font_size
                        best_font_size = min_font_size
                        char_width_ratio = 0.6  # Bold font
                        line_height = 1.3
                        max_text_height = canvas_height * 0.6  # Text can use 60% of canvas height

                        low = min_font_size
                        high = max_font_size
                        while low <= high:
                            mid = (low + high) // 2
                            char_width = mid * char_width_ratio
                            chars_per_line = max(1, int(max_width / char_width))
                            line_count = math.ceil(len(text) / chars_per_line)
                            total_height = line_count * mid * line_height

                            if total_height <= max_text_height and chars_per_line >= 3:
                                best_font_size = mid
                                low = mid + 1
                            else:
                                high = mid - 1

                        if best_font_size < font_size:
                            logger.info(
                                "Auto-fit fontSize: %d → %d for text length %d chars "
                                "(multi-line fit: %d lines at %dpx width)",
                                font_size, best_font_size, len(text),
                                math.ceil(len(text) / max(1, int(max_width / (best_font_size * char_width_ratio)))),
                                int(max_width),
                            )
                            layer["fontSize"] = best_font_size

                    for layer in result.get("layers", []):
                        layer_type = layer.get("type", "")
                        comp_name = layer.get("componentName", "")

                        if layer_type == "text" or (layer_type == "component" and comp_name in TEXT_COMPONENT_NAMES):
                            _auto_fit_layer_text(layer, max_text_width, canvas_h)

                        for child in layer.get("children", []):
                            child_type = child.get("type", "")
                            child_comp = child.get("componentName", "")
                            if child_type == "text" or (child_type == "component" and child_comp in TEXT_COMPONENT_NAMES):
                                child_max_width = max_text_width * 0.8
                                _auto_fit_layer_text(child, child_max_width, canvas_h)

                    # ── Fase 3.1: Assign default width for text components ──
                    COMPONENT_DEFAULT_WIDTHS = {
                        "Typewriter": lambda cw: int(cw * 0.85),
                        "TextReveal": lambda cw: int(cw * 0.85),
                        "StyleTextBlock": lambda cw: int(cw * 0.85),
                        "StyleScrambleText": lambda cw: int(cw * 0.85),
                        "SubscribeButton": lambda cw: int(cw * 0.6),
                        "IconifyIcon": lambda cw: 120,
                    }

                    for layer in result.get("layers", []):
                        comp = layer.get("componentName", "")
                        if comp in COMPONENT_DEFAULT_WIDTHS and "width" not in layer:
                            layer["width"] = COMPONENT_DEFAULT_WIDTHS[comp](canvas_w)
                            logger.info(
                                "Assigned default width %d for %s (canvas: %dpx)",
                                layer["width"], comp, canvas_w,
                            )

                    # Post-processing: Remove groups with no children
                    result["layers"] = [
                        layer for layer in result.get("layers", [])
                        if not (layer.get("type") == "group" and not layer.get("children"))
                    ]

                    for layer in result.get("layers", []):
                        if "lineWidth" in layer and isinstance(layer["lineWidth"], (int, float)):
                            layer["lineWidth"] = round(float(layer["lineWidth"]), 2)

                    # Post-processing: Normalize paths, apply smart layout, and clamp coordinates
                    width, height = _get_canvas_dimensions(aspect_ratio)
                    result = _normalize_paths(result, width, height)
                    result = _apply_smart_layout(result)
                    result = _clamp_coordinates(result, width, height)

                    # Post-validation 1: Ensure exit animations on non-background layers
                    for layer in result.get("layers", []):
                        is_bg = (
                            layer.get("type") == "component"
                            and layer.get("componentName") == "KineticBackground"
                        )
                        if not is_bg and "exit" not in layer:
                            layer["exit"] = "fade-out"
                            layer["exitDelay"] = 0.3
                            layer["exitDuration"] = 0.5
                            logger.info(
                                "Added default exit animation to layer: %s",
                                layer.get("componentName", layer.get("type")),
                            )

                    # Post-validation 2: Remove duplicate icons ONLY if they're at the same position (overlap)
                    icon_positions: dict[str, list[tuple]] = {}
                    layers_to_remove: list[int] = []
                    for i, layer in enumerate(result.get("layers", [])):
                        icon = layer.get("icon")
                        if icon:
                            pos = (layer.get("x", 0), layer.get("y", 0))
                            icon_positions.setdefault(icon, []).append((i, pos))

                    for icon, occurrences in icon_positions.items():
                        if len(occurrences) > 1:
                            # Check if any are at the same position (overlap)
                            seen_positions = {}
                            for idx, pos in occurrences:
                                if pos in seen_positions:
                                    layers_to_remove.append(idx)
                                    logger.info(
                                        "Removing overlapping icon '%s' at position %s (duplicate)",
                                        icon, pos,
                                    )
                                else:
                                    seen_positions[pos] = idx

                    for i in reversed(layers_to_remove):
                        result["layers"].pop(i)

                    # Post-validation 3: Smart redistribution of overlapping layers
                    non_bg_layers = [
                        l for l in result.get("layers", [])
                        if not (l.get("type") == "component" and l.get("componentName") == "KineticBackground")
                    ]

                    if len(non_bg_layers) > 1:
                        positions = set()
                        for l in non_bg_layers:
                            positions.add((l.get("x", 0), l.get("y", 0)))

                        if len(positions) <= 1:
                            # All layers at same position — distribute intelligently
                            canvas_w, canvas_h = _get_canvas_dimensions(aspect_ratio)

                            # Categorize layers by role
                            decorative = []  # Background effects, particles
                            text_layers = []  # Main text components
                            ui_layers = []     # Buttons, badges, CTAs
                            icon_layers = [] # Icons

                            for layer in non_bg_layers:
                                comp = layer.get("componentName", "")
                                if comp in ("ParticleField", "FloatingBlobs", "RaysOfLight", "AbstractWave", "GlobalVFX"):
                                    decorative.append(layer)
                                elif comp in ("Typewriter", "TextReveal", "StyleTextBlock", "StyleScrambleText") or layer.get("type") == "text":
                                    text_layers.append(layer)
                                elif comp in ("SubscribeButton", "StyleButton", "CTABanner", "SocialProgressBar"):
                                    ui_layers.append(layer)
                                elif comp in ("IconifyIcon", "AnimatedIcon"):
                                    icon_layers.append(layer)
                                else:
                                    decorative.append(layer)

                            # Position decorative layers at full canvas (they fill the background)
                            for layer in decorative:
                                layer["x"] = 0
                                layer["y"] = 0

                            # Position text layers in the center zone
                            text_zone_top = int(-canvas_h * 0.15)
                            text_spacing = 250
                            for i, layer in enumerate(text_layers):
                                layer["x"] = 0
                                layer["y"] = text_zone_top + (i * text_spacing)

                            # Position icons above text
                            icon_zone_top = int(-canvas_h * 0.3)
                            for i, layer in enumerate(icon_layers):
                                layer["x"] = (i - len(icon_layers) // 2) * 150
                                layer["y"] = icon_zone_top

                            # Position UI layers at bottom
                            ui_zone_y = int(canvas_h * 0.35)
                            for i, layer in enumerate(ui_layers):
                                layer["x"] = 0
                                layer["y"] = ui_zone_y + (i * 120)

                            logger.info(
                                "Smart redistributed %d layers: %d decorative, %d text, %d icons, %d UI",
                                len(non_bg_layers), len(decorative), len(text_layers), len(icon_layers), len(ui_layers),
                            )

                    # Final validation pass — catch anything missed by post-processing
                    result = validate_and_fix(result, aspect_ratio)

                    return AnimaComposerSpec(**result)
                else:
                    return AnimaComposerSpec.model_validate(result)
            except Exception as parse_error:
                logger.warning("Pydantic parse failed: %s. Attempt %d/%d.", parse_error, attempt + 1, max_retries + 1)
                if attempt < max_retries:
                    continue  # Retry
                return default_fallback

        except Exception as e:
            logger.warning(
                "Error en strategy decision: %s. Attempt %d/%d.",
                str(e)[:100], attempt + 1, max_retries + 1,
            )
            if attempt < max_retries:
                continue
            return default_fallback

    return default_fallback
