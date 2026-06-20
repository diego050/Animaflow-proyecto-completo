import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * KineticBackground — fondo de gradiente EN MOVIMIENTO (degradado animado que se
 * mece lentamente). Es la capa de fondo viva; distinto de GradientOverlay (que es
 * un tinte ENCIMA del contenido) y del fondo estático de la escena.
 *
 * Atómico: lineal o radial, hasta 3 colores, ángulo y velocidad del vaivén.
 */
export interface KineticBackgroundProps extends UniversalProps {
  type?: 'linear' | 'radial';
  color1?: string;
  color2?: string;
  /** Tercer color opcional (vacío = 2 colores). */
  color3?: string;
  /** Ángulo base del gradiente lineal. */
  angle?: number;
  /** Velocidad del vaivén del gradiente. */
  speed?: number;
  /** Preset de colores heredado (neon, dark_glow). 'default' = usa color1/2/3. */
  theme?: string;
}

export const KineticBackground: React.FC<KineticBackgroundProps> = ({
  color1 = '#0f172a',
  color2 = '#312e81',
  color3 = '',
  type = 'linear',
  angle = 135,
  speed = 1,
  theme = 'default',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // Vaivén suave (ping-pong 0→100→0), continuo y controlado por `speed`.
  const cycle = (adjustedFrame * speed) % 200;
  const shift = cycle < 100 ? cycle : 200 - cycle;

  // Presets heredados (compatibilidad). 'default' respeta los colores explícitos.
  let c1 = color1;
  let c2 = color2;
  if (theme === 'neon') {
    c1 = '#ff00ff';
    c2 = '#00ffff';
  } else if (theme === 'dark_glow') {
    c1 = '#000000';
    c2 = color1;
  }

  const stops = color3
    ? `${c1} 0%, ${c2} 50%, ${color3} 100%`
    : `${c1} 0%, ${c2} 100%`;

  const background = type === 'radial'
    ? `radial-gradient(circle at ${50 + (shift - 50) * 0.4}% 50%, ${stops})`
    : `linear-gradient(${angle + shift}deg, ${stops})`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background,
        zIndex: 0,
      }}
    />
  );
};
