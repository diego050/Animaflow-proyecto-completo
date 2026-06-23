/**
 * DynamicGrid — Flat 2D line grid that scrolls continuously in a chosen
 * direction (incl. diagonal). Clean tech / blueprint backdrop.
 *
 * Differs from GridPerspective (a 3D perspective floor) and StyleGridPulse (a
 * dot matrix with a pulse wave) — this is a flat, evenly-lit moving grid.
 *
 * Full-screen background (no x/y contract — covers the whole canvas, zIndex 0).
 * Deterministic (function of frame only). Loops seamlessly every cellSize.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from './types';

interface DynamicGridProps extends UniversalProps {
  /** Cell size in px (smaller = denser grid). */
  cellSize?: number;
  lineColor?: string;
  background?: string;
  /** Line thickness in px. */
  lineWidth?: number;
  /** Scroll speed multiplier. */
  speed?: number;
  direction?: 'diagonal' | 'up' | 'down' | 'left' | 'right';
  style?: Record<string, unknown>;
}

export const DynamicGrid: React.FC<DynamicGridProps> = ({
  cellSize = 40,
  lineColor = '#27272a',
  background = '#0a0a0a',
  lineWidth = 1,
  speed = 1,
  direction = 'diagonal',
  opacity = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const cell = Math.max(4, cellSize);
  const offset = (frame * 2 * Math.max(0.05, speed)) % cell;

  let bx = 0;
  let by = 0;
  if (direction === 'diagonal') { bx = offset; by = offset; }
  else if (direction === 'right') bx = offset;
  else if (direction === 'left') bx = -offset;
  else if (direction === 'down') by = offset;
  else if (direction === 'up') by = -offset;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: background,
        backgroundImage: `
          linear-gradient(to right, ${lineColor} ${lineWidth}px, transparent ${lineWidth}px),
          linear-gradient(to bottom, ${lineColor} ${lineWidth}px, transparent ${lineWidth}px)
        `,
        backgroundSize: `${cell}px ${cell}px`,
        backgroundPosition: `${bx}px ${by}px`,
        zIndex: 0,
        opacity,
        ...style,
      }}
    />
  );
};
