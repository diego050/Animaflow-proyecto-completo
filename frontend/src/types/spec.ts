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

export interface AnimaLayer {
  id?: string;
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
  entry?: 'fade-in' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale-in' | 'spring-in' | null;
  entryDelay?: number;
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
}

export interface Spec {
  start_time_seconds: number;
  duration_seconds: number;
  text: string;
  type: string;
  media_query: string;
  animation_spec?: Record<string, unknown>;
  remotion_props?: Record<string, unknown>;
  sfx: SFX[];
  audio_url?: string;
  word_timestamps?: WordTimestamp[];
  ae_metadata?: Record<string, unknown>;
  ae_script_code?: string;
  anima_composer?: AnimaComposerSpec;
}

export interface TimelineSpec {
  scenes: Spec[];
  aspect_ratio?: string;
}
