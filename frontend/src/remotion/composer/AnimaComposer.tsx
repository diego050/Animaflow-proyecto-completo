/**
 * AnimaComposer — Intérprete universal de escenas JSON.
 *
 * Toma un `spec.json` que describe una escena completa (background + layers)
 * y lo convierte en componentes React visuales en tiempo de ejecución.
 *
 * NO usa eval(), NO usa babel standalone, NO usa dangerouslySetInnerHTML.
 * Es 100% determinista: mismas props + mismo frame = mismo output visual.
 *
 * @packageDocumentation
 */

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

import { AnimaRect } from '../primitives/AnimaRect';
import { AnimaCircle } from '../primitives/AnimaCircle';
import { AnimaPath } from '../primitives/AnimaPath';
import { AnimaText } from '../primitives/AnimaText';
import { AnimaImage } from '../primitives/AnimaImage';
import { AnimaGroup } from '../primitives/AnimaGroup';
import { AnimaParticles } from '../primitives/AnimaParticles';
import { AnimaGradient } from '../primitives/AnimaGradient';
import { COMPONENT_REGISTRY } from '../registry';
import { AnimatedWrapper } from '../AnimatedWrapper';
import { solveLayout, SolvedLayer } from '../utils/layoutSolver';

import type { AnimValue } from '../primitives/types';

// ---------------------------------------------------------------------------
// Tipos del spec JSON
// ---------------------------------------------------------------------------

export interface BackgroundSpec {
  type: 'solid' | 'linear-gradient' | 'radial-gradient';
  colors: string[];
  angle?: number;
  center?: [number, number];
}

export interface LayerSpec {
  id?: string;

  /** Tipo de primitiva visual a renderizar. */
  type: 'rect' | 'circle' | 'path' | 'text' | 'image' | 'group' | 'particles' | 'component';

  // -- component -----------------------------------------------------------
  componentName?: string;
  props?: Record<string, any>;

  // -- Propiedades de transformación universales (animables) ----------------
  x?: number | AnimValue;
  y?: number | AnimValue;
  scale?: number | AnimValue;
  rotation?: number | AnimValue;
  opacity?: number | AnimValue;

  // -- rect ----------------------------------------------------------------
  width?: number;
  height?: number;
  borderRadius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;

  // -- circle --------------------------------------------------------------
  r?: number;

  // -- path ----------------------------------------------------------------
  pathData?: string;

  // -- text ----------------------------------------------------------------
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';

  // -- image ---------------------------------------------------------------
  src?: string;
  fit?: 'cover' | 'contain';

  // -- group ---------------------------------------------------------------
  children?: LayerSpec[];

  // -- particles -----------------------------------------------------------
  count?: number;
  shape?: 'circle' | 'rect' | 'star';
  spread?: number;
  colors?: string[];

  // -- entry animations ----------------------------------------------------
  entry?: 'fade-in' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale-in' | 'bounce-in' | 'spring-in' | null;
  entryDelay?: number;

  // -- exit animations ---------------------------------------------------
  exit?: 'fade-out' | 'slide-up-out' | 'slide-down-out' | 'slide-left-out' | 'slide-right-out' | 'scale-out' | 'spring-out' | 'bounce-out' | null;
  exitDelay?: number;
  entryDuration?: number;
  exitDuration?: number;

  // -- CSS filter (ej: 'blur(5px)', 'brightness(1.2)') --------------------
  filter?: string | null;

  // --- Layout Primitives (Flexbox/Grid) ---
  layout?: 'flex' | 'grid' | 'absolute';
  direction?: 'row' | 'column';
  justifyContent?: 'flex-start' | 'center' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'center' | 'stretch' | 'baseline';
  gap?: number;
  flex?: number;
  zIndex?: number;

  // --- Absolute Positioning (for overlays) ---
  position?: 'relative' | 'absolute';
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;

