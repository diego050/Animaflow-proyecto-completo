import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

// ---------------------------------------------------------------------------
// StyleTextHighlight — Each word gets a colored background "pill" that fills
// in sequentially from left to right. Deterministic: pure function of frame.
// ---------------------------------------------------------------------------

interface StyleTextHighlightProps extends UniversalProps {
  text?: string | string[];
  framesPerWord?: number;
  fontSize?: number;
  textColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
  highlightOpacity?: number;
  borderRadius?: number;
  paddingX?: number;
  paddingY?: number;
  fontWeight?: number;
  gap?: number;
  style?: Record<string, unknown>;
}

export const StyleTextHighlight: React.FC<StyleTextHighlightProps> = ({
  x = 540,
  y = 960,
  text = 'Build amazing videos with code',
  framesPerWord = 18,
  fontSize,
  textColor = '#ffffff',
  gradientStart = '#3b82f6',
  gradientEnd = '#7209b7',
  highlightOpacity = 0.85,
  borderRadius,
  paddingX,
  paddingY,
  fontWeight = 800,
  gap,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();

  // --- Responsive sizing via useCanvas() ---
  const resolvedFontSize = fontSize ?? c.vmin(6);
  const resolvedBorderRadius = borderRadius ?? c.vmin(0.8);
  const resolvedPaddingX = paddingX ?? c.vmin(1.2);
  const resolvedPaddingY = paddingY ?? c.vmin(0.4);
  const resolvedGap = gap ?? c.vmin(1.5);

  const words = typeof text === 'string' ? text.split(' ') : text;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: `${resolvedGap}px`,
        maxWidth: `${c.vw(85)}px`,
        zIndex: 50,
      }}
    >
      {words.map((word, i) => {
        const wordStart = i * framesPerWord;
        const highlightProgress = interpolate(
          frame,
          [wordStart, wordStart + framesPerWord * 0.5],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        const isHighlighted = highlightProgress > 0;

        return (
          <span
            key={i}
            style={{
              position: 'relative',
              display: 'inline-block',
              fontSize: `${resolvedFontSize}px`,
              fontWeight,
              color: textColor,
              padding: `${resolvedPaddingY}px ${resolvedPaddingX}px`,
              fontFamily: 'Inter Tight, sans-serif',
              opacity: style?.opacity !== undefined ? (style.opacity as number) : 1,
            }}
          >
            {/* Background pill — grows from left to right */}
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${highlightProgress * 100}%`,
                background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
                borderRadius: `${resolvedBorderRadius}px`,
                zIndex: 0,
                opacity: isHighlighted ? highlightOpacity : 0,
                transition: 'none',
              }}
            />
            {/* Word text — sits above the pill */}
            <span style={{ position: 'relative', zIndex: 1 }}>{word}</span>
          </span>
        );
      })}
    </div>
  );
};
