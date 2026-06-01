"""
Estrategia de generacion de componentes: genera un JSON AnimaComposer.

El LLM evalúa cada escena y decide cómo animarla usando exclusivamente
componentes de la Standard Library.
Todo se retorna como un AnimaComposerSpec válido.
"""
import json
import re
from typing import Any, Optional
from sqlalchemy.orm import Session
from google import genai
from google.genai import types
from app.core.logging import get_logger
from app.schemas.spec import AnimaComposerSpec, AnimaBackground, AnimaLayer
from app.services.iconify_search import find_best_icons

logger = get_logger("llm.strategy")


def _sanitize_llm_json(raw: str) -> str:
    """Truncate numbers with excessive decimal places from LLM output."""
    return re.sub(r'(\d+\.\d{6})\d+', r'\1', raw)


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
- Máximo 1 ícono por escena. Si ningún ícono es relevante para el sujeto del texto, NO incluyas ningún ícono.
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
    max_font_size = int(min(width, height) * 0.06)  # 6% of smallest dimension
    
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
ANIMACIONES DE SALIDA (exit):
CADA capa debe tener una animación de salida para transiciones suaves entre escenas.
Usa la propiedad `exit` para animaciones de salida. Valores válidos:
- "fade-out": desaparece gradualmente
- "slide-up": sale hacia arriba
- "slide-down": sale hacia abajo
- "slide-left": sale hacia la izquierda
- "slide-right": sale hacia la derecha
- "scale-out": desaparece con efecto de escala
- "bounce-out": sale con efecto de rebote

Las animaciones de salida deben empezar en el frame {exit_start_frame} (último 25% de la escena).
El background debe mantener su color durante toda la escena (no necesita exit).

Ejemplo: "exit": "fade-out"
"""

    return f"""Eres el director de escena de AnimaFlow. Tu trabajo es diseñar la composición de UNA escena de video devolviendo un JSON AnimaComposerSpec.

TEXTO DE LA ESCENA: "{text}"
DESCRIPCION VISUAL: "{media_query}"
{timing_context}
PASO 1 - IDENTIFICA EL SUJETO: Lee el texto y la descripción visual. ¿Cuál es el objeto/sujeto/tema principal de esta escena? (ej: un perro, una manzana, el dinero, un corazón, un planeta, etc.)

PASO 2 - SELECCIONA COMPONENTES: Elige 2-4 componentes de la lista disponible que mejor representen visualmente el sujeto y el mensaje de la escena. Combina componentes de diferentes roles (background + text + decorative/ui) para crear una composición rica y profesional.

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

{layout_section}

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
- `boxShadow`: {x, y, blur, spread, color} — Drop shadow
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
- `textShadow`: {x, y, blur, color} — Text shadow
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
- `data`: [{ label, value, color }]
- `variant`: "vertical" | "horizontal"
- `showLabels`: boolean
- `showValues`: boolean
- Use for: Comparisons, monthly data, rankings

### StyleLineChart
An animated line chart with dots and grid.
- `componentName`: "StyleLineChart"
- `data`: [{ x, y }]
- `showDots`: boolean
- `showGrid`: boolean
- `showLabels`: boolean
- `lineColor`: string
- `fillArea`: boolean
- Use for: Trends, growth, time series

### StylePieChart
An animated pie/donut chart.
- `componentName`: "StylePieChart"
- `data`: [{ label, value, color }]
- `variant`: "pie" | "donut"
- `showLabels`: boolean
- `showValues`: boolean
- `explodeSlice`: index of slice to explode (optional)
- Use for: Percentages, distribution, market share

### Grid Layout
Use `layout: "grid"` for 2D layouts instead of flex.
- `layout`: "grid"
- `gridCols`: number of columns
- `gridRows`: number of rows (auto-calculated if omitted)
- `gap`: spacing between cells
- `justifyContent`: "flex-start" | "center" | "flex-end" — horizontal alignment within cells
- `alignItems`: "flex-start" | "center" | "stretch" — vertical alignment within cells
- Use for: Feature grids, team layouts, comparison tables, card grids

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
    "type": "gradient",
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
    db: Optional[Session] = None,  # NEW: SQLAlchemy session for vector search
    aspect_ratio: str = "9:16",
    composition_version: str = "v2",
    duration_seconds: float = 0.0,
) -> AnimaComposerSpec:
    """
    Pregunta al LLM por la composición AnimaComposer (JSON) de la escena.

    composition_version: "v1" = legacy (primitivas permitidas),
                         "v2" = component-only (default)
    """
    if db is not None:
        # Use intelligent vector search with diversity quotas
        from app.services.embedding import get_relevant_components
        relevant = get_relevant_components(db, text, media_query, top_k=10)
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

    prompt = _build_strategy_prompt(text, media_query, components, aspect_ratio, icon_candidates, duration_seconds)

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
                                "fontSize": {"type": "NUMBER", "minimum": 12, "maximum": 120},
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
                                "icon": {"type": "STRING"}
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
                    max_output_tokens=4000,
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
                    for layer in result.get("layers", []):
                        if "lineWidth" in layer and isinstance(layer["lineWidth"], (int, float)):
                            layer["lineWidth"] = round(float(layer["lineWidth"]), 2)

                    # Post-processing: Normalize paths, apply smart layout, and clamp coordinates
                    width, height = _get_canvas_dimensions(aspect_ratio)
                    result = _normalize_paths(result, width, height)
                    result = _apply_smart_layout(result)
                    result = _clamp_coordinates(result, width, height)

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
