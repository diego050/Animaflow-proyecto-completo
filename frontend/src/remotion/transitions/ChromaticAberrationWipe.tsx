import React from 'react';
import { interpolate } from 'remotion';

// ---------------------------------------------------------------------------
// ChromaticAberrationWipe — a wipe whose edge splits into red/blue fringes that
// peak mid-transition (RGB-split flash). Cleaner than GlitchTransition.
//
// Atomic params: direction ('left' | 'right'), aberrationOffset.
// ---------------------------------------------------------------------------

interface Props {
  progress: number;
  color?: string;
  params?: Record<string, unknown>;
}

const num = (v: unknown, d: number) => (typeof v === 'number' ? v : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);

export const ChromaticAberrationWipe: React.FC<Props> = ({ progress, color = '#0a0a0a', params = {} }) => {
  const direction = str(params.direction, 'left');
  const aberration = num(params.aberrationOffset, 14);

  const width = interpolate(progress, [0, 1], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const offset = Math.sin(progress * Math.PI) * aberration;
  const fromRight = direction === 'right';

  const panel = (bg: string, dx: number, blend: React.CSSProperties['mixBlendMode'], op: number): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    [fromRight ? 'right' : 'left']: 0,
    height: '100%',
    width: `${width}%`,
    backgroundColor: bg,
    transform: `translateX(${dx}px)`,
    mixBlendMode: blend,
    opacity: op,
  });

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={panel('#ff0040', offset, 'screen', 0.85)} />
      <div style={panel('#00e0ff', -offset, 'screen', 0.85)} />
      <div style={panel(color, 0, 'normal', 1)} />
    </div>
  );
};
