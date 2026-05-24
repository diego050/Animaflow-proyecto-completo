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

Tienes acceso a primitivas básicas (rect, circle, image) y a componentes complejos de nuestra Standard Library.
COMPONENTES DISPONIBLES (Standard Library):
{components_list}

INSTRUCCIONES:
Debes generar un JSON válido que describa el 'background' y una lista de 'layers'.
Puedes combinar componentes de la Standard Library usando type: "component". 

REGLAS DE ORO PARA EL DISEÑO:
1. **NO APILES ELEMENTOS UNO ENCIMA DEL OTRO EN EL CENTRO**. Usa la propiedad `y` (ejemplo: `y: -300` para arriba, `y: 0` para el centro, `y: 300` para abajo) o la propiedad `x` para distribuir las capas y evitar superposiciones.
2. **COHERENCIA TEMÁTICA ESTRICTA:** Solo elige componentes de la Standard Library si tienen una relación DIRECTA y LÓGICA con el guion. Si el video es un documental sobre peces, NO uses un "SubscribeButton" o "TinderSwipeCard". Usa tu juicio semántico: si no encaja perfecto con la vibra de la escena, no lo uses.
3. **CREA DESDE CERO CON PRIMITIVAS:** No te limites solo a componentes prefabricados. Si la escena requiere algo único (como un marco, un contenedor de texto, o un adorno), CRÉALO tú mismo combinando capas primitivas (`rect`, `circle`, `text`, `group`) con animaciones (ej. `entry: "slide-up"`, `scale: {{"from": 0, "to": 1}}`). Mezcla primitivas y componentes.
4. El texto hablado principal DEBE aparecer en pantalla de manera legible. Pásalo a tu componente de texto o primitiva de texto usando `"text": "{{text}}"`.

Ejemplo de JSON esperado:
{{
  "background": {{
    "type": "solid",
    "colors": ["#0f172a"]
  }},
  "layers": [
    {{
      "type": "component",
      "componentName": "KineticBackground",
      "color1": "#38bdf8"
    }},
    {{
      "type": "component",
      "componentName": "TextReveal",
      "text": "{{text}}", 
      "fontSize": 60, 
      "color": "#ffffff",
      "y": -100
    }},
    {{
      "type": "particles",
      "count": 30,
      "colors": ["#ffffff", "#38bdf8"]
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
        client = genai.Client(api_key=api_key, http_options={'timeout': 120.0})

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

        result = response.parsed

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
