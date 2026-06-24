/**
 * ShimmerSweep — Text with a bright shine band that sweeps across it on a loop.
 *
 * Uses a clipped linear-gradient (base → shine → base) as the text fill and
 * animates its background-position. Great for "Generating…" / loading states.
 *
 * Coordinate contract: x/y = absolute canvas coords (solver-resolved center of the element); centered via translate(-50%,-50%).
 * All sizing via useCanvas() — no hardcoded structural px.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface ShimmerSweepProps extends UniversalProps {
  text?: string;
  /** Resting text color. */
  baseColor?: string;
  /** Color of the moving shine band. */
  shineColor?: string;
  fontWeight?: number;
  /** Frames per full sweep. */
  cycleDuration?: number;
  /** Speed multiplier (>=1 = faster). */
  speed?: number;
  style?: Record<string, unknown>;
}

export const ShimmerSweep: React.FC<ShimmerSweepProps> = ({
  x = 540,
  y = 960,
  text = 'Generating',
  baseColor = '#3f3f46',
  shineColor = '#fafafa',
  fontWeight = 700,
  cycleDuration = 60,
  speed = 1,
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const fs = fontSize ?? c.vmin(9);
  const spd = Math.max(0.1, speed);
  const cycle = Math.max(1, cycleDuration / spd);
  const pos = interpolate(frame % cycle, [0, cycle], [200, -200]);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        ...style,
      }}
    >
      <div
        style={{
          fontSize: `${fs}px`,
          fontWeight,
          whiteSpace: 'nowrap',
          fontFamily: 'Inter, system-ui, sans-serif',
          backgroundImage: `linear-gradient(110deg, ${baseColor} 35%, ${shineColor} 50%, ${baseColor} 65%)`,
          backgroundSize: '200% 100%',
          backgroundPosition: `${pos}% 0`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {text}
      </div>
    </div>
  );
};
