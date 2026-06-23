import React from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';

// ---------------------------------------------------------------------------
// SlideWipe — a solid panel slides across the screen, fully covering the cut at
// the midpoint, then sliding off to reveal the next scene underneath (slide /
// push-reveal). As an overlay it masks the cut while the engine swaps scenes.
//
// Atomic params: direction ('left' | 'right' | 'up' | 'down'), useSpring.
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
  color?: string;
  params?: Record<string, unknown>;
}

const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

export const SlideWipe: React.FC<Props> = ({ progress, color = '#111827', params = {} }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const direction = str(params.direction, 'left');
  const useSpring = bool(params.useSpring, true);

  // Optionally smooth the linear progress with a spring for a snappier slide.
  const eased = useSpring
    ? spring({ frame: progress * durationInFrames, fps, config: { damping: 200, stiffness: 100, mass: 0.5 } })
    : progress;

  // Panel sweeps across: off-screen → covering at mid → off-screen opposite side.
  const pos = interpolate(eased, [0, 0.5, 1], [-100, 0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const vertical = direction === 'up' || direction === 'down';
  const sign = direction === 'right' || direction === 'down' ? -1 : 1;
  const transform = vertical ? `translateY(${pos * sign}%)` : `translateX(${pos * sign}%)`;

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: color,
          transform,
          willChange: 'transform',
          boxShadow: '0 0 60px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
};