  // --- Animation Timing Overrides ---
  stagger?: number; // Delay between children animations (seconds)
  exitStart?: number; // Time in seconds when exit animation starts
}

export interface AnimaComposerProps {
  /** JSON de escena completo. */
  spec: {
    version?: string;
    background: BackgroundSpec;
    layers: LayerSpec[];
  };

  /** Texto de la escena (para reemplazar {{text}} en layers de tipo text). */
  text?: string;

  /** Duración total en frames (override de useVideoConfig si se provee). */
  durationInFrames?: number;

  /** Background colors of the NEXT scene (for crossfade transition). */
  nextSceneBackgroundColors?: string[];
}

// ---------------------------------------------------------------------------
// Contexto de renderizado (se pasa a funciones hijas para evitar hooks
// en funciones no-componente)
// ---------------------------------------------------------------------------

interface RenderContext {
  frame: number;
  width: number;
  height: number;
  fps: number;
  text: string;
  durationInFrames: number;
}

// ---------------------------------------------------------------------------
// FilterWrapper
// ---------------------------------------------------------------------------

/**
 * FilterWrapper — Aplica un filtro CSS al layer envuelto.
 * Crea un nuevo stacking context, pero es necesario para efectos como blur.
 */
const FilterWrapper: React.FC<{
  filter: string | null | undefined;
  children: React.ReactNode;
}> = ({ filter, children }) => {
  if (!filter) return <>{children}</>;

  return (
    <div
      style={{
        position: 'relative',
        filter,
        pointerEvents: 'none',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Renderizador de layers
// ---------------------------------------------------------------------------

/**
 * renderSingleLayer — Renderiza una capa individual del spec.
 *
 * Cada tipo de capa mapea a una primitiva específica.
 * El switch es la única lógica de enrutamiento: no hay eval, no hay
 * Function constructor, no hay babel standalone.
 */
function renderSingleLayer(
  layer: SolvedLayer,
  index: number,
  ctx: RenderContext,
): React.ReactNode {
  const key = layer.id ?? `layer-${index}`;

  // --- Texto: resolver {{text}} placeholder ---
  const displayText =
    layer.type === 'text'
      ? layer.text?.replace('{{text}}', ctx.text) ?? ''
      : undefined;

  // --- Construir el elemento según el tipo ---
  let element: React.ReactNode;

  switch (layer.type) {
    // ===================================================================
    // RECT
    // ===================================================================
    case 'rect': {
      element = (
        <AnimaRect
          x={Number(layer.x) ?? 0}
          y={Number(layer.y) ?? 0}
          width={Number(layer.width) ?? 100}
          height={Number(layer.height) ?? 100}
          fill={(layer.fill as string) ?? '#ffffff'}
          borderRadius={layer.borderRadius as number | undefined}
          scale={layer.scale as number | AnimValue | undefined}
          rotation={layer.rotation as number | AnimValue | undefined}
          opacity={layer.opacity as number | AnimValue | undefined}
          stroke={layer.stroke as string | undefined}
          strokeWidth={layer.strokeWidth as number | undefined}
        />
      );

      // Envolver con entry si no hay soporte nativo
      element = (
        <AnimatedWrapper
          entry={layer.entry ?? null}
          exit={layer.exit ?? null}
          delay={layer.entryDelay ?? 0}
          entryDuration={layer.entryDuration ?? 30}
          exitDuration={layer.exitDuration ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      // Envolver con filter si está definido
      element = <FilterWrapper filter={layer.filter}>{element}</FilterWrapper>;

      return <React.Fragment key={key}>{element}</React.Fragment>;
    }

    // ===================================================================
    // CIRCLE
    // ===================================================================
    case 'circle': {
      if (layer.r === undefined || layer.r === null) {
        console.warn(
          `[AnimaComposer] Layer "${key}" type "circle" requires "r" (radius). Skipping.`,
        );
        return null;
      }

      element = (
        <AnimaCircle
          cx={Number(layer.x) ?? 0}
          cy={Number(layer.y) ?? 0}
          r={Number(layer.r)}
          fill={(layer.fill as string) ?? '#ffffff'}
          scale={layer.scale as number | AnimValue | undefined}
          rotation={layer.rotation as number | AnimValue | undefined}
          opacity={layer.opacity as number | AnimValue | undefined}
          stroke={layer.stroke as string | undefined}
          strokeWidth={layer.strokeWidth as number | undefined}
        />
      );

      // Entry wrapper
      element = (
        <AnimatedWrapper
          entry={layer.entry ?? null}
          exit={layer.exit ?? null}
          delay={layer.entryDelay ?? 0}
          entryDuration={layer.entryDuration ?? 30}
          exitDuration={layer.exitDuration ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      element = <FilterWrapper filter={layer.filter}>{element}</FilterWrapper>;

      return <React.Fragment key={key}>{element}</React.Fragment>;
    }

    // ===================================================================
    // PATH
    // ===================================================================
    case 'path': {
      if (!layer.pathData) {
        console.warn(
          `[AnimaComposer] Layer "${key}" type "path" requires "pathData". Skipping.`,
        );
        return null;
      }

      element = (
        <AnimaPath
          pathData={layer.pathData as string}
          x={layer.x as number | undefined}
          y={layer.y as number | undefined}
          fill={layer.fill as string | undefined}
          stroke={layer.stroke as string | undefined}
          strokeWidth={layer.strokeWidth as number | undefined}
          scale={layer.scale as number | AnimValue | undefined}
          rotation={layer.rotation as number | AnimValue | undefined}
          opacity={layer.opacity as number | AnimValue | undefined}
        />
      );

      element = (
        <AnimatedWrapper
          entry={layer.entry ?? null}
          exit={layer.exit ?? null}
          delay={layer.entryDelay ?? 0}
          entryDuration={layer.entryDuration ?? 30}
          exitDuration={layer.exitDuration ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      element = <FilterWrapper filter={layer.filter}>{element}</FilterWrapper>;

      return <React.Fragment key={key}>{element}</React.Fragment>;
    }

    // ===================================================================
    // TEXT
    // ===================================================================
    case 'text': {
      element = (
        <AnimaText
          text={displayText!}
          x={layer.x as number | undefined}
          y={layer.y as number | undefined}
          fontSize={layer.fontSize as number | undefined}
          fontWeight={layer.fontWeight as number | undefined}
          color={layer.fill as string | undefined}
          letterSpacing={layer.letterSpacing as number | undefined}
          textAlign={layer.textAlign as 'left' | 'center' | 'right' | undefined}
          scale={layer.scale as number | AnimValue | undefined}
          rotation={layer.rotation as number | AnimValue | undefined}
          opacity={layer.opacity as number | AnimValue | undefined}
        />
      );

      element = (
        <AnimatedWrapper
          entry={layer.entry ?? null}
          exit={layer.exit ?? null}
          delay={layer.entryDelay ?? 0}
          entryDuration={layer.entryDuration ?? 30}
          exitDuration={layer.exitDuration ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      element = <FilterWrapper filter={layer.filter}>{element}</FilterWrapper>;

      return <React.Fragment key={key}>{element}</React.Fragment>;
    }

    // ===================================================================
    // IMAGE
    // ===================================================================
    case 'image': {
      if (!layer.src) {
        console.warn(
          `[AnimaComposer] Layer "${key}" type "image" requires "src". Skipping.`,
        );
        return null;
      }

      element = (
        <AnimaImage
          src={layer.src as string}
          x={layer.x as number | undefined}
          y={layer.y as number | undefined}
          width={layer.width as number | undefined}
          height={layer.height as number | undefined}
          fit={layer.fit as 'cover' | 'contain' | undefined}
          scale={layer.scale as number | AnimValue | undefined}
          rotation={layer.rotation as number | AnimValue | undefined}
          opacity={layer.opacity as number | AnimValue | undefined}
          borderRadius={layer.borderRadius as number | undefined}
        />
      );

      element = (
        <AnimatedWrapper
          entry={layer.entry ?? null}
          exit={layer.exit ?? null}
          delay={layer.entryDelay ?? 0}
          entryDuration={layer.entryDuration ?? 30}
          exitDuration={layer.exitDuration ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      element = <FilterWrapper filter={layer.filter}>{element}</FilterWrapper>;

      return <React.Fragment key={key}>{element}</React.Fragment>;
    }

    // ===================================================================
    // GROUP
    // ===================================================================
    case 'group': {
      const children = (layer.children ?? []) as SolvedLayer[];

      // If this is a flex group, render children with absolute positions
      if (layer.layout === 'flex') {
        element = (
          <div
            style={{
              position: 'absolute',
              left: layer.x,
              top: layer.y,
              width: layer.width,
              height: layer.height,
              display: 'flex',
              flexDirection: (layer.direction as 'row' | 'column') || 'column',
              justifyContent: (layer.justifyContent as React.CSSProperties['justifyContent']) || 'flex-start',
              alignItems: (layer.alignItems as React.CSSProperties['alignItems']) || 'flex-start',
              gap: layer.gap || 0,
              zIndex: layer.zIndex || 0,
            }}
          >
            {renderLayerList(children, ctx)}
          </div>
        );
      } else {
        // Default behavior for non-flex groups
        element = (
          <AnimaGroup
            x={layer.x as number | undefined}
            y={layer.y as number | undefined}
            scale={layer.scale as number | AnimValue | undefined}
            rotation={layer.rotation as number | AnimValue | undefined}
            opacity={layer.opacity as number | AnimValue | undefined}
          >
            {renderLayerList(children, ctx)}
          </AnimaGroup>
        );
      }

      element = (
        <AnimatedWrapper
          entry={layer.entry ?? null}
          exit={layer.exit ?? null}
          delay={layer.entryDelay ?? 0}
          entryDuration={layer.entryDuration ?? 30}
          exitDuration={layer.exitDuration ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      element = <FilterWrapper filter={layer.filter}>{element}</FilterWrapper>;

      return <React.Fragment key={key}>{element}</React.Fragment>;
    }

    // ===================================================================
    // PARTICLES
    // ===================================================================
    case 'particles': {
      element = (
        <AnimaParticles
          count={Number(layer.count) ?? 20}
          shape={layer.shape as 'circle' | 'rect' | 'star' | undefined}
          spread={Number(layer.spread) ?? 200}
          colors={(layer.colors as string[]) ?? ['#ffffff']}
          x={layer.x as number | undefined}
          y={layer.y as number | undefined}
          scale={layer.scale as number | AnimValue | undefined}
          rotation={layer.rotation as number | AnimValue | undefined}
          opacity={layer.opacity as number | AnimValue | undefined}
        />
      );

      element = (
        <AnimatedWrapper
          entry={layer.entry ?? null}
          exit={layer.exit ?? null}
          delay={layer.entryDelay ?? 0}
          entryDuration={layer.entryDuration ?? 30}
          exitDuration={layer.exitDuration ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      element = <FilterWrapper filter={layer.filter}>{element}</FilterWrapper>;

      return <React.Fragment key={key}>{element}</React.Fragment>;
    }

    // ===================================================================
    // COMPONENT (Standard Library integration)
    // ===================================================================
    case 'component': {
      if (!layer.componentName) {
        console.warn(`[AnimaComposer] Layer "${key}" type "component" requires "componentName".`);
        return null;
      }
      
      const ComponentToRender = COMPONENT_REGISTRY[layer.componentName];
      if (!ComponentToRender) {
        console.warn(`[AnimaComposer] Component "${layer.componentName}" not found in registry.`);
        return null;
      }

      // Use solved absolute coordinates directly
      const absoluteX = layer.x;
      const absoluteY = layer.y;

      // Merge props and resolve {{text}} placeholder if present
      const mergedProps: Record<string, any> = {
        ...layer,
        x: absoluteX,
        y: absoluteY,
        text: typeof layer.text === 'string' 
          ? layer.text.replace('{{text}}', ctx.text) 
          : ctx.text,
      };

      element = <ComponentToRender {...mergedProps} />;

      element = (
        <AnimatedWrapper
          entry={layer.entry ?? null}
          exit={layer.exit ?? null}
          delay={layer.entryDelay ?? 0}
          entryDuration={layer.entryDuration ?? 30}
          exitDuration={layer.exitDuration ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      element = <FilterWrapper filter={layer.filter}>{element}</FilterWrapper>;

      return <React.Fragment key={key}>{element}</React.Fragment>;
    }

    // ===================================================================
    // UNKNOWN
    // ===================================================================
    default:
      console.warn(
        `[AnimaComposer] Unknown layer type: "${(layer as any).type}". Skipping.`,
      );
      return null;
  }
}

/**
 * renderLayerList — Renderiza un array de layers, usado tanto para el
 * nivel superior como para grupos anidados.
 */
function renderLayerList(
  layers: SolvedLayer[],
  ctx: RenderContext,
): React.ReactNode {
  if (!layers || layers.length === 0) return null;

  return (
    <>
      {layers.map((layer, index) => renderSingleLayer(layer, index, ctx))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * AnimaComposer — Componente principal que interpreta un spec.json completo
 * y renderiza toda la escena.
 *
 * @example
 * ```tsx
 * <AnimaComposer
 *   spec={{
 *     background: { type: 'solid', colors: ['#1a1a2e'] },
 *     layers: [
 *       { type: 'rect', x: 100, y: 200, width: 300, height: 80, fill: '#e94560', borderRadius: 12 },
 *       { type: 'text', text: 'Hello {{text}}', x: 250, y: 240, fontSize: 32, fill: '#ffffff' },
 *     ],
 *   }}
 *   text="World"
 * />
 * ```
 */
export const AnimaComposer: React.FC<AnimaComposerProps> = ({
  spec,
  text = '',
  durationInFrames: _durationInFrames,
  nextSceneBackgroundColors,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const actualDurationInFrames = _durationInFrames || Math.round((spec.layers.length > 0 ? 3 : 3) * fps);

  // Solve layout to get absolute coordinates
  const solvedLayers = solveLayout(spec, width, height);

  // -----------------------------------------------------------------------
  // Background with crossfade (z-index: 0)
  // -----------------------------------------------------------------------
  const crossfadeFrames = 15; // last 15 frames (0.5s at 30fps)
  const crossfadeStart = actualDurationInFrames - crossfadeFrames;

  let backgroundColors = spec.background.colors;
  let backgroundType = spec.background.type;
  let backgroundAngle = spec.background.angle;
  let backgroundCenter = spec.background.center;

  // If we have next scene colors and we're in the crossfade window, interpolate
  if (nextSceneBackgroundColors && nextSceneBackgroundColors.length > 0 && frame >= crossfadeStart) {
    const progress = Math.min(1, (frame - crossfadeStart) / crossfadeFrames);
    // Use the next scene's colors as the target
    backgroundColors = nextSceneBackgroundColors;
    backgroundType = spec.background.type; // keep same gradient type
  }

  const background = (
    <AnimaGradient
      type={backgroundType}
      colors={backgroundColors}
      angle={backgroundAngle}
      center={backgroundCenter}
      width={width}
      height={height}
    />
  );

  // -----------------------------------------------------------------------
  // Layers (z-index: 1+)
  // -----------------------------------------------------------------------
  const ctx: RenderContext = { frame, width, height, fps, text, durationInFrames: actualDurationInFrames };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      {background}
      {renderLayerList(solvedLayers.layers as SolvedLayer[], ctx)}
    </div>
  );
};


