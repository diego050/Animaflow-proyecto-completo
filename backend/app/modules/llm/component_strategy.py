"""
Estrategia de generacion de componentes: decide si usar Standard Library o AnimaComposer JSON.

El LLM evalúa cada escena y elige la mejor estrategia:
- OPCIÓN A (prioritaria): Usar un componente existente de la libreria (1-2 tokens de costo).
- OPCIÓN B: Generar un JSON AnimaComposer describiendo la escena visualmente (~200-400 tokens).
"""
from pydantic import BaseModel, Field
from typing import Any, Union
from google import genai
from google.genai import types
from app.core.logging import get_logger

logger = get_logger("llm.strategy")

# ── Catálogo de componentes disponibles ──────────────────────────────────────
# Mantener sincronizado con frontend/src/remotion/registry.ts
AVAILABLE_COMPONENTS: list[str] = [
    "APIRequestFlow",
    "AbstractWave",
    "AnimatedArrow",
    "AnimatedIcon",
    "AnimatedLine",
    "AnimatedShape",
    "AppStoreButtons",
    "AudioSpectrumBars",
    "BarChartReveal",
    "BreakingNewsAlert",
    "BreakingNewsTicker",
    "BrowserWindow",
    "CalendarDatePop",
    "CodeBlockHighlight",
    "CountdownTimer",
    "CounterNumber",
    "CursorClick",
    "EmojiFloat",
    "FeatureChecklist",
    "FeatureUnlock",
    "FlashSaleTimer",
    "FloatingBadge",
    "FloatingBlobs",
    "FollowerCounter",
    "FunnelChart",
    "GitCommitGraph",
    "GlitchTitle",
    "GlitchTransition",
    "GlobalVFX",
    "GradientOverlay",
    "GridPerspective",
    "HighlightText",
    "HorizontalBarRace",
    "InstagramPost",
    "KineticBackground",
    "LightLeakTransition",
    "LoadingSpinner",
    "LottieAnimation",
    "LowerThird",
    "MaskedReveal",
    "MediaFrame",
    "MessageBubble",
    "MusicPlayerUI",
    "NetworkNodes",
    "NotificationToast",
    "ParticleField",
    "PercentageRing",
    "PhoneMockup",
    "PieChartReveal",
    "PodcastGuestCard",
    "PricingTableReveal",
    "ProductCardReveal",
    "ProgressPill",
    "PromoCodeBanner",
    "QuoteBlock",
    "RadarSpiderChart",
    "RaysOfLight",
    "RippleEffect",
    "ScoreboardCounter",
    "SearchEngineTyping",
    "ShoppingCartBadge",
    "SizeSelector",
    "SocialProgressBar",
    "SocialSharePopup",
    "SoundWaveCircle",
    "SplitScreenGrid",
    "SplitText",
    "StockCandlestick",
    "StrikethroughText",
    "SubscribeButton",
    "TerminalHacker",
    "TestimonialReview",
    "TextBubble",
    "TextReveal",
    "TextSwap",
    "TikTokOverlay",
    "TinderSwipeCard",
    "TrendLine",
    "TweetCard",
    "Typewriter",
    "UnderlineReveal",
    "VersusScreen",
    "WaveformVisualizer",
    "WipeTransition",
    "YouTubeEndScreen",
    "ZoomBlurTransition",
]


# ── Modelos de decisión ──────────────────────────────────────────────────────

class StandardLibraryChoice(BaseModel):
    """El LLM eligio un componente existente de la libreria."""
    mode: str = Field(
        default="component",
        description="Siempre 'component'",
    )
    component_name: str = Field(
        description="Nombre exacto del componente de la libreria",
    )
    props: dict[str, Any] = Field(
        default_factory=dict,
        description="Props a pasar al componente (color, bgColor, fontSize, etc.)",
    )
    confidence: float = Field(
        default=1.0,
        ge=0,
        le=1,
        description="Que tan bien se ajusta el componente existente a la escena (0-1)",
    )


class CustomSceneChoice(BaseModel):
    """El LLM eligio generar un JSON AnimaComposer porque no hay componente adecuado."""
    mode: str = Field(
        default="custom",
        description="Siempre 'custom'",
    )
    justification: str = Field(
        description="Por que no hay un componente existente que cubra esta escena",
    )
    anima_composer: dict[str, Any] = Field(
        default_factory=dict,
        description="El JSON AnimaComposer completo describiendo la escena personalizada",
    )


