/**
 * InfiniteBentoPan — A bento grid of cards that pans diagonally forever, looping
 * seamlessly (bento / cards background / showcase / infinite grid). A few cards
 * are accented for rhythm.
 *
 * Full-bleed background. Deterministic: pan offset = frame % cell; accents from a
 * seeded hash (no Math.random()).
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface InfiniteBentoPanProps extends UniversalProps {
  /** Pan speed in px/frame (scaled by speed). */
  panSpeed?: number;
  accentColor?: string;
  bgColor?: string;
  cardColor?: string;
  cellSize?: number;
  gap?: number;
  radiusPx?: number;
  speed?: number;
  style?: Record<string, unknown>;
}

export const InfiniteBentoPan: React.FC<InfiniteBentoPanProps> = ({
  panSpeed = 1,
  accentColor = '#7c3aed',
  bgColor = '#0a0a0a',
  cardColor = '#161616',
  cellSize,
  gap,
  radiusPx,
  speed = 1,
  opacity = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();

  const cell = cellSize ?? c.vmin(20);
  const g = gap ?? c.vmin(2.2);
  const rad = radiusPx ?? c.vmin(2.4);

  const off = (frame * panSpeed * Math.max(0.05, speed)) % cell;
  const cols = Math.ceil(c.width / cell) + 2;
  const rows = Math.ceil(c.height / cell) + 2;

  const accent = (r: number, col: number) => {
    const v = Math.sin((r + 1) * 12.9898 + (col + 1) * 78.233) * 43758.5453;
    return v - Math.floor(v) > 0.82;
  };

  const cards = [];
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const left = col * cell - off - cell;
      const top = r * cell - off - cell;
      cards.push(
        <div
          key={`${r}-${col}`}
          style={{
            position: 'absolute',
            left: `${left + g / 2}px`,
            top: `${top + g / 2}px`,
            width: `${cell - g}px`,
            height: `${cell - g}px`,
            borderRadius: `${rad}px`,
            backgroundColor: accent(r, col) ? accentColor : cardColor,
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        />,
      );
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: bgColor, zIndex: 0, opacity, ...style }}>
      {cards}
    </div>
  );
};
