from __future__ import annotations

from typing import Any, Dict, List, Optional, Union, Literal

from pydantic import BaseModel, Field, model_validator


class SFX(BaseModel):
    keyword: str
    time_in_seconds: float
    file: str


class AEKeyframe(BaseModel):
    time: float
    value: Any
    easing: Optional[str] = None


class AEElement(BaseModel):
    type: str
    id: str
    position_keyframes: Optional[List[AEKeyframe]] = None
    scale_keyframes: Optional[List[AEKeyframe]] = None
    opacity_keyframes: Optional[List[AEKeyframe]] = None
    color_keyframes: Optional[List[AEKeyframe]] = None
    effects: Optional[List[Dict[str, Any]]] = None


class AEMetadata(BaseModel):
    animation_type: str
    elements: List[AEElement]
    text_animation: str
    connections: Optional[List[Dict[str, Any]]] = None


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float


# ─── AnimaComposer models ────────────────────────────────────────────────


class SpringConfig(BaseModel):
    damping: float
    stiffness: float
    mass: float = 1.0


class AnimValueAnimation(BaseModel):
    model_config = {"populate_by_name": True}
    from_: float = Field(alias="from")
    to: float
    duration: float = Field(default=30)
    delay: float = Field(default=0)
    easing: Literal["linear", "ease-in", "ease-out", "ease-in-out", "spring"] = Field(default="linear")
    spring_config: Optional[SpringConfig] = Field(default=None, alias="springConfig")


AnimValue = Union[float, AnimValueAnimation]


class AnimaBackground(BaseModel):
    type: Literal["solid", "linear-gradient", "radial-gradient"]
    colors: List[str] = Field(..., min_length=1)
    angle: float = Field(default=0)
    center: Optional[List[float]] = Field(default=None, min_length=2, max_length=2)


class AnimaLayer(BaseModel):
    model_config = {"extra": "forbid"}
    id: Optional[str] = None
    type: Literal["rect", "circle", "path", "text", "image", "group", "particles", "component"]
    x: Optional[AnimValue] = None
    y: Optional[AnimValue] = None
    scale: Optional[AnimValue] = None
    rotation: Optional[AnimValue] = None
    opacity: Optional[AnimValue] = None
    width: Optional[float] = None
    height: Optional[float] = None
    borderRadius: Optional[float] = None
    fill: Optional[str] = None
    stroke: Optional[str] = None
    strokeWidth: Optional[float] = None
    r: Optional[float] = None
    pathData: Optional[str] = None
    text: Optional[str] = None
    fontSize: Optional[float] = None
    fontWeight: Optional[float] = None
    letterSpacing: Optional[float] = None
    textAlign: Optional[Literal["left", "center", "right"]] = None
    src: Optional[str] = None
    fit: Optional[Literal["cover", "contain"]] = None
    children: Optional[List["AnimaLayer"]] = None
    count: Optional[int] = None
    shape: Optional[Literal["circle", "rect", "star"]] = None
    spread: Optional[float] = None
    colors: Optional[List[str]] = None
    entry: Optional[Literal["fade-in", "slide-up", "slide-down", "slide-left", "slide-right", "scale-in", "spring-in"]] = None
    entryDelay: float = Field(default=0)
    filter: Optional[str] = None
    componentName: Optional[Literal[
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
    ]] = None
    props: Optional[Dict[str, Any]] = None


class AnimaComposerSpec(BaseModel):
    model_config = {"extra": "forbid"}
    version: str = Field(default="1.0")
    background: AnimaBackground
    layers: List[AnimaLayer]


# ─── Core Spec ───────────────────────────────────────────────────────────


class Spec(BaseModel):
    start_time_seconds: float
    duration_seconds: float
    text: str
    type: str
    media_query: str = Field(..., max_length=1500)
    animation_spec: Optional[Dict[str, Any]] = None
    remotion_props: Optional[Dict[str, Any]] = None
    sfx: List[SFX] = Field(default_factory=list)
    audio_url: Optional[str] = None
    word_timestamps: Optional[List[WordTimestamp]] = None
    ae_metadata: Optional[Dict[str, Any]] = None
    ae_script_code: Optional[str] = None
    scene_video_url: Optional[str] = None
    quality_status: Optional[str] = None
    anima_composer: Optional[AnimaComposerSpec] = Field(
        default=None,
        description="Cuando presente, type DEBE ser 'custom'",
    )

    @model_validator(mode="after")
    def _validate_custom_type(self) -> Spec:
        if self.anima_composer is not None and self.type != "custom":
            raise ValueError(
                "When anima_composer is provided, type must be 'custom'. "
                f"Got type='{self.type}' instead."
            )
        return self


class TimelineSpec(BaseModel):
    scenes: List[Spec]
    aspect_ratio: str = "9:16"
    quality_metrics: Optional[Dict[str, Any]] = None
