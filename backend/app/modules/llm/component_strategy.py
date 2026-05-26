"""
Estrategia de generacion de componentes: genera un JSON AnimaComposer.

El LLM evalúa cada escena y decide cómo animarla usando una combinación
de componentes de la Standard Library y primitivas básicas.
Todo se retorna como un AnimaComposerSpec válido.
"""
import json
import re
from typing import Any
from google import genai
from google.genai import types
from app.core.logging import get_logger
from app.schemas.spec import AnimaComposerSpec, AnimaBackground, AnimaLayer

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
        names = ", ".join([c["name"] for c in comps])
        components_list_parts.append(f"{emoji} {role_title}: {names}")

    components_list = "\n".join(components_list_parts)

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

    positioning_rules = f"""REGLAS DE POSICIONAMIENTO (CANVAS {width}x{height}, formato {aspect_ratio}):
- El centro del canvas es (0, 0). Los bordes son aproximadamente x: ±{half_w}, y: ±{half_h}.
- Para centrar un elemento: usa x: 0, y: 0.
- Para texto principal: usa y: {int(-half_h * 0.2)} a y: {int(half_h * 0.2)} (zona central, legible).
- Para elementos decorativos: distribúyelos en y: {int(-half_h * 0.6)} a y: {int(half_h * 0.6)}, x: {int(-half_w * 0.5)} a x: {int(half_w * 0.5)}.
- **CRÍTICO PARA PATHS SVG:** Las coordenadas dentro de `pathData` son PÍXELES ABSOLUTOS del canvas.
  - El centro del canvas es ({width // 2}, {height // 2}).
  - Si quieres un círculo en el centro, el path debe empezar cerca de M {width // 2}, {height // 2}.
  - M 100,100 dibuja en la esquina superior izquierda (invisible o cortado).
  - Usa coordenadas grandes: M 400,800 es mejor que M 50,50.
- Para círculos: r: {int(min(width, height) * 0.1)} a r: {int(min(width, height) * 0.3)} es visible.
- Para rects: width: {int(width * 0.2)}-{int(width * 0.8)}, height: {int(height * 0.01)}-{int(height * 0.15)}.
- Usa transform: "translate(x, y)" o las propiedades x/y del layer para posicionar.
{text_safe_zone}
"""

    return f"""Eres el director de escena de AnimaFlow. Tu trabajo es diseñar la composición de UNA escena de video devolviendo un JSON AnimaComposerSpec.

TEXTO DE LA ESCENA: "{text}"
DESCRIPCION VISUAL: "{media_query}"

PASO 1 - IDENTIFICA EL SUJETO: Lee el texto y la descripción visual. ¿Cuál es el objeto/sujeto/tema principal de esta escena? (ej: un perro, una manzana, el dinero, un corazón, un planeta, etc.)

PASO 2 - CREA UNA FORMA CUSTOM: Basándote en el sujeto identificado, crea AL MENOS UNA primitiva custom (usando type: "circle", "rect", "path", o "group") que represente visualmente ese sujeto. Piensa en formas simples pero reconocibles:
- Si es un animal: usa círculos para huellas, paths para siluetas
- Si es un objeto: usa rects y circles para su forma básica
- Si es un concepto abstracto: usa formas geométricas que lo evoquen (flechas para progreso, círculos concéntricos para impacto, etc.)
- Si es un alimento: usa formas orgánicas con paths curvos
- Si es tecnología: usa líneas rectas, grids, círculos con radios

No necesitas que sea perfecto, pero debe ser RECONOCIBLE y temáticamente relevante.

Tienes acceso a primitivas básicas (rect, circle, image) y a componentes complejos de nuestra Standard Library.
COMPONENTES DISPONIBLES PARA ESTA ESCENA (organizados por rol):
{components_list}

INSTRUCCIONES:
Debes generar un JSON válido que describa el 'background' y una lista de 'layers'.
Puedes usar componentes de la lista anterior usando type: "component" y componentName: "NOMBRE_EXACTO".

REGLAS DE ORO PARA EL DISEÑO:
1. **CREA DESDE CERO CON PRIMITIVAS:** No te limites solo a componentes prefabricados. Si la escena requiere algo único (como un marco, un contenedor de texto, o un adorno), CRÉALO tú mismo combinando capas primitivas (`rect`, `circle`, `text`, `group`) con animaciones de entrada (ej. `entry: "slide-up"`). Mezcla primitivas y componentes.
2. **COHERENCIA TEMÁTICA ESTRICTA:** Solo elige componentes de la Standard Library si tienen una relación DIRECTA y LÓGICA con el guion. Si el video es un documental sobre peces, NO uses un "SubscribeButton" o "TinderSwipeCard". Usa tu juicio semántico: si no encaja perfecto con la vibra de la escena, no lo uses.
3. **NO APILES ELEMENTOS UNO ENCIMA DEL OTRO EN EL CENTRO**. Usa la propiedad `y` (ejemplo: `y: -300` para arriba, `y: 0` para el centro, `y: 300` para abajo) o la propiedad `x` para distribuir las capas y evitar superposiciones.
4. El texto hablado principal DEBE aparecer en pantalla de manera legible. Pásalo a tu componente de texto o primitiva de texto usando `"text": "{{text}}"`.
5. **POSICIONAMIENTO OBLIGATORIO:** ABSOLUTAMENTE TODOS los layers DEBEN tener `x` e `y`. Si los omites, el JSON será inválido.
   - `"x": 0, "y": 0` = centro del canvas
   - `"x": 0, "y": -200` = arriba del centro
   - `"x": 0, "y": 200` = abajo del centro
   - `"x": -200, "y": 0` = izquierda del centro
   - `"x": 200, "y": 0` = derecha del centro
    - EJEMPLO CORRECTO: {{"type": "text", "text": "Hola", "x": 0, "y": 0}}
    - EJEMPLO INCORRECTO: {{"type": "text", "text": "Hola"}} ← FALTA x/y, INVÁLIDO
6. **FORMATO NUMÉRICO ESTRICTO:** Para `lineWidth`, usa SOLO números ENTEROS (0, 1, 2, 3... 20). NUNCA uses decimales. Ejemplos válidos: `0`, `4`, `10`. Ejemplos INVÁLIDOS: `0.5`, `4.5`, `10.25`.

REQUISITO OBLIGATORIO: Tu composición DEBE incluir al menos UNA capa creada desde cero usando primitivas (rect, circle, text, group, path) que represente el sujeto principal de la escena. No puedes usar solo componentes de la Standard Library. Si usas componentes, combínalos con al menos una primitiva custom que refuerce el tema visual de la escena.

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
      "componentName": "NOMBRE_DEL_COMPONENTE_ELEGIDO",
      "prop1": "valor",
      "x": 0,
      "y": -100
    }},
    {{
      "type": "rect",
      "width": 400,
      "height": 4,
      "fill": "#38bdf8",
      "x": 0,
      "y": 50,
      "entry": "slide-right"
    }},
    {{
      "type": "text",
      "text": "{{text}}",
      "fontSize": 60,
      "color": "#ffffff",
      "x": 0,
      "y": 0,
      "entry": "fade-in"
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
    db=None,  # NEW: SQLAlchemy session for vector search
    aspect_ratio: str = "9:16",
) -> AnimaComposerSpec:
    """
    Pregunta al LLM por la composición AnimaComposer (JSON) de la escena.
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
    prompt = _build_strategy_prompt(text, media_query, components, aspect_ratio)

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
                                "lineWidth": {"type": "INTEGER", "minimum": 0, "maximum": 20}
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
