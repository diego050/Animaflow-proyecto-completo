import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

/**
 * FloatingBlobs — fondo AMBIENTAL de glows de color suaves (v8 / Fase 4).
 *
 * Antes: dos elipses SÓLIDAS con un filtro "gooey" (feColorMatrix con alpha
 * contrast alto) que endurecía los bordes → se veían como manchas sólidas
 * centradas detrás del texto, compitiendo con él.
 *
 * Ahora: glows radiales que se desvanecen a transparente + blur, ubicados hacia
 * los bordes (no en el centro), con deriva lenta. Es un acento de color, no una
 * forma. Responsivo (useCanvas) y determinista (función pura de frame). Respeta
 * `opacity` (el post-proceso lo capa a ≤0.30 cuando hay contenido encima).
 */
export const FloatingBlobs: React.FC<{
  color1?: string;
  color2?: string;
  width?: number;
  height?: number;
  opacity?: number;
  /** Número de glows (1-5). */
  count?: number;
  /** Desenfoque del conjunto (en vmin). */
  blur?: number;
} & UniversalProps> = ({
  color1 = '#f43f5e', // Rose
  color2 = '#38bdf8', // Sky
  delay = 0,
  color,
  opacity = 1,
  count = 2,
  blur = 6,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // Deriva lenta determinista.
  const drift = (period: number, phase: number) =>
    Math.sin((adjustedFrame + phase) / period);

  const toTransparent = (hex: string) =>
    /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}00` : 'transparent';

  const glow = (
    col: string,
    cx: number, // offset horizontal desde el centro (px)
    cy: number,
    period: number,
    phase: number,
    sizePct: number,
  ): React.CSSProperties => {
    const d = c.vmin(sizePct);
    return {
      position: 'absolute',
      left: `${c.width / 2 + cx + drift(period, phase) * c.vw(5)}px`,
      top: `${c.height / 2 + cy + drift(period * 1.2, phase + 40) * c.vh(4)}px`,
      width: `${d}px`,
      height: `${d}px`,
      transform: 'translate(-50%, -50%)',
      background: `radial-gradient(circle, ${col} 0%, ${toTransparent(col)} 70%)`,
      borderRadius: '50%',
    };
  };

  // Posiciones base distribuidas hacia los bordes (no en el centro del texto).
  const layout = [
    { cx: -c.vw(20), cy: -c.vh(16), period: 90, phase: 0, size: 70 },
    { cx: c.vw(20), cy: c.vh(18), period: 110, phase: 200, size: 62 },
    { cx: c.vw(22), cy: -c.vh(20), period: 100, phase: 90, size: 55 },
    { cx: -c.vw(22), cy: c.vh(20), period: 120, phase: 300, size: 58 },
    { cx: 0, cy: c.vh(2), period: 130, phase: 150, size: 50 },
  ];
  const palette = [color1, color || color2, color1, color2, color || color2];
  const n = Math.max(1, Math.min(5, Math.round(Number(count) || 2)));

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${c.width}px`,
        height: `${c.height}px`,
        zIndex: 1,
        opacity,
        filter: `blur(${c.vmin(Number(blur) || 6)}px)`,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {layout.slice(0, n).map((b, i) => (
        <div key={i} style={glow(palette[i], b.cx, b.cy, b.period, b.phase, b.size)} />
      ))}
    </div>
  );
};
