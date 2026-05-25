"""
Estrategia de generacion de componentes: genera un JSON AnimaComposer.

El LLM evalúa cada escena y decide cómo animarla usando una combinación
de componentes de la Standard Library y primitivas básicas.
Todo se retorna como un AnimaComposerSpec válido.
"""
from typing import Any
from google import genai
from google.genai import types
from app.core.logging import get_logger
from app.schemas.spec import AnimaComposerSpec, AnimaBackground, AnimaLayer

logger = get_logger("llm.strategy")

# ── Catálogo de componentes disponibles ──────────────────────────────────────
# Mantener sincronizado con frontend/src/remotion/registry.ts
AVAILABLE_COMPONENTS: list[str] = [
    "APIRequestFlow", "AbstractWave", "AnimatedArrow", "AnimatedIcon", "AnimatedLine", "AnimatedShape",
    "AppStoreButtons", "AudioSpectrumBars", "BarChartReveal", "BreakingNewsAlert", "BreakingNewsTicker",
    "BrowserWindow", "CalendarDatePop", "CodeBlockHighlight", "CountdownTimer", "CounterNumber",
    "CursorClick", "EmojiFloat", "FeatureChecklist", "FeatureUnlock", "FlashSaleTimer", "FloatingBadge",
    "FloatingBlobs", "FollowerCounter", "FunnelChart", "GitCommitGraph", "GlitchTitle", "GlitchTransition",
    "GlobalVFX", "GradientOverlay", "GridPerspective", "HighlightText", "HorizontalBarRace", "InstagramPost",
    "KineticBackground", "LightLeakTransition", "LoadingSpinner", "LottieAnimation", "LowerThird",
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
    available_components: list[str],
) -> str:
    components_list = "\n".join(f"- {name}" for name in sorted(available_components))

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
COMPONENTES DISPONIBLES (Standard Library):
{components_list}

INSTRUCCIONES:
Debes generar un JSON válido que describa el 'background' y una lista de 'layers'.
Puedes combinar componentes de la Standard Library usando type: "component". 

REGLAS DE ORO PARA EL DISEÑO:
1. **CREA DESDE CERO CON PRIMITIVAS:** No te limites solo a componentes prefabricados. Si la escena requiere algo único (como un marco, un contenedor de texto, o un adorno), CRÉALO tú mismo combinando capas primitivas (`rect`, `circle`, `text`, `group`) con animaciones (ej. `entry: "slide-up"`, `scale: {{"from": 0, "to": 1}}`). Mezcla primitivas y componentes.
2. **COHERENCIA TEMÁTICA ESTRICTA:** Solo elige componentes de la Standard Library si tienen una relación DIRECTA y LÓGICA con el guion. Si el video es un documental sobre peces, NO uses un "SubscribeButton" o "TinderSwipeCard". Usa tu juicio semántico: si no encaja perfecto con la vibra de la escena, no lo uses.
3. **NO APILES ELEMENTOS UNO ENCIMA DEL OTRO EN EL CENTRO**. Usa la propiedad `y` (ejemplo: `y: -300` para arriba, `y: 0` para el centro, `y: 300` para abajo) o la propiedad `x` para distribuir las capas y evitar superposiciones.
4. El texto hablado principal DEBE aparecer en pantalla de manera legible. Pásalo a tu componente de texto o primitiva de texto usando `"text": "{{text}}"`.

REQUISITO OBLIGATORIO: Tu composición DEBE incluir al menos UNA capa creada desde cero usando primitivas (rect, circle, text, group, path) que represente el sujeto principal de la escena. No puedes usar solo componentes de la Standard Library. Si usas componentes, combínalos con al menos una primitiva custom que refuerce el tema visual de la escena.

TRANSICIONES DE SALIDA (out_transition):
Analiza la continuidad entre esta escena y la siguiente (si la hay).
- Si hay un cambio drástico de tema o emoción: usa "ZoomBlurTransition" o "GlitchTransition".
- Si hay continuidad visual pero cambio de contenido: usa "WipeTransition" o "LightLeakTransition".
- Si las escenas fluyen naturalmente sin corte brusco: usa "NONE" o "GradientOverlay".

Incluye "out_transition" en tu JSON solo si quieres una transición al final de esta escena.
Ejemplo: "out_transition": {"type": "ZoomBlurTransition", "duration_frames": 15}

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
      "y": -100
    }},
    {{
      "type": "rect",
      "width": 400,
      "height": 4,
      "fill": "#38bdf8",
      "entry": "slide-right"
    }},
    {{
      "type": "text",
      "text": "{{text}}",
      "fontSize": 60,
      "color": "#ffffff",
      "y": 100,
      "entry": "fade-in"
    }}
  ]
}}

