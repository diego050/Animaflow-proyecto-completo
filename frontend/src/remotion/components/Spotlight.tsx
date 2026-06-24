import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * Spotlight — foco teatral: ilumina un punto y oscurece el resto.
 *
 * - Posición ABSOLUTA con x/y (centro del foco). `radius` controla cuánto ilumina
 *   (chico = solo una parte de la pantalla).
 * - Entrada de luz opcional (iris-in): el foco se abre desde cerrado.
 * - Respiración sutil opcional con velocidad propia.
 * - Overlay (zIndex 9985), no captura eventos. Determinista.
 */
interface SpotlightProps extends UniversalProps {
  /** Color de la oscuridad alrededor del foco. */
  color?: string;
  /** Radio del foco como % del lado menor (20 = foco pequeño, 90 = casi todo iluminado). */
  radius?: number;
  /** Intensidad de la oscuridad fuera del foco (0-1). */
  intensity?: number;
  /** Suavizado del borde del foco (0 = duro, 1 = muy difuso). */
  softness?: number;
  /** Posición ABSOLUTA del centro del foco (px). Por defecto, centro del lienzo. */
  x?: number;
  y?: number;
  /** Respiración/deriva sutil del foco. */
  animate?: boolean;
  /** Velocidad de la respiración. */
  breatheSpeed?: number;
  /** El foco se abre desde cerrado al entrar (iris-in). */
  irisIn?: boolean;
  /** Frames que tarda la apertura del iris. */
  irisFrames?: number;
}

export const Spotlight: React.FC<SpotlightProps> = ({
  color = '#000000',
  radius = 55,
  intensity = 0.7,
  softness = 0.45,
  x,
  y,
  animate = true,
  breatheSpeed = 0.8,
  irisIn = false,
  irisFrames = 20,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);
  const t = adjustedFrame / fps;

  const breathe = animate
    ? interpolate(Math.sin(t * breatheSpeed), [-1, 1], [-3, 3], { easing: Easing.ease })
    : 0;

  const target = Math.min(95, Math.max(10, radius));
  // Iris-in: el radio crece de 0 al objetivo en irisFrames.
  const irisFactor = irisIn
    ? interpolate(adjustedFrame, [0, Math.max(1, irisFrames)], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      })
    : 1;

  const r = target * irisFactor + breathe;
  const dark = Math.min(1, Math.max(0, intensity));
  const inner = Math.min(0.95, Math.max(0, softness)); // fracción transparente interior

  // Centro ABSOLUTO del foco en %.
  const posX = typeof x === 'number' ? x : width / 2;
  const posY = typeof y === 'number' ? y : height / 2;
  const cx = (posX / width) * 100;
  const cy = (posY / height) * 100;

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
        background: `radial-gradient(circle at ${cx}% ${cy}%, transparent 0%, transparent ${r * inner}%, ${hexToRgba(color, dark)} ${r}%, ${hexToRgba(color, Math.min(1, dark + 0.15))} 100%)`,
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
