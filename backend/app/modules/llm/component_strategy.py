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
Aprovecha al máximo los componentes de la Standard Library pasándoles propiedades ("props").

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
      "props": {{ "color1": "#38bdf8" }}
    }},
    {{
      "type": "component",
      "componentName": "TextReveal",
      "props": {{ "text": "{{text}}", "fontSize": 80, "color": "#ffffff" }}
    }},
    {{
      "type": "particles",
      "count": 30,
      "colors": ["#ffffff", "#38bdf8"]
    }}
  ]
}}

IMPORTANTE: 
- El texto hablado principal debe representarse idealmente con "{{text}}" en algún componente de texto o usar primitivas text.
- Usa type: "component" siempre que un componente de la librería sirva (ej. TextReveal, Typewriter, ProductCardReveal).
- Puedes apilar múltiples componentes.
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
                props={"text": "{{text}}", "color": "#ffffff"}
            )
        ]
    )

    if not api_key:
        logger.warning("No API key provided. Defaulting to fallback.")
        return default_fallback

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AnimaComposerSpec.model_json_schema(),
                temperature=0.3,
            ),
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
