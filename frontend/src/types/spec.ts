export interface SFX {
  keyword: string;
  time_in_seconds: number;
  file: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export type AnimValue =
  | number
  | {
      from: number;
      to: number;
      duration?: number;
      delay?: number;
      easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
      springConfig?: {
        damping: number;
        stiffness: number;
        mass?: number;
      };
    };

export interface AnimaBackground {
  type: 'solid' | 'linear-gradient' | 'radial-gradient';
  colors: string[];
  angle?: number;
  center?: [number, number];
}

export interface LayerStyle {
  // Spacing
  padding?: number | [number, number, number, number];
  margin?: number | [number, number, number, number];

  // Borders
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';

  // Effects
  boxShadow?: { x: number; y: number; blur: number; spread: number; color: string };
  opacity?: number;
  blur?: number;
  backdropBlur?: number;

  // Filters
  brightness?: number;
  contrast?: number;
  saturate?: number;
  grayscale?: boolean;
  hueRotate?: number;
  invert?: boolean;

  // Transforms (static)
  rotate?: number;
  scale?: number | [number, number];
  transformOrigin?: string;

  // Typography extras
  lineHeight?: number;
  textShadow?: { x: number; y: number; blur: number; color: string };
  textDecoration?: 'underline' | 'line-through' | 'none';

  // Background extras
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  backgroundOpacity?: number;

  // Layout extras
  overflow?: 'hidden' | 'visible' | 'scroll';
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  flexWrap?: 'wrap' | 'nowrap';
  flexGrow?: number;
  flexShrink?: number;
  order?: number;

  // SVG extras
  strokeLinecap?: 'round' | 'butt' | 'square';
  strokeDasharray?: string;

  // Index signature for Record<string, unknown> compatibility
  [key: string]: unknown;
}

export interface AnimaLayer {
  id?: string;
  label?: string;
  type: 'rect' | 'circle' | 'path' | 'text' | 'image' | 'group' | 'particles' | 'component';
  componentName?: string;
  x?: AnimValue;
  y?: AnimValue;
  scale?: AnimValue;
  rotation?: AnimValue;
  opacity?: AnimValue;
  width?: number;
  height?: number;
  borderRadius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  r?: number;
  pathData?: string;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
  src?: string;
  fit?: 'cover' | 'contain';
  children?: AnimaLayer[];
  count?: number;
  shape?: 'circle' | 'rect' | 'star';
  spread?: number;
  colors?: string[];
  entry?: 'fade-in' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale-in' | 'spring-in' | 'bounce-in' | null;
  entryDelay?: number;
  entryDuration?: number;
  exit?: 'fade-out' | 'slide-up-out' | 'slide-down-out' | 'slide-left-out' | 'slide-right-out' | 'scale-out' | 'spring-out' | 'bounce-out' | null;
  exitDelay?: number;
  exitDuration?: number;
  filter?: string | null;
  color?: string;
  color1?: string;
  color2?: string;
  bgColor?: string;
  textColor?: string;
  speed?: number;
  delay?: number;
  intensity?: number;
  theme?: string;
  url?: string;
  query?: string;
  animation?: string;
  lineWidth?: number;
  props?: Record<string, unknown>;
  style?: LayerStyle;

  // Grid Layout
  gridCols?: number;
  gridRows?: number;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;

  // Layout Transitions
  transitionDuration?: number;
  transitionEasing?: 'ease-out' | 'ease-in-out' | 'spring';
  transitionSpring?: string;
}

export interface OutTransition {
  type: 'ZoomBlurTransition' | 'WipeTransition' | 'LightLeakTransition' | 'GlitchTransition' | 'GradientOverlay' | 'NONE';
  duration_frames: number;
}

export interface AnimaComposerSpec {
  version?: string;
  background: AnimaBackground;
  layers: AnimaLayer[];
  out_transition?: OutTransition;
  /** Transición de salida elegida por la IA (la lee MainComposition). */
  transition?: string;
  transition_color?: string;
  /** Parámetros atómicos opcionales para la transición (dirección, blur, etc.). */
  transition_params?: Record<string, unknown>;
}

export interface Spec {
  start_time_seconds: number;
  duration_seconds: number;
  estimated_duration?: number;
  text: string;
  type: string;
  media_query: string;
  animation_spec?: Record<string, unknown>;
  remotion_props?: Record<string, unknown>;
  sfx: SFX[];
  audio_url: string | null;
  word_timestamps: WordTimestamp[] | null;
  ae_metadata?: Record<string, unknown>;
  ae_script_code?: string;
  anima_composer?: AnimaComposerSpec;
  /** Transición HACIA la siguiente escena (override). Si falta, se elige auto. */
  transition?: 'FadeThroughBlack' | 'ZoomBlurTransition' | 'WipeTransition' | 'GlitchTransition' | 'LightLeakTransition' | 'GradientOverlay' | 'ZoomThroughTransition' | 'SpatialPush' | 'FrostedGlassWipe' | 'GridPixelateWipe' | 'ChromaticAberrationWipe' | 'WhipPanTransition' | 'SlideWipe' | 'CrossDissolve' | 'MorphTransition' | 'IrisTransition';
  /** Color del velo/barrido para Fade/Wipe/ZoomBlur. */
  transition_color?: string;
  /** Parámetros atómicos opcionales para la transición (dirección, blur, etc.). */
  transition_params?: Record<string, unknown>;
}

export interface TimelineSpec {
  scenes: Spec[];
  aspect_ratio?: string;
}
