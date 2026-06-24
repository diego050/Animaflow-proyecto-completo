/**
 * PerspectiveMarquee — Infinite horizontal marquee tilted in 3D space.
 *
 * The scrolling strip sits inside a perspective container rotated on X and Y,
 * with edge fades blending into `fadeColor`. Continuous loop driven purely by
 * the frame (deterministic).
 *
 * Coordinate contract: x/y = absolute canvas coords (solver-resolved center of the element); centered via translate(-50%,-50%).
 * All sizing via useCanvas() — no hardcoded structural px.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface PerspectiveMarqueeProps extends UniversalProps {
  text?: string;
  textColor?: string;
  fontWeight?: number;
  /** Scroll speed in px per frame. */
  pixelsPerFrame?: number;
  rotateY?: number;
  rotateX?: number;
  /** CSS perspective in px (lower = stronger 3D). */
  perspective?: number;
  /** Color the edges fade into. */
  fadeColor?: string;
  /** Speed multiplier (>=1 = faster). */
  speed?: number;
  style?: Record<string, unknown>;
}

export const PerspectiveMarquee: React.FC<PerspectiveMarqueeProps> = ({
  x = 540,
  y = 960,
  text = 'ship · build · animate · ',
  textColor = '#fafafa',
  fontWeight = 700,
  pixelsPerFrame = 2,
  rotateY = -28,
  rotateX = 8,
  perspective = 1200,
  fadeColor = '#050505',
  speed = 1,
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const fs = fontSize ?? c.vmin(8);
  const spd = Math.max(0.1, speed);

  const approxCharW = fs * 0.6;
  const copyW = Math.max(1, text.length * approxCharW);
  const copies = Math.max(4, Math.ceil((c.width * 1.6) / copyW) + 2);
  const offset = -((frame * pixelsPerFrame * spd) % copyW);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${c.vw(120)}px`,
        overflow: 'hidden',
        perspective: `${perspective}px`,
        ...style,
      }}
    >
      <div style={{ transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`, transformStyle: 'preserve-3d' }}>
        <div
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            transform: `translateX(${offset}px)`,
            fontSize: `${fs}px`,
            fontWeight,
            color: textColor,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {Array.from({ length: copies }).map((_, i) => (
            <span key={i}>{text}</span>
          ))}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(90deg, ${fadeColor} 0%, transparent 18%, transparent 82%, ${fadeColor} 100%)`,
        }}
      />
    </div>
  );
};
