import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * AbstractWave — ondas sinusoidales suaves superpuestas (acento decorativo).
 *
 * Totalmente atómico: nº de ondas, color, amplitud, frecuencia, velocidad,
 * dirección del desplazamiento y separación vertical entre ondas. Posicionable
 * con x/y (centro) y width/height. Determinista (función pura de frame).
 */
interface AbstractWaveProps extends UniversalProps {
  /** Nº de ondas superpuestas. */
  waveCount?: number;
  /** Altura del pico de la onda principal (px). */
  amplitude?: number;
  /** Frecuencia (nº de crestas a lo ancho). */
  frequency?: number;
  /** Velocidad del desplazamiento. */
  speed?: number;
  /** Dirección del desplazamiento. 'still' = estacionaria. */
  direction?: 'right' | 'left' | 'still';
  /** Separación vertical entre ondas (px). */
  separation?: number;
  /** Grosor de trazo de la onda principal (px). */
  strokeWidth?: number;
  /** Resplandor de las ondas. */
  glow?: boolean;
}

export const AbstractWave: React.FC<AbstractWaveProps> = ({
  color = '#818cf8', // Indigo
  x = 540,
  y = 960,
  delay = 0,
  width = 1080,
  height = 400,
  waveCount = 3,
  amplitude = 150,
  frequency = 1,
  speed = 1,
  direction = 'right',
  separation = 0,
  strokeWidth = 12,
  glow = true,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const count = Math.max(1, Math.round(waveCount));
  const dirSign = direction === 'left' ? -1 : direction === 'still' ? 0 : 1;
  // Resolución proporcional al ancho (más ancho = más puntos, curvas suaves).
  const numPoints = Math.max(24, Math.round(width / 20));
  const stepX = width / numPoints;

  const waves: string[] = [];
  for (let w = 0; w < count; w++) {
    const pts: string[] = [];
    const waveSpeed = (w + 1) * 0.05 * speed * dirSign;
    const amp = amplitude * (1 - w * 0.2); // más pequeñas detrás
    const freq = (0.01 + w * 0.005) * frequency;
    const yOffset = (w - (count - 1) / 2) * separation; // reparte la separación

    for (let i = 0; i <= numPoints; i++) {
      const px = i * stepX;
      const py = height / 2 + yOffset + Math.sin(px * freq + adjustedFrame * waveSpeed) * amp;
      pts.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
    }
    waves.push(pts.join(' '));
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 2,
      }}
    >
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {waves.map((pathD, i) => (
          <path
            key={i}
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={Math.max(1, strokeWidth - i * 3)}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity: 1 - i * 0.25,
              filter: glow ? `drop-shadow(0 0 ${10 + i * 5}px ${color})` : undefined,
            }}
          />
        ))}
      </svg>
    </div>
  );
};
