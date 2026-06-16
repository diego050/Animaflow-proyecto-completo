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
import { COMPONENT_REGISTRY, resolveComponentAlias } from '../registry';
import { AnimatedWrapper } from '../AnimatedWrapper';
import type { EntryType, ExitType } from '../AnimatedWrapper';
import { solveLayout } from '../utils/layoutSolver';
import type { SolvedLayer } from '../utils/layoutSolver';
import { sanitizeComponentProps } from '../utils/sanitizeProps';

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

  // --- Grid Layout ---
  gridCols?: number;
  gridRows?: number;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;

  // --- Absolute Positioning (for overlays) ---
  position?: 'relative' | 'absolute';
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;

  // --- Animation Timing Overrides ---
  stagger?: number; // Delay between children animations (seconds)
  exitStart?: number; // Time in seconds when exit animation starts

  // --- Layout Transitions ---
  transitionDuration?: number;
  transitionEasing?: 'ease-out' | 'ease-in-out' | 'spring';
  transitionSpring?: string;

  // --- LayerStyle ---
  style?: Record<string, unknown>;
}

/** Tiempo de una palabra hablada, RELATIVO al inicio de la escena (segundos). */
export interface WordTiming {
  word: string;
  start: number;
  end: number;
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

  /**
   * Timestamps por palabra, relativos al inicio de la escena (segundos).
   * Habilita reveal sincronizado al audio (karaoke) y, a futuro, disparar
   * animaciones/componentes en una palabra concreta.
   */
  wordTimestamps?: WordTiming[];
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
  wordTimestamps?: WordTiming[];
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
// LayerStyle → CSS converter
// ---------------------------------------------------------------------------

/**
 * Convert LayerStyle object to CSS properties for inline styling.
 */
function layerStyleToCSS(style: Record<string, unknown> | undefined): React.CSSProperties {
  if (!style) return {};

  const css: React.CSSProperties = {};

  // Spacing
  if (style.padding !== undefined) {
    const p = style.padding;
    css.padding = typeof p === 'number' ? `${p}px` : Array.isArray(p) ? p.map(v => `${v}px`).join(' ') : `${p}px`;
  }
  if (style.margin !== undefined) {
    const m = style.margin;
    css.margin = typeof m === 'number' ? `${m}px` : Array.isArray(m) ? m.map(v => `${m}px`).join(' ') : `${m}px`;
  }

  // Borders
  if (style.borderWidth !== undefined || style.borderColor !== undefined || style.borderStyle !== undefined) {
    css.borderWidth = style.borderWidth !== undefined ? `${style.borderWidth}px` : css.borderWidth;
    css.borderColor = (style.borderColor as string) ?? css.borderColor;
    css.borderStyle = (style.borderStyle as React.CSSProperties['borderStyle']) ?? css.borderStyle;
  }
  if (style.borderRadius !== undefined) {
    css.borderRadius = `${style.borderRadius}px`;
  }

  // Effects
  if (style.boxShadow !== undefined) {
    const s = style.boxShadow as Record<string, unknown>;
    css.boxShadow = `${s.x || 0}px ${s.y || 4}px ${s.blur || 12}px ${s.spread || 0}px ${s.color || 'rgba(0,0,0,0.3)'}`;
  }
  if (style.opacity !== undefined) {
    css.opacity = style.opacity as number;
  }
  if (style.blur !== undefined) {
    css.filter = `blur(${style.blur}px)`;
  }
  if (style.backdropBlur !== undefined) {
    css.backdropFilter = `blur(${style.backdropBlur}px)`;
    css.WebkitBackdropFilter = `blur(${style.backdropBlur}px)`;
  }

  // Filters (combine into single filter string)
  const filters: string[] = [];
  if (style.brightness !== undefined) filters.push(`brightness(${style.brightness})`);
  if (style.contrast !== undefined) filters.push(`contrast(${style.contrast})`);
  if (style.saturate !== undefined) filters.push(`saturate(${style.saturate})`);
  if (style.grayscale === true) filters.push('grayscale(1)');
  if (style.hueRotate !== undefined) filters.push(`hue-rotate(${style.hueRotate}deg)`);
  if (style.invert === true) filters.push('invert(1)');
  if (filters.length > 0) {
    css.filter = (css.filter ? `${css.filter} ` : '') + filters.join(' ');
  }

  // Transforms (static)
  if (style.rotate !== undefined || style.scale !== undefined) {
    const transforms: string[] = [];
    if (style.rotate !== undefined) transforms.push(`rotate(${style.rotate}deg)`);
    if (style.scale !== undefined) {
      const sc = style.scale;
      transforms.push(typeof sc === 'number' ? `scale(${sc})` : `scale(${(sc as [number, number])[0]}, ${(sc as [number, number])[1]})`);
    }
    css.transform = transforms.join(' ');
  }
  if (style.transformOrigin !== undefined) {
    css.transformOrigin = style.transformOrigin as string;
  }

  // Typography
  if (style.lineHeight !== undefined) {
    css.lineHeight = style.lineHeight as number;
  }
  if (style.textShadow !== undefined) {
    const s = style.textShadow as Record<string, unknown>;
    css.textShadow = `${s.x || 0}px ${s.y || 0}px ${s.blur || 4}px ${s.color || 'rgba(0,0,0,0.5)'}`;
  }
  if (style.textDecoration !== undefined) {
    css.textDecoration = style.textDecoration as React.CSSProperties['textDecoration'];
  }

  // Background
  if (style.backgroundImage !== undefined) {
    css.backgroundImage = (style.backgroundImage as string).startsWith('url') ? style.backgroundImage as string : `url(${style.backgroundImage})`;
  }
  if (style.backgroundSize !== undefined) {
    css.backgroundSize = style.backgroundSize as React.CSSProperties['backgroundSize'];
  }
  if (style.backgroundPosition !== undefined) {
    css.backgroundPosition = style.backgroundPosition as string;
  }
  if (style.backgroundOpacity !== undefined) {
    (css as Record<string, unknown>).backgroundOpacity = style.backgroundOpacity as number;
  }

  // Layout
  if (style.overflow !== undefined) {
    css.overflow = style.overflow as React.CSSProperties['overflow'];
  }
  if (style.aspectRatio !== undefined) {
    css.aspectRatio = style.aspectRatio as string;
  }
  if (style.objectFit !== undefined) {
    css.objectFit = style.objectFit as React.CSSProperties['objectFit'];
  }
  if (style.flexWrap !== undefined) {
    css.flexWrap = style.flexWrap as React.CSSProperties['flexWrap'];
  }
  if (style.flexGrow !== undefined) {
    css.flexGrow = style.flexGrow as number;
  }
  if (style.flexShrink !== undefined) {
    css.flexShrink = style.flexShrink as number;
  }
  if (style.order !== undefined) {
    css.order = style.order as number;
  }

  return css;
}

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
  const key = (layer.id as string | undefined) ?? `layer-${index}`;

