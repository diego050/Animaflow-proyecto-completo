import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * GradientOverlay — capa de gradiente (tinte/scrim) sobre el contenido.
 *
 * Atómico: lineal o radial, hasta 3 colores con punto medio ajustable (para que
 * el color del medio "pese" más o menos), ángulo (lineal) y centro+tamaño
 * (radial, lo que también lo posiciona). Acepta cualquier color CSS, incl.
 * rgba()/transparent para transparencia parcial.
 */
interface GradientOverlayProps extends UniversalProps {
  /** 'linear' (direccional) o 'radial' (redondo, desde un punto). */
  type?: 'linear' | 'radial';
  color1?: string;
  color2?: string;
  /** Tercer color opcional (vacío = solo 2 colores). */
  color3?: string;
  /** Posición (%) del color del medio cuando hay 3 colores. */
  midPoint?: number;
  /** Ángulo del gradiente lineal (grados). */
  angle?: number;
  /** Centro del gradiente radial (% del lienzo). También lo posiciona. */
  centerX?: number;
  centerY?: number;
  /** Tamaño del gradiente radial (% del lienzo). */
  radius?: number;
  opacity?: number;
  /** Fade-in del overlay al entrar. */
  animateIn?: boolean;
}

export const GradientOverlay: React.FC<GradientOverlayProps> = ({
  type = 'linear',
  color1 = '#000000',
  color2 = 'transparent',
  color3 = '',
  midPoint = 50,
  angle = 180,
  centerX = 50,
  centerY = 50,
  radius = 75,
  opacity = 0.8,
  animateIn = true,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const currentOpacity = animateIn
    ? interpolate(adjustedFrame, [0, 15], [0, opacity], { extrapolateRight: 'clamp' })
    : opacity;

  // 2 o 3 paradas de color (el punto medio controla cuánto "pesa" el del medio).
  const stops = color3
    ? `${color1} 0%, ${color2} ${midPoint}%, ${color3} 100%`
    : `${color1} 0%, ${color2} 100%`;

  const background = type === 'radial'
    ? `radial-gradient(${radius}% ${radius}% at ${centerX}% ${centerY}%, ${stops})`
    : `linear-gradient(${angle}deg, ${stops})`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        background,
        opacity: currentOpacity,
        zIndex: 5, // Above background, below text
        pointerEvents: 'none',
      }}
    />
  );
};
