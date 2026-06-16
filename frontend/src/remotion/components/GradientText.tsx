import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface GradientTextProps extends UniversalProps {
  text?: string;
  /** Colores del gradiente (2-4). */
  colors?: string[];
  fontSize?: number;
  fontWeight?: number;
  /** Ángulo del gradiente en grados. */
  angle?: number;
  /** Velocidad del barrido del gradiente (0 = estático). */
  speed?: number;
  width?: number;
}

/**
 * GradientText — texto con relleno de GRADIENTE animado (shimmer).
 *
 * Moderno y muy usado en video vertical. Determinista (el barrido deriva de
 * `frame`), responsive (fontSize por useCanvas si no se da), centrado por contrato.
 * Usa background-clip: text → el texto "recorta" el gradiente.
 */
export const GradientText: React.FC<GradientTextProps> = ({
  text = 'Texto degradado',
  colors = ['#00FFAB', '#38bdf8', '#a855f7'],
  fontSize,
  fontWeight = 900,
  angle = 100,
  speed = 1,
  width,
  x = 0,
  y = 0,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: cw, height: ch } = useVideoConfig();
  const c = useCanvas();
  const f = Math.max(0, frame - delay);

  // Barrido: la posición del gradiente recorre de 0% a 100% en loop.
  const t = (f / fps) * speed;
  const pos = speed > 0 ? interpolate(t % 2, [0, 2], [0, 100]) : 50;

  // Al menos 2 colores; se repite el primero al final para un loop continuo.
  const stops = colors.length >= 2 ? colors : [colors[0] ?? '#00FFAB', '#38bdf8'];
  const gradient = `linear-gradient(${angle}deg, ${[...stops, stops[0]].join(', ')})`;

  const resolvedFontSize = fontSize ?? c.vmin(9);
  const resolvedWidth = width ?? cw * 0.85;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${ch / 2 + Number(y)}px`,
        left: `${cw / 2 + Number(x)}px`,
        transform: 'translate(-50%, -50%)',
        width: `${resolvedWidth}px`,
        textAlign: 'center',
        zIndex: 20,
      }}
    >
      <span
        style={{
          fontFamily: 'Inter Tight, Inter, sans-serif',
          fontWeight,
          fontSize: `${resolvedFontSize}px`,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          backgroundImage: gradient,
          backgroundSize: '200% 100%',
          backgroundPosition: `${pos}% 50%`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          // Sombra sutil para legibilidad (el texto es transparente, va detrás).
          filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.45))',
        }}
      >
        {text}
      </span>
    </div>
  );
};
