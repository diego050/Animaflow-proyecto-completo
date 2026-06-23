/**
 * StaggeredFadeUp — Words fade in and rise into place with a staggered delay.
 *
 * Each word animates opacity 0→1 and translateY distance→0, offset by
 * `staggerDelay` frames. Clean, one-time entrance (no loop).
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas() — no hardcoded structural px.
 */
import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface StaggeredFadeUpProps extends UniversalProps {
  text?: string;
  textColor?: string;
  fontWeight?: number;
  /** Frames between each word's entrance. */
  staggerDelay?: number;
  /** Px each word rises from. */
  distance?: number;
  /** Frames each word takes to settle. */
  duration?: number;
  /** Speed multiplier (>=1 = faster). */
  speed?: number;
  textAlign?: 'left' | 'center' | 'right';
  style?: Record<string, unknown>;
}

export const StaggeredFadeUp: React.FC<StaggeredFadeUpProps> = ({
  x = 0,
  y = 0,
  text = 'Ship faster with code',
  textColor = '#ffffff',
  fontWeight = 600,
  staggerDelay = 4,
  distance = 20,
  duration = 18,
  speed = 1,
  textAlign = 'center',
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const fs = fontSize ?? c.vmin(7);
  const words = text.split(' ');
  const spd = Math.max(0.1, speed);
  const justify =
    textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        width: '90%',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: justify,
        alignItems: 'baseline',
        gap: `${fs * 0.28}px`,
        textAlign,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const local = (frame - (i * staggerDelay) / spd) * spd;
        const opacity = interpolate(local, [0, duration], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const ty = interpolate(local, [0, duration], [distance, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform: `translateY(${ty}px)`,
              color: textColor,
              fontSize: `${fs}px`,
              fontWeight,
              lineHeight: 1.2,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};