  // --- Texto: resolver {{text}} placeholder ---
  const displayText =
    (layer.type as string) === 'text'
      ? (layer.text as string | undefined)?.replace('{{text}}', ctx.text) ?? ''
      : undefined;

  // --- Construir el elemento según el tipo ---
  let element: React.ReactNode;

  switch (layer.type as string) {
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
          entry={(layer.entry as EntryType | null) ?? null}
          exit={(layer.exit as ExitType | null) ?? null}
          delay={(layer.entryDelay as number | undefined) ?? 0}
          entryDuration={(layer.entryDuration as number | undefined) ?? 30}
          exitDuration={(layer.exitDuration as number | undefined) ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      // Apply LayerStyle
      const styleCSS = layerStyleToCSS(layer.style as Record<string, unknown> | undefined);
      if (Object.keys(styleCSS).length > 0) {
        element = (
          <div style={{ position: 'absolute', left: 0, top: 0, ...styleCSS }}>
            {element}
          </div>
        );
      }

      // Envolver con filter si está definido
      element = <FilterWrapper filter={layer.filter as string | null | undefined}>{element}</FilterWrapper>;

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
          entry={(layer.entry as EntryType | null) ?? null}
          exit={(layer.exit as ExitType | null) ?? null}
          delay={(layer.entryDelay as number | undefined) ?? 0}
          entryDuration={(layer.entryDuration as number | undefined) ?? 30}
          exitDuration={(layer.exitDuration as number | undefined) ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      // Apply LayerStyle
      const circleStyleCSS = layerStyleToCSS(layer.style as Record<string, unknown> | undefined);
      if (Object.keys(circleStyleCSS).length > 0) {
        element = (
          <div style={{ position: 'absolute', left: 0, top: 0, ...circleStyleCSS }}>
            {element}
          </div>
        );
      }

      element = <FilterWrapper filter={layer.filter as string | null | undefined}>{element}</FilterWrapper>;

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
          entry={(layer.entry as EntryType | null) ?? null}
          exit={(layer.exit as ExitType | null) ?? null}
          delay={(layer.entryDelay as number | undefined) ?? 0}
          entryDuration={(layer.entryDuration as number | undefined) ?? 30}
          exitDuration={(layer.exitDuration as number | undefined) ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      // Apply LayerStyle
      const pathStyleCSS = layerStyleToCSS(layer.style as Record<string, unknown> | undefined);
      if (Object.keys(pathStyleCSS).length > 0) {
        element = (
          <div style={{ position: 'absolute', left: 0, top: 0, ...pathStyleCSS }}>
            {element}
          </div>
        );
      }

      element = <FilterWrapper filter={layer.filter as string | null | undefined}>{element}</FilterWrapper>;

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
          entry={(layer.entry as EntryType | null) ?? null}
          exit={(layer.exit as ExitType | null) ?? null}
          delay={(layer.entryDelay as number | undefined) ?? 0}
          entryDuration={(layer.entryDuration as number | undefined) ?? 30}
          exitDuration={(layer.exitDuration as number | undefined) ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      // Apply LayerStyle
      const textStyleCSS = layerStyleToCSS(layer.style as Record<string, unknown> | undefined);
      if (Object.keys(textStyleCSS).length > 0) {
        element = (
          <div style={{ position: 'absolute', left: 0, top: 0, ...textStyleCSS }}>
            {element}
          </div>
        );
      }

      element = <FilterWrapper filter={layer.filter as string | null | undefined}>{element}</FilterWrapper>;

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
          entry={(layer.entry as EntryType | null) ?? null}
          exit={(layer.exit as ExitType | null) ?? null}
          delay={(layer.entryDelay as number | undefined) ?? 0}
          entryDuration={(layer.entryDuration as number | undefined) ?? 30}
          exitDuration={(layer.exitDuration as number | undefined) ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      // Apply LayerStyle
      const imageStyleCSS = layerStyleToCSS(layer.style as Record<string, unknown> | undefined);
      if (Object.keys(imageStyleCSS).length > 0) {
        element = (
          <div style={{ position: 'absolute', left: 0, top: 0, ...imageStyleCSS }}>
            {element}
          </div>
        );
      }

      element = <FilterWrapper filter={layer.filter as string | null | undefined}>{element}</FilterWrapper>;

      return <React.Fragment key={key}>{element}</React.Fragment>;
    }

    // ===================================================================
    // GROUP
    // ===================================================================
    case 'group': {
      const children = (layer.children ?? []) as SolvedLayer[];

      // If this is a grid group, render children with CSS grid
      if ((layer.layout as string | undefined) === 'grid') {
        const numCols = (layer.gridCols as number) ?? 2;
        const gap = (layer.gap as number) ?? 0;
        element = (
          <div
            style={{
              position: 'absolute',
              left: layer.x as number | undefined,
              top: layer.y as number | undefined,
              width: layer.width as number | undefined,
              height: layer.height as number | undefined,
              display: 'grid',
              gridTemplateColumns: `repeat(${numCols}, 1fr)`,
              gap: `${gap}px`,
              zIndex: (layer.zIndex as number | undefined) || 0,
              ...layerStyleToCSS(layer.style as Record<string, unknown> | undefined),
            }}
          >
            {renderLayerList(children, ctx)}
          </div>
        );
      } else if ((layer.layout as string | undefined) === 'flex') {
        element = (
          <div
            style={{
              position: 'absolute',
              left: layer.x as number | undefined,
              top: layer.y as number | undefined,
              width: layer.width as number | undefined,
              height: layer.height as number | undefined,
              display: 'flex',
              flexDirection: (layer.direction as 'row' | 'column') || 'column',
              justifyContent: (layer.justifyContent as React.CSSProperties['justifyContent']) || 'flex-start',
              alignItems: (layer.alignItems as React.CSSProperties['alignItems']) || 'flex-start',
              gap: (layer.gap as number | undefined) || 0,
              zIndex: (layer.zIndex as number | undefined) || 0,
              ...layerStyleToCSS(layer.style as Record<string, unknown> | undefined),
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
          entry={(layer.entry as EntryType | null) ?? null}
          exit={(layer.exit as ExitType | null) ?? null}
          delay={(layer.entryDelay as number | undefined) ?? 0}
          entryDuration={(layer.entryDuration as number | undefined) ?? 30}
          exitDuration={(layer.exitDuration as number | undefined) ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      // Apply LayerStyle for non-flex/grid groups (flex/grid already applied above)
      if ((layer.layout as string | undefined) !== 'flex' && (layer.layout as string | undefined) !== 'grid') {
        const groupStyleCSS = layerStyleToCSS(layer.style as Record<string, unknown> | undefined);
        if (Object.keys(groupStyleCSS).length > 0) {
          element = (
            <div style={{ position: 'absolute', left: 0, top: 0, ...groupStyleCSS }}>
              {element}
            </div>
          );
        }
      }

      element = <FilterWrapper filter={layer.filter as string | null | undefined}>{element}</FilterWrapper>;

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
          entry={(layer.entry as EntryType | null) ?? null}
          exit={(layer.exit as ExitType | null) ?? null}
          delay={(layer.entryDelay as number | undefined) ?? 0}
          entryDuration={(layer.entryDuration as number | undefined) ?? 30}
          exitDuration={(layer.exitDuration as number | undefined) ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      // Apply LayerStyle
      const particlesStyleCSS = layerStyleToCSS(layer.style as Record<string, unknown> | undefined);
      if (Object.keys(particlesStyleCSS).length > 0) {
        element = (
          <div style={{ position: 'absolute', left: 0, top: 0, ...particlesStyleCSS }}>
            {element}
          </div>
        );
      }

      element = <FilterWrapper filter={layer.filter as string | null | undefined}>{element}</FilterWrapper>;

      return <React.Fragment key={key}>{element}</React.Fragment>;
    }

    // ===================================================================
    // COMPONENT (Standard Library integration)
    // ===================================================================
    case 'component': {
      const componentName = layer.componentName as string | undefined;
      if (!componentName) {
        console.warn(`[AnimaComposer] Layer "${key}" type "component" requires "componentName".`);
        return null;
      }
      
      const resolvedName = resolveComponentAlias(componentName);
      const ComponentToRender = COMPONENT_REGISTRY[resolvedName];
      if (!ComponentToRender) {
        console.warn(`[AnimaComposer] Component "${componentName}" (resolved: "${resolvedName}") not found in registry.`);
        return null;
      }

      // Use solved absolute coordinates directly
      const absoluteX = layer.x as number;
      const absoluteY = layer.y as number;

      // Merge props and resolve {{text}} placeholder if present
      const cleanProps = sanitizeComponentProps(resolvedName, layer as unknown as Record<string, unknown>);
      const mergedProps: Record<string, any> = {
        ...cleanProps,
        x: absoluteX,
        y: absoluteY,
        // v7.2: pasar la duración de la ESCENA para que componentes de texto
        // (Typewriter, etc.) acompasen su animación al audio en vez de usar una
        // velocidad fija que deja la última palabra fuera de tiempo.
        durationInFrames: ctx.durationInFrames,
        // v7.3: timestamps por palabra (relativos a la escena) para reveal
        // sincronizado al audio (karaoke) y disparos por palabra a futuro.
        wordTimestamps: ctx.wordTimestamps,
        text: typeof cleanProps.text === 'string'
          ? (cleanProps.text as string).replace('{{text}}', ctx.text)
          : ctx.text,
      };

      element = <ComponentToRender {...mergedProps} />;

      element = (
        <AnimatedWrapper
          entry={(layer.entry as EntryType | null) ?? null}
          exit={(layer.exit as ExitType | null) ?? null}
          delay={(layer.entryDelay as number | undefined) ?? 0}
          entryDuration={(layer.entryDuration as number | undefined) ?? 30}
          exitDuration={(layer.exitDuration as number | undefined) ?? 30}
          durationInFrames={ctx.durationInFrames}
        >
          {element}
        </AnimatedWrapper>
      );

      // Apply LayerStyle
      const componentStyleCSS = layerStyleToCSS(layer.style as Record<string, unknown> | undefined);
      if (Object.keys(componentStyleCSS).length > 0) {
        element = (
          <div style={{ position: 'absolute', left: 0, top: 0, ...componentStyleCSS }}>
            {element}
          </div>
        );
      }

      element = <FilterWrapper filter={layer.filter as string | null | undefined}>{element}</FilterWrapper>;

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
  wordTimestamps,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const actualDurationInFrames = _durationInFrames || Math.round((spec.layers.length > 0 ? 3 : 3) * fps);

  // Solve layout to get absolute coordinates
  const solvedLayers = solveLayout(spec as unknown as Parameters<typeof solveLayout>[0], width, height);

  // -----------------------------------------------------------------------
  // Background (z-index: 0)
  // -----------------------------------------------------------------------
  // v8 (Fase 5): se ELIMINÓ el "crossfade" de fondo que en los últimos 15 frames
  // cambiaba de golpe al color de la SIGUIENTE escena → producía el salto de
  // color turbio (verde→marrón→azul) entre escenas. Ahora cada escena mantiene su
  // propio fondo durante toda su duración; el corte se cubre con una transición
  // limpia (FadeThroughBlack) en MainComposition. `nextSceneBackgroundColors` se
  // conserva en la firma por compatibilidad pero ya no se usa.
  void nextSceneBackgroundColors;

  const background = (
    <AnimaGradient
      type={spec.background.type}
      colors={spec.background.colors}
      angle={spec.background.angle}
      center={spec.background.center}
      width={width}
      height={height}
    />
  );

  // -----------------------------------------------------------------------
  // Layers (z-index: 1+)
  // -----------------------------------------------------------------------
  const ctx: RenderContext = { frame, width, height, fps, text, durationInFrames: actualDurationInFrames, wordTimestamps };

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


