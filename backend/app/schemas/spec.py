from __future__ import annotations

from typing import Any, Dict, List, Optional, Union, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


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


AnimValue = float


class AnimaBackground(BaseModel):
    type: Literal["solid", "linear-gradient", "radial-gradient", "linear", "radial", "gradient"]
    colors: List[str] = Field(..., min_length=1)
    angle: float = Field(default=0)
    center: Optional[List[float]] = Field(default=None, min_length=2, max_length=2)

    @model_validator(mode="before")
    @classmethod
    def _clamp_numeric_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        for field in ("angle",):
            if field in data:
                try:
                    val = float(data[field])
                    if abs(val) > 360:
                        data[field] = val % 360
                except (ValueError, TypeError, OverflowError):
                    data[field] = 0.0
        return data

    @field_validator("type", mode="before")
    @classmethod
    def normalize_bg_type(cls, v: str) -> str:
        mapping = {
            "linear": "linear-gradient",
            "radial": "radial-gradient",
            "gradient": "linear-gradient",
        }
        return mapping.get(v, v)


class BaseAnimaLayer(BaseModel):
    model_config = {"extra": "ignore"}

    @model_validator(mode="before")
    @classmethod
    def _clamp_numeric_fields(cls, data: Any) -> Any:
        """Clamp absurd numeric values from Gemini to reasonable ranges."""
        if not isinstance(data, dict):
            return data
        
        # Field-specific limits: (min, max, default)
        field_limits = {
            "lineWidth": (0, 20, 2),
            "strokeWidth": (0, 20, 2),
            "fontSize": (12, 120, 48),
            "fontWeight": (100, 900, 400),
            "width": (10, 1920, 400),
            "height": (10, 1920, 200),
            "r": (5, 500, 50),
            "borderRadius": (0, 500, 0),
            "x": (-1000, 1000, 0),
            "y": (-1000, 1000, 0),
            "scale": (0.1, 10, 1),
            "rotation": (-360, 360, 0),
            "opacity": (0, 1, 1),
            "entryDelay": (0, 10, 0),
            "speed": (0.01, 10, 1),
            "delay": (0, 10, 0),
            "intensity": (0, 1, 0.5),
            "count": (1, 200, 10),
            "spread": (0, 500, 50),
            "letterSpacing": (-10, 20, 0),
        }
        
        for field, (min_val, max_val, default) in field_limits.items():
            if field in data:
                try:
                    val = float(data[field])
                    if val > max_val:
                        data[field] = float(max_val)
                    elif val < min_val:
                        data[field] = float(min_val)
                    else:
                        data[field] = val
                except (ValueError, TypeError, OverflowError):
                    data[field] = float(default)
        
        return data

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
    count: Optional[int] = None
    shape: Optional[Literal["circle", "rect", "star"]] = None
    spread: Optional[float] = None
    colors: Optional[List[str]] = None
    entry: Optional[Literal[
        "fade-in", "slide-up", "slide-down", "slide-left", "slide-right", 
        "scale-in", "spring-in", "zoom-in", "zoom-out", "rotate-in", "bounce-in"
    ]] = None
    entryDelay: float = Field(default=0)
    filter: Optional[str] = None
    componentName: Optional[Literal[
        "APIRequestFlow", "AbstractWave", "AnimatedArrow", "AnimatedIcon", "AnimatedLine", "AnimatedShape",
        "AppStoreButtons", "AudioSpectrumBars", "BarChartReveal", "BreakingNewsAlert", "BreakingNewsTicker",
        "BrowserWindow", "CalendarDatePop", "CodeBlockHighlight", "CountdownTimer", "CounterNumber",
        "CursorClick", "EmojiFloat", "FeatureChecklist", "FeatureUnlock", "FlashSaleTimer", "FloatingBadge",
        "FloatingBlobs", "FollowerCounter", "FunnelChart", "GitCommitGraph", "GlitchTitle", "GlitchTransition",
        "GlobalVFX", "GradientOverlay", "GridPerspective", "HighlightText", "HorizontalBarRace",
        "IconifyIcon", "InstagramPost",
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
    ]] = None
    color: Optional[str] = None
    color1: Optional[str] = None
    color2: Optional[str] = None
    bgColor: Optional[str] = None
    textColor: Optional[str] = None
    speed: Optional[float] = None
    delay: Optional[float] = None
    intensity: Optional[float] = None
    theme: Optional[str] = None
    url: Optional[str] = None
    query: Optional[str] = None
    animation: Optional[str] = None
    icon: Optional[str] = None  # Iconify icon ID (e.g. "mdi:heart")
    lineWidth: Optional[float] = None
    props: Optional[Dict[str, Any]] = None

class AnimaChildLayer(BaseAnimaLayer):
    @model_validator(mode="before")
    @classmethod
    def set_position_defaults(cls, data: Any) -> Any:
        """Set default x=0, y=0 for child layers."""
        if isinstance(data, dict):
            if data.get("x") is None:
                data["x"] = 0
            if data.get("y") is None:
                data["y"] = 0
        return data

class AnimaLayer(BaseAnimaLayer):
    children: Optional[List[AnimaChildLayer]] = None

    @model_validator(mode="before")
    @classmethod
    def set_position_defaults(cls, data: Any) -> Any:
        """Set default x=0, y=0 for ALL layers to prevent top-left positioning."""
        if isinstance(data, dict):
            if data.get("x") is None:
                data["x"] = 0
            if data.get("y") is None:
                data["y"] = 0
            # Center text by default
            if data.get("type") == "text" and data.get("textAlign") is None:
                data["textAlign"] = "center"
        return data


class OutTransition(BaseModel):
    type: Literal[
        "ZoomBlurTransition", "WipeTransition", "LightLeakTransition",
        "GlitchTransition", "GradientOverlay", "NONE"
    ]
    duration_frames: int = Field(default=15, ge=5, le=60)
    target_scene: Optional[str] = None  # ID of the next scene


class AnimaComposerSpec(BaseModel):
    model_config = {"extra": "forbid"}
    version: str = Field(default="1.0")
    background: AnimaBackground
    layers: List[AnimaLayer]
    out_transition: Optional[OutTransition] = Field(default=None)


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
