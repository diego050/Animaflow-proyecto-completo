/**
 * AnimaGroup — Primitiva contenedora: agrupa múltiples capas hijas
 * aplicando transformaciones comunes a todo el conjunto.
 *
 * Renderiza un `<div>` con position:absolute que actúa como «capa»
 * contenedora. Todas las transformaciones (translate, scale, rotate)
 * y la opacidad se aplican al contenedor, y los hijos las heredan
 * naturalmente a través del DOM.
 *
 * Útil para animar un conjunto de elementos como una unidad (p. ej.
 * una tarjeta con icono + texto, o un logo con múltiples formas).
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

export interface AnimaGroupProps {
  /** Capas hijas a agrupar (AnimaRect, AnimaCircle, AnimaText, etc.). */
  children: React.ReactNode;

  /**
   * Posición X del grupo en píxeles (esquina superior izquierda del contenedor).
   * Puede ser número fijo o AnimValue para animación.
   * @default 0
   */
  x?: number | AnimValue;

  /**
   * Posición Y del grupo en píxeles (esquina superior izquierda del contenedor).
   * Puede ser número fijo o AnimValue para animación.
   * @default 0
   */
  y?: number | AnimValue;

  /**
   * Escala uniforme del grupo completo (1 = 100%).
   * Afecta a todos los hijos proporcionalmente.
   * Puede ser número fijo o AnimValue para animación.
   * @default 1
   */
  scale?: number | AnimValue;

  /**
   * Rotación del grupo completo en grados.
   * Afecta a todos los hijos, rotándolos alrededor del centro del grupo.
   * Puede ser número fijo o AnimValue para animación.
   * @default 0
   */
  rotation?: number | AnimValue;

  /**
   * Opacidad del grupo completo (0 = transparente, 1 = opaco).
   * Afecta a todos los hijos uniformemente.
   * Puede ser número fijo o AnimValue para animación.
   * @default 1
   */
  opacity?: number | AnimValue;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export const AnimaGroup: React.FC<AnimaGroupProps> = ({
  children,
  x,
  y,
  scale = 1,
  rotation = 0,
  opacity = 1,
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

  return <div style={style}>{children}</div>;
};
