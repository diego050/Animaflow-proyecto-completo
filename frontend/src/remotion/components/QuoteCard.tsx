/**
 * QuoteCard — Centered editorial quote card: a large serif quote mark, a centered
 * italic quote, and an attribution that slides in, revealed in sequence
 * (quote / testimonial / pull quote / editorial card). Distinct from QuoteBlock
 * (a left-bar callout overlay). Fully atomic.
 *
 * Coordinate contract: x/y = absolute canvas coords (solver-resolved center of the element); centered via translate(-50%,-50%).
 * Optional full-bleed background. All sizing via useCanvas(). Deterministic.
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface QuoteCardProps extends UniversalProps {
  quote?: string;
  author?: string;
  quoteMark?: string;
  quoteMarkColor?: string;
  quoteColor?: string;
  authorColor?: string;
  showQuoteMark?: boolean;
  showAuthor?: boolean;
  showBackground?: boolean;
  bgColor?: string;
  maxWidth?: number;
  speed?: number;
  style?: Record<string, unknown>;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({
  x = 540,
  y = 960,
  quote = 'Design is not just what it looks like. Design is how it works.',
  author = 'Steve Jobs',
  quoteMark = '“',
  quoteMarkColor = '#3b82f6',
  quoteColor = '#ffffff',
  authorColor = '#9ca3af',
  showQuoteMark = true,
  showAuthor = true,
  showBackground = true,
  bgColor = '#111827',
  maxWidth = 700,
  fontSize,
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const f = frame * Math.max(0.05, speed);

  const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
  const markOpacity = interpolate(f, [0, 15], [0, 1], clamp);
  const quoteOpacity = interpolate(f, [10, 30], [0, 1], clamp);
  const authorOpacity = interpolate(f, [30, 45], [0, 1], clamp);
  const authorX = interpolate(f, [30, 45], [c.vmin(5), 0], clamp);

  const quoteSize = fontSize ?? c.vmin(4.6);
  const markSize = c.vmin(14);
  const authorSize = c.vmin(2.8);

  const content = (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '90%',
        ...style,
      }}
    >
      {showQuoteMark && (
        <div style={{ color: quoteMarkColor, fontSize: `${markSize}px`, fontWeight: 700, lineHeight: 1, opacity: markOpacity, fontFamily: 'Georgia, serif', marginBottom: `${c.vmin(1.5)}px` }}>
          {quoteMark}
        </div>
      )}

      <div style={{ color: quoteColor, fontSize: `${quoteSize}px`, fontWeight: 400, lineHeight: 1.6, textAlign: 'center', maxWidth: `${maxWidth}px`, opacity: quoteOpacity, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
        {quote}
      </div>

      {showAuthor && (
        <div style={{ color: authorColor, fontSize: `${authorSize}px`, fontWeight: 500, marginTop: `${c.vmin(4)}px`, opacity: authorOpacity, transform: `translateX(${authorX}px)`, fontFamily: 'Inter, system-ui, sans-serif' }}>
          — {author}
        </div>
      )}
    </div>
  );

  if (!showBackground) return content;

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: bgColor, zIndex: 0 }} />
      {content}
    </>
  );
};