# Tipo unión: la decisión siempre será una de las dos opciones
SceneStrategy = Union[StandardLibraryChoice, CustomSceneChoice]


# ── Prompt base ──────────────────────────────────────────────────────────────

def _build_strategy_prompt(
    text: str,
    media_query: str,
    available_components: list[str],
) -> str:
    """Construye el prompt para que el LLM decida la estrategia de una escena."""
    components_list = "\n".join(f"- {name}" for name in sorted(available_components))

    return f"""Eres el director de escena de AnimaFlow. Tu trabajo es decidir la MEJOR estrategia para animar UNA escena de video.

TEXTO DE LA ESCENA: "{text}"
DESCRIPCION VISUAL: "{media_query}"

COMPONENTES DISPONIBLES (Standard Library):
{components_list}

Debes elegir:

OPCION A - COMPONENTE EXISTENTE (PRIORITARIA):
Si UN SOLO componente de la libreria puede representar el 80%+ de lo que pide la escena,
elige esta opcion. Ejemplo: si dice "producto estrella", usa ProductCardReveal.
Devuelve: {{ "mode": "component", "component_name": "NombreComponente", "confidence": 0.95 }}

OPCION B - ESCENA PERSONALIZADA (SOLO si ningún componente existente sirve):
Si la escena requiere una animacion o composicion unica que ningun componente cubre,
genera un JSON AnimaComposer.
Devuelve: {{ "mode": "custom", "justification": "...", "anima_composer": {{...}} }}

IMPORTANTE: Siempre prioriza la OPCION A. Solo usa OPCION B si realmente no hay componente adecuado.
DEVUELVE SOLO JSON VALIDO. SIN MARKDOWN."""


# ── Schema de respuesta para Gemini ──────────────────────────────────────────

_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "mode": {"type": "string", "enum": ["component", "custom"]},
        "component_name": {"type": "string"},
        "props": {"type": "object"},
        "justification": {"type": "string"},
        "confidence": {"type": "number"},
        "anima_composer": {"type": "object"},
    },
    "required": ["mode"],
}


# ── Función principal ────────────────────────────────────────────────────────

def decide_scene_strategy(
    text: str,
    media_query: str,
    available_components: list[str] | None = None,
    api_key: str = "",
    model: str = "gemini-2.0-flash",
) -> SceneStrategy:
    """
    Pregunta al LLM que estrategia usar para una escena.

    Args:
        text: Texto narrado de la escena.
        media_query: Descripción visual generada por el pipeline.
        available_components: Lista de nombres de componentes disponibles.
                              Si es None, se usa el catálogo completo.
        api_key: API key de Gemini.
        model: Modelo de Gemini a usar.

    Returns:
        StandardLibraryChoice si el LLM elige un componente existente,
        CustomSceneChoice si el LLM elige generar un JSON AnimaComposer.

    Ante cualquier error, retorna un fallback seguro (FadeText).
    """
    components = available_components or AVAILABLE_COMPONENTS
    prompt = _build_strategy_prompt(text, media_query, components)

    if not api_key:
        logger.warning("No API key provided. Defaulting to FadeText.")
        return StandardLibraryChoice(component_name="FadeText", props={}, confidence=0.3)

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_RESPONSE_SCHEMA,
                temperature=0.3,
            ),
        )

        result = response.parsed

        if result is None:
            logger.warning("LLM returned empty response. Defaulting to FadeText.")
            return StandardLibraryChoice(component_name="FadeText", props={}, confidence=0.3)

        mode = result.get("mode", "component")

        if mode == "component":
            choice = StandardLibraryChoice(
                component_name=result.get("component_name", "FadeText"),
                props=result.get("props", {}),
                confidence=result.get("confidence", 0.5),
            )
            logger.info(
                "Strategy decision: Standard Library component '%s' (confidence: %.2f)",
                choice.component_name,
                choice.confidence,
            )
            return choice

        # mode == "custom"
        choice = CustomSceneChoice(
            justification=result.get("justification", ""),
            anima_composer=result.get("anima_composer", {}),
        )
        logger.info(
            "Strategy decision: Custom AnimaComposer scene. Justification: %s",
            choice.justification[:120],
        )
        return choice

    except Exception as e:
        logger.warning(
            "Error en strategy decision: %s. Defaulting to FadeText.",
            str(e)[:80],
        )
        return StandardLibraryChoice(component_name="FadeText", props={}, confidence=0.3)
