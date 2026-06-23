import React from 'react';
import { interpolate } from 'remotion';

// ---------------------------------------------------------------------------
// IrisTransition — clásico "iris": un círculo se cierra sobre la escena saliente
// (negro pleno en el corte) y luego se abre revelando la entrante. Velo overlay:
// un color (negro) con un agujero circular transparente que encoge y crece.
//
// Atomic params: maxRadius (% del radio máximo, default 100), centerX/centerY (%).
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
  color?: string;
  params?: Record<string, unknown>;
}

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);

export const IrisTransition: React.FC<Props> = ({ progress, color = '#000000', params = {} }) => {
  const maxR = num(params.maxRadius, 100);
  const cx = num(params.centerX, 50);
  const cy = num(params.centerY, 50);

  // Primera mitad: el agujero encoge maxR→0 (se cierra a negro). Segunda mitad:
  // crece 0→maxR (se abre revelando la escena de abajo).
  const r =
    progress <= 0.5
      ? interpolate(progress, [0, 0.5], [maxR, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      : interpolate(progress, [0.5, 1], [0, maxR], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at ${cx}% ${cy}%, transparent ${r}%, ${color} ${r}%)`,
      }}
    />
  );
};
