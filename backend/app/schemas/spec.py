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


class LayerStyle(BaseModel):
    """Visual style properties for a layer (borders, shadows, filters, transforms, etc.)."""
    model_config = {"extra": "ignore"}

    # Spacing
    padding: Optional[Union[float, List[float]]] = None  # single value or [top, right, bottom, left]
    margin: Optional[Union[float, List[float]]] = None   # single value or [top, right, bottom, left]

    # Borders
    borderWidth: Optional[float] = None
    borderColor: Optional[str] = None
    borderStyle: Optional[Literal["solid", "dashed", "dotted"]] = None

    # Effects
    boxShadow: Optional[Dict[str, Any]] = None  # {x, y, blur, spread, color}
    opacity: Optional[float] = None
    blur: Optional[float] = None
    backdropBlur: Optional[float] = None

    # Filters
    brightness: Optional[float] = None
    contrast: Optional[float] = None
    saturate: Optional[float] = None
    grayscale: Optional[bool] = None
    hueRotate: Optional[float] = None
    invert: Optional[bool] = None

    # Transforms (static, not animated)
    rotate: Optional[float] = None
    scale: Optional[Union[float, List[float]]] = None
    transformOrigin: Optional[str] = None

    # Typography extras
    lineHeight: Optional[float] = None
    textShadow: Optional[Dict[str, Any]] = None  # {x, y, blur, color}
    textDecoration: Optional[Literal["underline", "line-through", "none"]] = None

    # Background extras
    backgroundImage: Optional[str] = None
    backgroundSize: Optional[Literal["cover", "contain", "auto"]] = None
    backgroundPosition: Optional[str] = None
    backgroundOpacity: Optional[float] = None

    # Layout extras
    overflow: Optional[Literal["hidden", "visible", "scroll"]] = None
    aspectRatio: Optional[str] = None
    objectFit: Optional[Literal["cover", "contain", "fill"]] = None
    flexWrap: Optional[Literal["wrap", "nowrap"]] = None
    flexGrow: Optional[float] = None
    flexShrink: Optional[float] = None
    order: Optional[int] = None

    # SVG extras
    strokeLinecap: Optional[Literal["round", "butt", "square"]] = None
    strokeDasharray: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def _clamp_numeric_fields(cls, data: Any) -> Any:
        """Clamp absurd numeric values from Gemini to reasonable ranges."""
        if not isinstance(data, dict):
            return data

        field_limits = {
            "padding": (0, 200, 0),
            "margin": (-100, 200, 0),
            "borderWidth": (0, 20, 0),
            "opacity": (0, 1, 1),
            "blur": (0, 50, 0),
            "backdropBlur": (0, 50, 0),
            "brightness": (0, 3, 1),
            "contrast": (0, 3, 1),
            "saturate": (0, 3, 1),
            "hueRotate": (0, 360, 0),
            "rotate": (-360, 360, 0),
            "scale": (0.1, 10, 1),
            "lineHeight": (0.5, 4, 1.2),
            "backgroundOpacity": (0, 1, 1),
            "flexGrow": (0, 10, 1),
            "flexShrink": (0, 10, 1),
            "order": (-100, 100, 0),
            "strokeWidth": (0, 20, 1),
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
    model_config = {"extra": "allow"}

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
            "fontSize": (16, 250, 72),
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
            "padding": (0, 200, 0),
            "margin": (-100, 200, 0),
            "lineHeight": (0.5, 4, 1.2),
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
        "scale-in", "spring-in", "zoom-in", "zoom-out", "rotate-in", "bounce-in", "blur-in"
    ]] = None
    entryDelay: float = Field(default=0)
    exit: Optional[Literal[
        "fade-out", "slide-up-out", "slide-down-out", "slide-left-out", "slide-right-out",
        "scale-out", "spring-out", "bounce-out", "blur-out"
    ]] = None
    exitDelay: float = Field(default=0)
    exitDuration: float = Field(default=0.5)
    filter: Optional[str] = None
    componentName: Optional[str] = None

    @field_validator("componentName", mode="before")
    @classmethod
    def validate_component_name(cls, v: Any) -> Any:
        """Validate componentName against the canonical AVAILABLE_COMPONENTS list.

        Unknown components are passed through as-is (not rejected) so that
        Pydantic validation never blocks a spec due to a desynced Literal.
        The downstream post-processor handles unknown component cleanup.
        """
        if v is None:
            return None
        if not isinstance(v, str):
            return None
        from app.modules.llm.component_strategy import AVAILABLE_COMPONENTS
        if v not in AVAILABLE_COMPONENTS:
            logger = __import__("app.core.logging", fromlist=["get_logger"]).get_logger("spec.validator")
            logger.warning("Unknown componentName '%s' — will be handled by post-processor", v)
        return v

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

    @field_validator("animation", mode="before")
    @classmethod
    def _sanitize_animation(cls, v: Any) -> Any:
        if not v or not isinstance(v, str):
            return None
        valid = {
            "fade-in", "slide-up", "slide-down", "slide-left", "slide-right",
            "scale-in", "spring-in", "bounce-in", "rotate-in", "blur-in",
            "typewriter", "none"
        }
        v_lower = v.lower().strip()
        if v_lower in valid:
            return v_lower
        # Map common LLM mistakes
        mapping = {
            "bouncy": "bounce-in",
            "spring": "spring-in",
            "slide": "slide-up",
            "fade": "fade-in",
            "scale": "scale-in",
            "rotate": "rotate-in",
        }
        return mapping.get(v_lower, "fade-in")

    icon: Optional[str] = None  # Iconify icon ID (e.g. "mdi:heart")
    lineWidth: Optional[float] = None
    props: Optional[Dict[str, Any]] = None
    style: Optional[LayerStyle] = None

    # ── Style* component props ─────────────────────────────────────────────
    variant: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    value: Optional[float] = None
    max: Optional[float] = None
    size: Optional[Union[str, int, float]] = None

    @field_validator("size", mode="before")
    @classmethod
    def normalize_size(cls, v: Any) -> Optional[str]:
        """Accept both string and numeric sizes. Convert numbers to string for consistency."""
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return str(int(v)) if v == int(v) else str(v)
        return str(v)

    prefix: Optional[str] = None
    suffix: Optional[str] = None
    format: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None
    points: Optional[List[Dict[str, Any]]] = None
    maxLines: Optional[int] = None
    showLabel: Optional[bool] = None
    showLabels: Optional[bool] = None
    showValues: Optional[bool] = None
    showGrid: Optional[bool] = None
    showDots: Optional[bool] = None
    lineColor: Optional[str] = None
    fillArea: Optional[bool] = None
    decimals: Optional[int] = None
    characters: Optional[str] = None
    loop: Optional[bool] = None
    separator: Optional[str] = None
    hoverFrame: Optional[int] = None
    hoverDuration: Optional[int] = None
    barHeight: Optional[float] = None
    gap: Optional[float] = None
    itemHeight: Optional[float] = None
    visibleItems: Optional[int] = None
    showScrollbar: Optional[bool] = None
    showRipple: Optional[bool] = None
    showPercentages: Optional[bool] = None
    maxValue: Optional[float] = None
    explodeSlice: Optional[int] = None
    autoplay: Optional[bool] = None
    muted: Optional[bool] = None
    name: Optional[str] = None  # For StyleAvatar
    from_: Optional[float] = Field(default=None, alias="from")  # For StyleAnimateNumber
    duration: Optional[float] = None  # For StyleAnimateNumber
    orientation: Optional[str] = None  # For StyleDivider
    thickness: Optional[float] = None  # For StyleDivider
    deletable: Optional[bool] = None  # For StyleChip
    labelPosition: Optional[str] = None  # For StyleProgressBar
    iconPosition: Optional[str] = None  # For StyleButton
    showBadge: Optional[bool] = None  # For StyleAvatar
    badgeText: Optional[str] = None  # For StyleAvatar

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
    # --- Layout Primitives (Flexbox/Grid) ---
    layout: Optional[str] = None  # "flex", "grid", "absolute"
    direction: Optional[str] = None  # "row", "column"
    justifyContent: Optional[str] = None  # "flex-start", "center", "space-between", "space-around"
    alignItems: Optional[str] = None  # "flex-start", "center", "stretch", "baseline"
    gap: Optional[int] = None  # Spacing between children in pixels
    flex: Optional[int] = None  # Growth factor (1, 2, etc.)
    zIndex: Optional[int] = None  # Stacking order

    # --- Grid Layout ---
    gridCols: Optional[int] = None  # Number of columns
    gridRows: Optional[int] = None  # Number of rows
    gridTemplateColumns: Optional[str] = None  # e.g., "1fr 1fr 1fr"
    gridTemplateRows: Optional[str] = None  # e.g., "auto auto"
    gridColumn: Optional[str] = None  # e.g., "span 2"
    gridRow: Optional[str] = None  # e.g., "span 1"

    # --- Absolute Positioning (for overlays) ---
    position: Optional[str] = None  # "relative", "absolute"
    top: Optional[int] = None
    right: Optional[int] = None
    bottom: Optional[int] = None
    left: Optional[int] = None

    # --- Animation Timing Overrides ---
    stagger: Optional[float] = None  # Delay between children animations (seconds)
    exitStart: Optional[float] = None  # Time in seconds when exit animation starts

    # --- Layout Transitions ---
    transition_duration: Optional[int] = None  # Duration in frames
    transition_easing: Optional[str] = None  # "ease-out", "ease-in-out", "spring"
    transition_spring: Optional[str] = None  # Spring preset name

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
    # Transición HACIA la siguiente escena, elegida por la IA según el tono de la
    # escena. El frontend la respeta; si falta, elige una automáticamente.
    transition: Optional[str] = Field(
        default=None,
        description=(
            "Transición hacia la siguiente escena: FadeThroughBlack | "
            "ZoomBlurTransition | WipeTransition | GlitchTransition | "
            "LightLeakTransition | GradientOverlay | ZoomThroughTransition | "
            "SpatialPush | FrostedGlassWipe | GridPixelateWipe | "
            "ChromaticAberrationWipe | WhipPanTransition | SlideWipe | "
            "CrossDissolve | MorphTransition | IrisTransition. "
            "Vacío = automática."
        ),
    )
    transition_color: Optional[str] = Field(default=None)
    transition_params: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Parámetros atómicos opcionales de la transición (dirección, blur, etc.).",
    )
    # DEPRECATED (v7): el frontend nunca renderiza out_transition. Ya no se
    # genera (eliminado del prompt y del schema de Gemini). Se mantiene el campo
    # opcional solo para no romper la validación de specs antiguos almacenados
    # (model_config extra="forbid"). No usar en specs nuevos.
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
    # Transición HACIA la siguiente escena (override). Si falta, el frontend elige
    # una automáticamente por continuidad. La IA puede fijarla por escena.
    transition: Optional[str] = Field(
        default=None,
        description=(
            "Transición hacia la siguiente escena: FadeThroughBlack | "
            "ZoomBlurTransition | WipeTransition | GlitchTransition | "
            "LightLeakTransition | GradientOverlay | ZoomThroughTransition | "
            "SpatialPush | FrostedGlassWipe | GridPixelateWipe | "
            "ChromaticAberrationWipe | WhipPanTransition | SlideWipe | "
            "CrossDissolve | MorphTransition | IrisTransition. "
            "Vacío = automática."
        ),
    )
    transition_color: Optional[str] = Field(
        default=None,
        description="Color del velo/barrido para Fade/Wipe/ZoomBlur (hex o rgba).",
    )
    transition_params: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Parámetros atómicos opcionales de la transición (dirección, blur, etc.).",
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
