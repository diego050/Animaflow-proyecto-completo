/**
 * Confetti — A burst of confetti pieces that fly up and fall under gravity,
 * spinning as they go (celebration / success / party / win).
 *
 * Full-bleed overlay. Deterministic: per-piece motion derived from a seeded
 * pseudo-random hash + useCurrentFrame() (no Math.random()).
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface ConfettiProps extends UniversalProps {
  particleCount?: number;
  /** Initial burst velocity. */
  power?: number;
  gravity?: number;
  /** Piece size in px. */
  size?: number;
  seed?: number;
  colors?: string[];
  speed?: number;
  style?: Record<string, unknown>;
}

const DEFAULT_COLORS = ['#ff5e5e', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff', '#ff9f1c'];

export const Confetti: React.FC<ConfettiProps> = ({
  x = 0,
  y = 0,
  particleCount = 140,
  power = 17,
  gravity = 0.45,
  size = 13,
  seed = 1,
  colors,
  speed = 1,
  opacity = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const fr = frame * Math.max(0.05, speed);
  const palette = Array.isArray(colors) && colors.length ? colors : DEFAULT_COLORS;

  const rand = (i: number, s: number) => {
    const v = Math.sin((i + 1) * 12.9898 + s * 78.233 + seed * 3.17) * 43758.5453;
    return v - Math.floor(v);
  };

  const ox = c.width / 2 + x;
  const oy = c.height / 2 + y;
  const n = Math.max(1, Math.min(400, Math.round(particleCount)));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity, zIndex: 60, ...style }}>
      {Array.from({ length: n }).map((_, i) => {
        const angle = rand(i, 1) * Math.PI * 2;
        const burst = (0.4 + rand(i, 2) * 0.6) * power;
        const vx = Math.cos(angle) * burst;
        const vy = -(0.5 + rand(i, 3) * 0.9) * power; // upward
        const px = ox + vx * fr;
        const py = oy + vy * fr + 0.5 * gravity * fr * fr;
        const rot = fr * (2 + rand(i, 4) * 8) * (rand(i, 5) > 0.5 ? 1 : -1);
        const col = palette[i % palette.length];
        const sz = size * (0.7 + rand(i, 6) * 0.6);
        const fade = interpolate(py, [c.height * 0.7, c.height + 100], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        if (fr <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${px}px`,
              top: `${py}px`,
              width: `${sz}px`,
              height: `${sz * 0.5}px`,
              backgroundColor: col,
              opacity: fade,
              transform: `translate(-50%, -50%) rotate(${rot}deg)`,
              borderRadius: '1px',
            }}
          />
        );
      })}
    </div>
  );
};
