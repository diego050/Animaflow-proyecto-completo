/**
 * AnimaImage — Primitiva atómica: imagen animable.
 *
 * Renderiza un `<img>` con position:absolute y estilos inline.
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

export interface AnimaImageProps {
  /** URL de la imagen a renderizar. */
  src: string;

  /**
   * Posición X del centro de la imagen (px).
   * Puede ser número fijo o AnimValue para animación.
   * @default 0
   */
  x?: number | AnimValue;

  /**
   * Posición Y del centro de la imagen (px).
   * Puede ser número fijo o AnimValue para animación.
   * @default 0
   */
  y?: number | AnimValue;

  /** Ancho de la imagen en píxeles (estático). */
  width?: number;

  /** Alto de la imagen en píxeles (estático). */
  height?: number;

  /**
   * Modo de ajuste de la imagen al contenedor.
   * @default 'cover'
   */
  fit?: 'cover' | 'contain';

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

  /** Radio de borde en píxeles (default: 0). */
  borderRadius?: number;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const AnimaImage: React.FC<AnimaImageProps> = ({
  src,
  x = 0,
  y = 0,
  width,
  height,
  fit = 'cover',
  scale = 1,
  rotation = 0,
  opacity = 1,
  borderRadius = 0,
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
    // v7: x/y = CENTRO absoluto resuelto por layoutSolver; translate(-50%) centra.
    left: `${resolvedX}px`,
    top: `${resolvedY}px`,
    width,
    height,
    objectFit: fit,
    borderRadius,
    transform: [
      'translate(-50%, -50%)',
      `scale(${resolvedScale})`,
      `rotate(${resolvedRotation}deg)`,
    ].join(' '),
    transformOrigin: 'center center',
    opacity: resolvedOpacity,
    pointerEvents: 'none',
  };

  return <img src={src} alt="" style={style} draggable={false} />;
};
