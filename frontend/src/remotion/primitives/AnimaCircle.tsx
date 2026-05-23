/**
 * AnimaCircle — Primitiva atómica: círculo animable.
 *
 * Renderiza un `<div>` con borderRadius:50% y position:absolute.
 * Sigue exactamente el mismo patrón que AnimaRect.
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

export interface AnimaCircleProps {
  /**
   * Centro X del círculo (px).
   * Puede ser número fijo o AnimValue para animación.
   */
  cx: number | AnimValue;

  /**
   * Centro Y del círculo (px).
   * Puede ser número fijo o AnimValue para animación.
   */
  cy: number | AnimValue;

  /** Radio del círculo en píxeles. */
  r: number;

  /** Color de relleno (hex, rgb, hsl, etc.). */
  fill: string;

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

export const AnimaCircle: React.FC<AnimaCircleProps> = ({
  cx,
  cy,
  r,
  fill,
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
  const resolvedCx = resolveAnim(cx, frame, 0, fps);
  const resolvedCy = resolveAnim(cy, frame, 0, fps);
  const resolvedScale = resolveAnim(scale, frame, 1, fps);
  const resolvedRotation = resolveAnim(rotation, frame, 0, fps);
  const resolvedOpacity = resolveAnim(opacity, frame, 1, fps);

  // Calcular dimensiones a partir del radio
  const diameter = r * 2;

  // Construir estilos inline — sin Tailwind, sin Framer Motion
  const style: React.CSSProperties = {
    position: 'absolute',
    left: resolvedCx,
    top: resolvedCy,
    width: diameter,
    height: diameter,
    backgroundColor: fill,
    borderRadius: '50%',
    transform: [
      'translate(-50%, -50%)',
      `scale(${resolvedScale})`,
      `rotate(${resolvedRotation}deg)`,
    ].join(' '),
    transformOrigin: 'center center',
    opacity: resolvedOpacity,
    pointerEvents: 'none',
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
