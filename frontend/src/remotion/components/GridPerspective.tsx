import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * GridPerspective — piso de cuadrícula en perspectiva (synthwave / retrowave /
 * Tron / outrun) que se desplaza hacia el horizonte.
 *
 * Atómico: color de líneas, fondo (transparente por defecto para superponer),
 * densidad (cellSize), grosor de línea, dirección del movimiento (forward/
 * backward/left/right), ángulo de perspectiva y profundidad.
 */
export interface GridPerspectiveProps extends UniversalProps {
  /** Color de las líneas. */
  color1?: string;
  /** Color de fondo. 'transparent' = se superpone sobre lo que haya detrás. */
  bgColor?: string;
  /** Grosor de las líneas (px). */
  lineWidth?: number;
  /** Tamaño de celda (px). Menor = más líneas. */
  cellSize?: number;
  /** Velocidad del desplazamiento. */
  speed?: number;
  /** Dirección del movimiento. */
  direction?: 'forward' | 'backward' | 'left' | 'right';
  /** Inclinación de la perspectiva (grados). */
  angle?: number;
  /** Profundidad de la perspectiva (px). Menor = más extremo. */
  perspective?: number;
}

export const GridPerspective: React.FC<GridPerspectiveProps> = ({
  color1 = '#38bdf8',
  bgColor = 'transparent',
  lineWidth = 2,
  cellSize = 100,
  speed = 4,
  direction = 'forward',
  angle = 60,
  perspective = 600,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  useVideoConfig();

  // Bucle suave: el desplazamiento se repite cada `cellSize`.
  const offset = (adjustedFrame * speed) % cellSize;
  let posX = 0;
  let posY = 0;
  if (direction === 'forward') posY = offset;
  else if (direction === 'backward') posY = -offset;
  else if (direction === 'right') posX = offset;
  else if (direction === 'left') posX = -offset;

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: bgColor,
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: '-50%',
          left: '-50%',
          width: '200%',
          height: '150%',
          backgroundImage: `
            linear-gradient(to right, ${color1} ${lineWidth}px, transparent ${lineWidth}px),
            linear-gradient(to bottom, ${color1} ${lineWidth}px, transparent ${lineWidth}px)
          `,
          backgroundSize: `${cellSize}px ${cellSize}px`,
          backgroundPosition: `${posX}px ${posY}px`,
          transformOrigin: 'top center',
          transform: `perspective(${perspective}px) rotateX(${angle}deg)`,
          // Fade hacia el horizonte (arriba).
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
        }}
      />
    </div>
  );
};
