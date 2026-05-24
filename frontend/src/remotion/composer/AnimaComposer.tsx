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
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';

import { AnimaRect } from '../primitives/AnimaRect';
import { AnimaCircle } from '../primitives/AnimaCircle';
import { AnimaPath } from '../primitives/AnimaPath';
import { AnimaText } from '../primitives/AnimaText';
import { AnimaImage } from '../primitives/AnimaImage';
import { AnimaGroup } from '../primitives/AnimaGroup';
import { AnimaParticles } from '../primitives/AnimaParticles';
import { AnimaGradient } from '../primitives/AnimaGradient';
import { COMPONENT_REGISTRY } from '../registry';

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

  // -- CSS filter (ej: 'blur(5px)', 'brightness(1.2)') --------------------
  filter?: string | null;
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
}

// ---------------------------------------------------------------------------
// Entry animation helper
// ---------------------------------------------------------------------------

/**
 * Valores calculados de animación de entrada.
 */
interface EntryValues {
  opacity: number;
  scale: number;
  yOffset: number;
  xOffset: number;
}

/**
 * Duración en frames de las animaciones de entrada (~1s a 30fps).
 */
const ENTRY_DURATION = 30;

/**
 * computeEntry — Calcula los valores de animación de entrada para un frame dado.
 *
 * Retorna un objeto con opacity, scale, yOffset, xOffset que se combinan
 * con las props del layer para producir la animación de entrada.
 *
 * Si el entry es `null`, retorna valores neutros (opacity=1, scale=1, offsets=0).
 * Si la animación ya completó (rawProgress >= 1), también retorna valores neutros.
 */
function computeEntry(
  entry: LayerSpec['entry'],
  entryDelay: number | undefined,
  frame: number,
  fps: number,
): EntryValues {
  if (!entry) {
    return { opacity: 1, scale: 1, yOffset: 0, xOffset: 0 };
  }

  const delay = entryDelay ?? 0;
  const adjustedFrame = Math.max(0, frame - delay);
  const rawProgress = Math.min(1, Math.max(0, adjustedFrame / ENTRY_DURATION));

  // Si la entrada ya se completó, retornar valores neutros
  if (rawProgress >= 1) {
    return { opacity: 1, scale: 1, yOffset: 0, xOffset: 0 };
  }

  switch (entry) {
    case 'fade-in': {
      const progress = Easing.out(Easing.sin)(rawProgress);
      return { opacity: progress, scale: 1, yOffset: 0, xOffset: 0 };
    }

    case 'slide-up': {
      const progress = Easing.out(Easing.sin)(rawProgress);
      return {
        opacity: progress,
        scale: 1,
        yOffset: interpolate(progress, [0, 1], [50, 0]),
        xOffset: 0,
      };
    }

    case 'slide-down': {
      const progress = Easing.out(Easing.sin)(rawProgress);
      return {
        opacity: progress,
        scale: 1,
        yOffset: interpolate(progress, [0, 1], [-50, 0]),
        xOffset: 0,
      };
    }

    case 'slide-left': {
      const progress = Easing.out(Easing.sin)(rawProgress);
      return {
        opacity: progress,
        scale: 1,
        yOffset: 0,
        xOffset: interpolate(progress, [0, 1], [50, 0]),
      };
    }

    case 'slide-right': {
      const progress = Easing.out(Easing.sin)(rawProgress);
      return {
        opacity: progress,
        scale: 1,
        yOffset: 0,
        xOffset: interpolate(progress, [0, 1], [-50, 0]),
      };
    }

    case 'scale-in': {
      const progress = Easing.out(Easing.back(1.7))(rawProgress);
      return {
        opacity: progress,
        scale: interpolate(progress, [0, 1], [0, 1]),
        yOffset: 0,
        xOffset: 0,
      };
    }

    case 'bounce-in': {
      const progress = Easing.elastic(1)(rawProgress);
      return {
        opacity: Math.min(1, progress),
        scale: progress,
        yOffset: 0,
        xOffset: 0,
      };
    }

    case 'spring-in': {
      const spr = spring({
        frame: adjustedFrame,
        fps,
        config: { damping: 12, stiffness: 80, mass: 1 },
      });
      return {
        opacity: Math.min(1, spr),
        scale: Math.min(1, spr),
        yOffset: 0,
        xOffset: 0,
      };
    }

    default:
      return { opacity: 1, scale: 1, yOffset: 0, xOffset: 0 };
  }
}

// ---------------------------------------------------------------------------
// EntryWrapper
// ---------------------------------------------------------------------------

/**
 * EntryWrapper — Envuelve una primitiva hijo para aplicar la animación de
 * entrada (opacity + transform) a primitivas que no tienen soporte nativo
 * de entry (rect, circle, path, image, group, particles).
 *
 * Usa `position: relative` para NO crear un nuevo containing block, de modo
 * que los hijos con `position: absolute` sigan referenciando al contenedor
 * principal de la escena.
 *
 * Cuando la animación se completa (entryValues neutros), se omite el wrapper
 * para evitar divs innecesarios en el árbol.
 */
