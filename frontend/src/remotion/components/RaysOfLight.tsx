import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * RaysOfLight — rayos de luz girando desde un punto (god rays / sunburst / radial
 * beams). Atómico: color, fondo (transparente por defecto), nº de rayos, grosor,
 * opacidad, velocidad y suavizado. Posicionable con x/y (origen de los rayos).
 *
 * Cobertura: los rayos miden por la DIAGONAL del lienzo (vmax), así que cubren las
 * esquinas en cualquier formato (vertical 9:16 incluido) sin "perder forma" al girar.
 */
export interface RaysOfLightProps extends UniversalProps {
  /** Color de los rayos. */
  color1?: string;
  /** Color de fondo. 'transparent' = se superpone. */
  bgColor?: string;
  /** Número de rayos. */
  numRays?: number;
  /** Velocidad de giro (grados/frame aprox). Negativo = sentido inverso. */
  speed?: number;
  /** Grosor de cada rayo (vh). */
  rayWidth?: number;
  /** Opacidad de cada rayo (0-1). */
  rayOpacity?: number;
  /** Suavizado del difuminado central→bordes (% donde se desvanece). */
  fade?: number;
}

export const RaysOfLight: React.FC<RaysOfLightProps> = ({
  color1 = '#ffffff',
  bgColor = 'transparent',
  numRays = 12,
  speed = 0.5,
  rayWidth = 10,
  rayOpacity = 0.1,
  fade = 80,
  x,
  y,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { width, height } = useVideoConfig();

  const rotation = adjustedFrame * speed;
  const n = Math.max(1, Math.round(numRays));

  // Origen de los rayos (por defecto, centro del lienzo).
  const posX = typeof x === 'number' ? x : width / 2;
  const posY = typeof y === 'number' ? y : height / 2;

  const rays = Array.from({ length: n }).map((_, i) => {
    const angle = (360 / n) * i;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${posX}px`,
          top: `${posY}px`,
          width: '200vmax', // por la diagonal → cubre esquinas en cualquier formato
          height: `${rayWidth}vh`,
          transformOrigin: '0 50%',
          transform: `translateY(-50%) rotate(${angle}deg)`,
          opacity: rayOpacity,
          background: `linear-gradient(90deg, ${color1} 0%, transparent 100%)`,
        }}
      />
    );
  });

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
          inset: 0,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: `${posX}px ${posY}px`,
          WebkitMaskImage: `radial-gradient(circle at ${posX}px ${posY}px, black 0%, transparent ${fade}%)`,
          maskImage: `radial-gradient(circle at ${posX}px ${posY}px, black 0%, transparent ${fade}%)`,
        }}
      >
        {rays}
      </div>
    </div>
  );
};
