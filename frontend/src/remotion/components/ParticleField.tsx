import React from 'react';
import { useCurrentFrame, useVideoConfig, random } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * ParticleField — campo de partículas/puntos flotando (polvo, chispas, motas).
 *
 * Atómico: color, fondo (transparente por defecto para superponer), cantidad,
 * velocidad, tamaño + variación, glow y dirección. CONFINABLE a una región con
 * x/y (centro) + width/height. Determinista (random por índice).
 */
export interface ParticleFieldProps extends UniversalProps {
  /** Color de las partículas. */
  color1?: string;
  /** Color de fondo. 'transparent' = se superpone sobre lo que haya detrás. */
  bgColor?: string;
  /** Número de partículas. */
  density?: number;
  /** Velocidad del movimiento. */
  speed?: number;
  /** Tamaño base de partícula (px). */
  particleSize?: number;
  /** Variación aleatoria de tamaño (px). */
  sizeVariation?: number;
  /** Resplandor alrededor de cada partícula. */
  glow?: boolean;
  /** Dirección del flujo. */
  direction?: 'up' | 'down';
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  color1 = '#ffffff',
  bgColor = 'transparent',
  density = 50,
  speed = 1,
  particleSize = 3,
  sizeVariation = 4,
  glow = true,
  direction = 'up',
  x,
  y,
  width,
  height,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { width: canvasWidth, height: canvasHeight } = useVideoConfig();

  // Región (caja). Por defecto, todo el lienzo.
  const W = typeof width === 'number' ? width : canvasWidth;
  const H = typeof height === 'number' ? height : canvasHeight;
  const posX = typeof x === 'number' ? x : canvasWidth / 2;
  const posY = typeof y === 'number' ? y : canvasHeight / 2;
  const dirSign = direction === 'down' ? -1 : 1;

  const n = Math.max(1, Math.round(density));
  const particles = Array.from({ length: n }).map((_, i) => {
    const rX = random(`px-${i}`);
    const rY = random(`py-${i}`);
    const rSpeed = (random(`pspeed-${i}`) * 2 + 1) * speed; // base 1..3 × speed
    const size = particleSize + random(`psize-${i}`) * sizeVariation;
    const opacity = random(`popacity-${i}`) * 0.5 + 0.2; // 0.2..0.7

    const startX = rX * W;
    const span = H + 200;
    // Avance acumulado; envuelve dentro de la región (sube o baja).
    const travel = (adjustedFrame * rSpeed * dirSign);
    let currentY = ((rY * H + (H / 2) - travel) % span + span) % span - 100;

    return { x: startX, y: currentY, size, opacity };
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${W}px`,
        height: `${H}px`,
        transform: 'translate(-50%, -50%)',
        backgroundColor: bgColor,
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: color1,
            borderRadius: '50%',
            opacity: p.opacity,
            boxShadow: glow ? `0 0 ${p.size * 2}px ${color1}` : undefined,
          }}
        />
      ))}
    </div>
  );
};
