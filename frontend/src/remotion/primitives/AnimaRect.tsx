/**
 * AnimaRect — Primitiva atómica: rectángulo animable.
 *
 * Renderiza un `<div>` con position:absolute y estilos inline.
 * Soporta animación vía AnimValue en: x, y, scale, rotation, opacity.
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

export interface AnimaRectProps {
  /**
   * Posición X del centro del rectángulo (px).
   * Puede ser número fijo o AnimValue para animación.
   */
  x: number | AnimValue;

  /**
   * Posición Y del centro del rectángulo (px).
   * Puede ser número fijo o AnimValue para animación.
   */
  y: number | AnimValue;

  /** Ancho del rectángulo en píxeles (estático). */
  width: number;

  /** Alto del rectángulo en píxeles (estático). */
  height: number;

  /** Color de relleno (hex, rgb, hsl, etc.). */
  fill: string;

  /** Radio de borde en píxeles (default: 0). */
  borderRadius?: number;

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

  /** Color del borde (opcional). */
  stroke?: string;

  /** Grosor del borde en píxeles (default: 2 si stroke está definido). */
  strokeWidth?: number;

  /** Color de la sombra (opcional). */
  shadowColor?: string;

  /** Radio de desenfoque de la sombra en píxeles (default: 10). */
  shadowBlur?: number;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const AnimaRect: React.FC<AnimaRectProps> = ({
  x,
  y,
  width,
  height,
  fill,
  borderRadius = 0,
  scale = 1,
  rotation = 0,
  opacity = 1,
  stroke,
  strokeWidth,
  shadowColor,
  shadowBlur,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Resolver valores animados al frame actual
  const resolvedX = resolveAnim(x, frame, 0, fps);
  const resolvedY = resolveAnim(y, frame, 0, fps);
  const resolvedScale = resolveAnim(scale, frame, 1, fps);
  const resolvedRotation = resolveAnim(rotation, frame, 0, fps);
  const resolvedOpacity = resolveAnim(opacity, frame, 1, fps);

  // Construir estilos inline — sin Tailwind, sin Framer Motion
  const style: React.CSSProperties = {
    position: 'absolute',
    left: resolvedX,
    top: resolvedY,
    width,
    height,
    backgroundColor: fill,
    borderRadius,
    transform: [
      'translate(-50%, -50%)',
      `scale(${resolvedScale})`,
      `rotate(${resolvedRotation}deg)`,
    ].join(' '),
    transformOrigin: 'center center',
    opacity: resolvedOpacity,
    pointerEvents: 'none', // evita interferencias en la interfaz Remotion
    boxSizing: 'border-box',
  };

  // Borde condicional
  if (stroke) {
    style.border = `${strokeWidth ?? 2}px solid ${stroke}`;
  }

  // Sombra condicional
  if (shadowColor) {
    style.boxShadow = `0 0 ${shadowBlur ?? 10}px ${shadowColor}`;
  }

  return <div style={style} />;
};
