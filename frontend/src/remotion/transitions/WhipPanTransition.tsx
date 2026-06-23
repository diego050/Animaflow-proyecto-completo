import React from 'react';
import { interpolate } from 'remotion';

// ---------------------------------------------------------------------------
// WhipPanTransition — fast horizontal/vertical "whip pan": a motion-blurred band
// sweeps across and briefly covers the cut, with stretch + speed streaks.
//
// Atomic params: direction ('left' | 'right' | 'up' | 'down'), stretch, blur.
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
  color?: string;
  params?: Record<string, unknown>;
}

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);

export const WhipPanTransition: React.FC<Props> = ({ progress, color = '#111827', params = {} }) => {
  const direction = str(params.direction, 'left');
  const maxStretch = num(params.stretch, 1.8);
  const maxBlur = num(params.blur, 28);

  const vertical = direction === 'up' || direction === 'down';
  const sign = direction === 'right' || direction === 'down' ? 1 : -1;
  const sweep = interpolate(progress, [0, 1], [-150 * sign, 150 * sign]);
  const stretch = interpolate(progress, [0, 0.5, 1], [1, maxStretch, 1]);
  const blur = interpolate(progress, [0, 0.5, 1], [0, maxBlur, 0]);
  const opacity = interpolate(progress, [0, 0.35, 0.5, 0.65, 1], [0, 0.9, 1, 0.9, 0]);
  const streak = Math.sin(progress * Math.PI);

  const translate = vertical ? `translateY(${sweep}%)` : `translateX(${sweep}%)`;
  const scale = vertical ? `scaleY(${stretch})` : `scaleX(${stretch})`;
  const streakAngle = vertical ? '0deg' : '90deg';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: color,
          transform: `${translate} ${scale}`,
          filter: `blur(${blur}px)`,
          opacity,
          willChange: 'transform, opacity, filter',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: streak * 0.5,
          background: `repeating-linear-gradient(${streakAngle}, rgba(255,255,255,0) 0px, rgba(255,255,255,0.12) 2px, rgba(255,255,255,0) 6px)`,
          transform: `${vertical ? `translateY(${sweep * 0.6}%)` : `translateX(${sweep * 0.6}%)`} ${scale}`,
          filter: `blur(${blur * 0.6}px)`,
        }}
      />
    </div>
  );
};