IMPORTANTE: 
- Si un componente necesita propiedades adicionales (como speed, color, textColor, url, x, y), pásalas directamente como propiedades de la capa, en el mismo nivel que "type" y "componentName". La propiedad "props" NO existe.
DEVUELVE SOLO JSON VALIDO, SIN MARKDOWN."""


# ── Función principal ────────────────────────────────────────────────────────

def generate_scene_composer(
    text: str,
    media_query: str,
    available_components: list[str] | None = None,
    api_key: str = "",
    model: str = "gemini-2.0-flash",
) -> AnimaComposerSpec:
    """
    Pregunta al LLM por la composición AnimaComposer (JSON) de la escena.
    """
    components = available_components or AVAILABLE_COMPONENTS
    prompt = _build_strategy_prompt(text, media_query, components)

    # Fallback default si hay error
    default_fallback = AnimaComposerSpec(
        background=AnimaBackground(type="solid", colors=["#000000"]),
        layers=[
            AnimaLayer(
                type="component",
                componentName="TextReveal",
                text="{{text}}",
                color="#ffffff"
            )
        ]
    )

    if not api_key:
        logger.warning("No API key provided. Defaulting to fallback.")
        return default_fallback

    try:
        from app.modules.llm.client import _call_llm_sync
        # Configurar cliente con un timeout estricto de 120 segundos
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
                            "x": {"type": "NUMBER"},
                            "y": {"type": "NUMBER"},
                            "scale": {"type": "NUMBER"},
                            "rotation": {"type": "NUMBER"},
                            "opacity": {"type": "NUMBER"},
                            "width": {"type": "NUMBER"},
                            "height": {"type": "NUMBER"},
                            "borderRadius": {"type": "NUMBER"},
                            "fill": {"type": "STRING"},
                            "stroke": {"type": "STRING"},
                            "strokeWidth": {"type": "NUMBER"},
                            "r": {"type": "NUMBER"},
                            "pathData": {"type": "STRING"},
                            "text": {"type": "STRING"},
                            "fontSize": {"type": "NUMBER"},
                            "fontWeight": {"type": "NUMBER"},
                            "letterSpacing": {"type": "NUMBER"},
                            "textAlign": {"type": "STRING"},
                            "src": {"type": "STRING"},
                            "fit": {"type": "STRING"},
                            "count": {"type": "INTEGER"},
                            "shape": {"type": "STRING"},
                            "spread": {"type": "NUMBER"},
                            "colors": {"type": "ARRAY", "items": {"type": "STRING"}},
                            "entry": {"type": "STRING"},
                            "entryDelay": {"type": "NUMBER"},
                            "filter": {"type": "STRING"},
                            "color": {"type": "STRING"},
                            "color1": {"type": "STRING"},
                            "color2": {"type": "STRING"},
                            "bgColor": {"type": "STRING"},
                            "textColor": {"type": "STRING"},
                            "speed": {"type": "NUMBER"},
                            "delay": {"type": "NUMBER"},
                            "intensity": {"type": "NUMBER"},
                            "theme": {"type": "STRING"},
                            "url": {"type": "STRING"},
                            "query": {"type": "STRING"},
                            "animation": {"type": "STRING"},
                            "lineWidth": {"type": "NUMBER"}
                        },
                        "required": ["type"]
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
            ),
            label="LLM Component Strategy"
        )

        # DEBUG: Log the raw text response
        raw_text = response.text if response.text else "(empty)"
        logger.info(
            "RAW Gemini response for scene composer (%d chars): %s",
            len(raw_text),
            raw_text[:1500],
        )

        result = response.parsed

        # DEBUG: Log the parsed result
        if result is not None:
            result_str = str(result)
            logger.info(
                "Parsed result type: %s, length: %d, preview: %s",
                type(result).__name__,
                len(result_str),
                result_str[:1500],
            )
        else:
            logger.warning("response.parsed is None")

        if result is None:
            logger.warning("LLM returned empty response. Defaulting to fallback.")
            return default_fallback

        logger.info("Generated AnimaComposerSpec for scene.")
        # Retornamos parseando a nuestro modelo Pydantic para validar
        if isinstance(result, dict):
             return AnimaComposerSpec(**result)
        else:
             # Si ya es un objeto (por el SDK parsing), lo convertimos
             return AnimaComposerSpec.model_validate(result)

    except Exception as e:
        logger.warning(
            "Error en strategy decision: %s. Defaulting to fallback.",
            str(e)[:100],
        )
        return default_fallback
