import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface SpotlightProps extends UniversalProps {
  /** Color de la oscuridad alrededor del foco. */
  color?: string;
  /** Radio del foco como % del lado menor (20 = foco pequeño, 90 = casi todo iluminado). */
  radius?: number;
  /** Intensidad de la oscuridad fuera del foco (0-1). */
  intensity?: number;
  /** Posición del foco (offset desde el centro, en px). */
  x?: number;
  y?: number;
  /** Deriva/respiración sutil del foco. */
  animate?: boolean;
}

/**
 * Spotlight — foco teatral full-screen: ilumina el centro y oscurece los bordes.
 *
 * - Overlay role (zIndex 9985, bajo GlobalVFX/transiciones), no captura eventos.
 * - Determinista: la respiración deriva de `frame`.
 * - Dirige la mirada al sujeto (ícono/texto centrado) — muy "cinematográfico".
 */
export const Spotlight: React.FC<SpotlightProps> = ({
  color = '#000000',
  radius = 55,
  intensity = 0.7,
  x = 0,
  y = 0,
  animate = true,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);
  const t = adjustedFrame / fps;

  const breathe = animate
    ? interpolate(Math.sin(t * 0.8), [-1, 1], [-3, 3], { easing: Easing.ease })
    : 0;

  const r = Math.min(95, Math.max(10, radius)) + breathe;
  const dark = Math.min(1, Math.max(0, intensity));

  // Centro del foco en %: 50% + offset relativo al lado.
  const cx = 50 + (x / width) * 100;
  const cy = 50 + (y / height) * 100;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9985,
        pointerEvents: 'none',
        background: `radial-gradient(circle at ${cx}% ${cy}%, transparent 0%, transparent ${r * 0.45}%, ${hexToRgba(color, dark)} ${r}%, ${hexToRgba(color, Math.min(1, dark + 0.15))} 100%)`,
      }}
    />
  );
};

/** #rrggbb (+ alpha 0-1) → rgba(). Acepta también rgba/transparent tal cual. */
function hexToRgba(color: string, alpha: number): string {
  if (!color.startsWith('#')) return color;
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
