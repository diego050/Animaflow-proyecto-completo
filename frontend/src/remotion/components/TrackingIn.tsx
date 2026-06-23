/**
 * TrackingIn — Text with expanded letter-spacing + blur that contracts into a
 * crisp, settled headline (the classic "tracking-in" title intro).
 *
 * letter-spacing animates startTracking·fontSize → 0, blur startBlur → 0, and
 * opacity 0 → 1. One-time entrance (no loop).
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas() — no hardcoded structural px.
 */
import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface TrackingInProps extends UniversalProps {
  text?: string;
  textColor?: string;
  fontWeight?: number;
  /** Extra letter-spacing at the start, in em (0.5 = half a glyph). */
  startTracking?: number;
  /** Blur at the start, in px. */
  startBlur?: number;
  /** Frames the entrance takes. */
  duration?: number;
  /** Speed multiplier (>=1 = faster). */
  speed?: number;
  style?: Record<string, unknown>;
}

export const TrackingIn: React.FC<TrackingInProps> = ({
  x = 0,
  y = 0,
  text = 'tracking in',
  textColor = '#ffffff',
  fontWeight = 700,
  startTracking = 0.5,
  startBlur = 12,
  duration = 30,
  speed = 1,
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const fs = fontSize ?? c.vmin(9);
  const spd = Math.max(0.1, speed);
  const local = frame * spd;

  const t = interpolate(local, [0, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const letterSpacing = startTracking * fs * t;
  const blur = startBlur * t;
  const opacity = interpolate(local, [0, duration * 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        ...style,
      }}
    >
      <div
        style={{
          color: textColor,
          fontSize: `${fs}px`,
          fontWeight,
          letterSpacing: `${letterSpacing}px`,
          filter: `blur(${blur}px)`,
          opacity,
          whiteSpace: 'nowrap',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {text}
      </div>
    </div>
  );
};
