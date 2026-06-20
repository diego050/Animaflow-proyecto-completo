import React from 'react';
import { AbsoluteFill } from 'remotion';

/**
 * FadeThroughBlack — transición de escena limpia y neutral (v8 / Fase 5).
 *
 * Un velo negro centrado en el corte: opacidad 0 → 1 → 0 (pico de negro justo en
 * el cambio de escena). Esconde el salto de color de fondo entre escenas y se ve
 * cinematográfico/profesional, sin introducir colores raros (el problema del
 * crossfade de color anterior).
 *
 * Recibe `progress` (0→1) sobre la ventana de transición. Determinista.
 */
export const FadeThroughBlack: React.FC<{ progress: number; color?: string }> = ({ progress, color = '#000' }) => {
  const p = Math.max(0, Math.min(1, progress));
  // sin(π·p): 0 en los bordes, 1 en el centro (corte). Potencia leve para que el
  // velo pleno dure poco y el dip se sienta suave. `color` permite velo no-negro.
  const opacity = Math.pow(Math.sin(p * Math.PI), 0.8);
  return (
    <AbsoluteFill
      style={{ backgroundColor: color, opacity, zIndex: 9999, pointerEvents: 'none' }}
    />
  );
};
