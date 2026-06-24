/**
 * AnimaPath — Primitiva atómica: SVG path animable.
 *
 * Renderiza un elemento <svg> con un <path> en su interior, completamente
 * animable vía AnimValue en posición (x, y), escala, rotación y opacidad.
 *
 * Útil para trazos, iconos, ilustraciones vectoriales, gráficos de líneas,
 * y cualquier elemento SVG que necesite animación en el pipeline de AnimaFlow.
 *
 * Determinista: mismas props + mismo frame = mismo output visual.
 *
 * @packageDocumentation
 */

import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

import { resolveAnim } from './types';
import type { AnimValue } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AnimaPathProps {
  /**
   * String del SVG path (atributo `d` de `<path>`).
   * Ej: "M10,10 L100,100 Z"
   */
  pathData: string;

  /**
   * Posición X del path (px). Por defecto centrado en el video.
   * Puede ser número fijo o AnimValue para animación.
   */
  x?: number | AnimValue;

  /**
   * Posición Y del path (px). Por defecto centrado en el video.
   * Puede ser número fijo o AnimValue para animación.
   */
  y?: number | AnimValue;

  /** Color de relleno del path (hex, rgb, hsl, etc.). @default 'none' */
  fill?: string;

  /** Color del trazo del path. @default '#ffffff' */
  stroke?: string;

  /** Grosor del trazo en píxeles SVG. @default 2 */
  strokeWidth?: number;

  /**
   * Escala uniforme (1 = 100%).
   * Puede ser número fijo o AnimValue para animación.
   * @default 1
   */
  scale?: number | AnimValue;

  /**
   * Rotación en grados.
   * Puede ser número fijo o AnimValue para animación.
   * @default 0
   */
  rotation?: number | AnimValue;

  /**
   * Opacidad (0 = transparente, 1 = opaco).
   * Puede ser número fijo o AnimValue para animación.
   * @default 1
   */
  opacity?: number | AnimValue;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const AnimaPath: React.FC<AnimaPathProps> = ({
  pathData,
  x,
  y,
  fill = 'none',
  stroke = '#ffffff',
  strokeWidth = 2,
  scale = 1,
  rotation = 0,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Resolver valores animados al frame actual
  const resolvedX = resolveAnim(x, frame, 0, fps);
  const resolvedY = resolveAnim(y, frame, 0, fps);
  const resolvedScale = resolveAnim(scale, frame, 1, fps);
  const resolvedRotation = resolveAnim(rotation, frame, 0, fps);
  const resolvedOpacity = resolveAnim(opacity, frame, 1, fps);

  // Construir transform: la posición se aplica como translate para que
  // el path pueda dibujarse en coordenadas absolutas sin re-posicionarlo.
  // v7: x/y = CENTRO absoluto resuelto por layoutSolver (no offset desde 50%).
  const transform = [
    `translate(${resolvedX}px, ${resolvedY}px)`,
    `scale(${resolvedScale})`,
    `rotate(${resolvedRotation}deg)`,
  ].join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform,
        transformOrigin: 'center center',
        opacity: resolvedOpacity,
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      <path
        d={pathData}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