const EntryWrapper: React.FC<{
  entry: LayerSpec['entry'];
  entryDelay: number | undefined;
  frame: number;
  fps: number;
  children: React.ReactNode;
}> = ({ entry, entryDelay, frame, fps, children }) => {
  const ev = computeEntry(entry, entryDelay, frame, fps);

  // Si la animación está completa o no hay entry, omitir wrapper
  if (
    !entry ||
    (ev.opacity >= 1 &&
      ev.scale >= 1 &&
      ev.yOffset === 0 &&
      ev.xOffset === 0)
  ) {
    return <>{children}</>;
  }

  const transforms: string[] = [];
  if (ev.xOffset !== 0 || ev.yOffset !== 0) {
    transforms.push(`translate(${ev.xOffset}px, ${ev.yOffset}px)`);
  }
  if (ev.scale !== 1) {
    transforms.push(`scale(${ev.scale})`);
  }

  const style: React.CSSProperties = {
    position: 'relative',
    opacity: ev.opacity,
    pointerEvents: 'none',
    boxSizing: 'border-box',
  };

  if (transforms.length > 0) {
    style.transform = transforms.join(' ');
  }

  return <div style={style}>{children}</div>;
};

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
  layer: LayerSpec,
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
          x={layer.x ?? 0}
          y={layer.y ?? 0}
          width={layer.width ?? 100}
          height={layer.height ?? 100}
          fill={layer.fill ?? '#ffffff'}
          borderRadius={layer.borderRadius}
          scale={layer.scale}
          rotation={layer.rotation}
          opacity={layer.opacity}
          stroke={layer.stroke}
          strokeWidth={layer.strokeWidth}
        />
      );

      // Envolver con entry si no hay soporte nativo
      element = (
        <EntryWrapper
          entry={layer.entry}
          entryDelay={layer.entryDelay}
          frame={ctx.frame}
          fps={ctx.fps}
        >
          {element}
        </EntryWrapper>
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
          cx={layer.x ?? 0}
          cy={layer.y ?? 0}
          r={layer.r}
          fill={layer.fill ?? '#ffffff'}
          scale={layer.scale}
          rotation={layer.rotation}
          opacity={layer.opacity}
          stroke={layer.stroke}
          strokeWidth={layer.strokeWidth}
        />
      );

      // Entry wrapper
      element = (
        <EntryWrapper
          entry={layer.entry}
          entryDelay={layer.entryDelay}
          frame={ctx.frame}
          fps={ctx.fps}
        >
          {element}
        </EntryWrapper>
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
          pathData={layer.pathData}
          x={layer.x}
          y={layer.y}
          fill={layer.fill}
          stroke={layer.stroke}
          strokeWidth={layer.strokeWidth}
          scale={layer.scale}
          rotation={layer.rotation}
          opacity={layer.opacity}
        />
      );

      element = (
        <EntryWrapper
          entry={layer.entry}
          entryDelay={layer.entryDelay}
          frame={ctx.frame}
          fps={ctx.fps}
        >
          {element}
        </EntryWrapper>
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
          x={layer.x}
          y={layer.y}
          fontSize={layer.fontSize}
          fontWeight={layer.fontWeight}
          color={layer.fill}
          letterSpacing={layer.letterSpacing}
          textAlign={layer.textAlign}
          scale={layer.scale}
          rotation={layer.rotation}
          opacity={layer.opacity}
          entry={layer.entry as AnimaTextEntry}
          entryDelay={layer.entryDelay}
        />
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
          src={layer.src}
          x={layer.x}
          y={layer.y}
          width={layer.width}
          height={layer.height}
          fit={layer.fit}
          scale={layer.scale}
          rotation={layer.rotation}
          opacity={layer.opacity}
          borderRadius={layer.borderRadius}
        />
      );

      element = (
        <EntryWrapper
          entry={layer.entry}
          entryDelay={layer.entryDelay}
          frame={ctx.frame}
          fps={ctx.fps}
        >
          {element}
        </EntryWrapper>
      );

      element = <FilterWrapper filter={layer.filter}>{element}</FilterWrapper>;

      return <React.Fragment key={key}>{element}</React.Fragment>;
    }

    // ===================================================================
    // GROUP
    // ===================================================================
    case 'group': {
      const children = layer.children ?? [];

      element = (
        <AnimaGroup
          x={layer.x}
          y={layer.y}
          scale={layer.scale}
          rotation={layer.rotation}
          opacity={layer.opacity}
        >
          {renderLayerList(children, ctx)}
        </AnimaGroup>
      );

      element = (
        <EntryWrapper
          entry={layer.entry}
          entryDelay={layer.entryDelay}
          frame={ctx.frame}
          fps={ctx.fps}
        >
          {element}
        </EntryWrapper>
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
          count={layer.count ?? 20}
          shape={layer.shape}
          spread={layer.spread ?? 200}
          colors={layer.colors ?? ['#ffffff']}
          x={layer.x}
          y={layer.y}
          scale={layer.scale}
          rotation={layer.rotation}
          opacity={layer.opacity}
        />
      );

      element = (
        <EntryWrapper
          entry={layer.entry}
          entryDelay={layer.entryDelay}
          frame={ctx.frame}
          fps={ctx.fps}
        >
          {element}
        </EntryWrapper>
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

      // Merge props and resolve {{text}} placeholder if present
      const mergedProps: Record<string, any> = {
        ...layer,
        text: typeof layer.text === 'string' 
          ? layer.text.replace('{{text}}', ctx.text) 
          : ctx.text,
      };

      element = <ComponentToRender {...mergedProps} />;

      element = (
        <EntryWrapper
          entry={layer.entry}
          entryDelay={layer.entryDelay}
          frame={ctx.frame}
          fps={ctx.fps}
        >
          {element}
        </EntryWrapper>
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
  layers: LayerSpec[],
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
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // -----------------------------------------------------------------------
  // Background (z-index: 0)
  // -----------------------------------------------------------------------
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
  const ctx: RenderContext = { frame, width, height, fps, text };

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
      {renderLayerList(spec.layers, ctx)}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tipo entry compatible con AnimaTextProps
// AnimaText soporta un subconjunto de valores de entry (sin slide-left,
// slide-right, bounce-in). Para esos casos, el entry se ignora silenciosamente
// y la capa se renderiza sin animación de entrada.
// ---------------------------------------------------------------------------

type AnimaTextEntry =
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'scale-in'
  | 'spring-in'
  | null;
