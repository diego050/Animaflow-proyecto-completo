import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface QuoteBlockProps extends UniversalProps {
  text?: string;
  author?: string;
  /** Color del autor / atribución. */
  authorColor?: string;
  /** Mostrar las comillas decorativas. */
  showQuoteMark?: boolean;
  /** Ancho máximo antes de hacer salto de línea (px). */
  width?: number;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({
  text = 'The future belongs to those who build it.',
  author = 'Creator',
  color = '#eab308', // Quote mark + border color
  bgColor = 'transparent',
  textColor = '#ffffff',
  authorColor = '#94a3b8',
  showQuoteMark = true,
  x = 540,
  y = 540,
  fontSize = 48,
  width = 800,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, width: `${width}px`, maxWidth: '92vw', padding: '40px', backgroundColor: bgColor, fontFamily: 'Inter, sans-serif', zIndex: 40 }}>
      {showQuoteMark && (
        <div style={{ position: 'absolute', top: '-20px', left: '20px', fontSize: `${fontSize * 4}px`, color, opacity: 0.2, fontFamily: 'serif', lineHeight: 1, userSelect: 'none', zIndex: -1 }}>
          &ldquo;
        </div>
      )}

      <div style={{ position: 'relative', borderLeft: `6px solid ${color}`, paddingLeft: '30px' }}>
        <div style={{ fontSize: `${fontSize}px`, color: textColor, fontWeight: 'bold', lineHeight: 1.4, marginBottom: '20px', fontStyle: 'italic', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {text}
        </div>
        <div style={{ fontSize: `${fontSize * 0.5}px`, color: authorColor, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
          — {author}
        </div>
      </div>
    </div>
  );
};
