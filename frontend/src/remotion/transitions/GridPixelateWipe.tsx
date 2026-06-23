import React from 'react';
import { interpolate, random } from 'remotion';

// ---------------------------------------------------------------------------
// GridPixelateWipe — a grid of cells fills in to cover the scene (pixelated
// reveal) following a pattern.
//
// Atomic params: cols, rows, pattern ('wave' | 'random' | 'rows' | 'cols'), fade.
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
  color?: string;
  params?: Record<string, unknown>;
}

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);

export const GridPixelateWipe: React.FC<Props> = ({ progress, color = '#0a0a0a', params = {} }) => {
  const cols = Math.max(1, Math.round(num(params.cols, 12)));
  const rows = Math.max(1, Math.round(num(params.rows, 7)));
  const pattern = str(params.pattern, 'wave');
  const fade = num(params.fade, 0.18);

  const maxOrder = cols + rows - 2;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      let order: number;
      if (pattern === 'random') order = random(`gpw-${r}-${cIdx}`);
      else if (pattern === 'rows') order = r / Math.max(1, rows - 1);
      else if (pattern === 'cols') order = cIdx / Math.max(1, cols - 1);
      else order = (cIdx + r) / maxOrder; // wave (diagonal)
      const delay = order * (1 - fade);
      const opacity = interpolate(progress, [delay, delay + fade], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      cells.push(<div key={`${r}-${cIdx}`} style={{ backgroundColor: color, opacity }} />);
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {cells}
    </div>
  );
};
