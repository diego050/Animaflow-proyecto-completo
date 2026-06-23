import React from 'react';
import { interpolate } from 'remotion';

// ---------------------------------------------------------------------------
// FrostedGlassWipe — a frosted glass panel sweeps across, blurring whatever is
// behind it (backdrop-filter) with a soft tint, then clears.
//
// Atomic params: glassBlur, direction ('left' | 'right' | 'up' | 'down').
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
  color?: string;
  params?: Record<string, unknown>;
}

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);

export const FrostedGlassWipe: React.FC<Props> = ({ progress, color = 'rgba(255,255,255,0.12)', params = {} }) => {
  const glassBlur = num(params.glassBlur, 24);
  const direction = str(params.direction, 'left');

  const extent = interpolate(progress, [0, 0.6], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const blur = interpolate(progress, [0, 0.5, 1], [0, glassBlur, 0]);
  const tint = interpolate(progress, [0, 0.5, 1], [0, 1, 0]);

  const horizontal = direction === 'left' || direction === 'right';
  const fromEnd = direction === 'right' || direction === 'down';

  const sizeStyle: React.CSSProperties = horizontal
    ? { top: 0, height: '100%', width: `${extent}%`, [fromEnd ? 'right' : 'left']: 0 }
    : { left: 0, width: '100%', height: `${extent}%`, [fromEnd ? 'bottom' : 'top']: 0 };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          ...sizeStyle,
          backgroundColor: color,
          opacity: tint,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          boxShadow: '0 0 30px rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.22)',
          willChange: 'backdrop-filter',
        }}
      />
    </div>
  );
};
