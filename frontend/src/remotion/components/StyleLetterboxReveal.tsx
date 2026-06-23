import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

// ---------------------------------------------------------------------------
// StyleLetterboxReveal — Cinematic letterbox bars that open/close to reveal content
// ---------------------------------------------------------------------------

interface StyleLetterboxRevealProps extends UniversalProps {
  title?: string;
  subtitle?: string;
  mode?: 'in' | 'out';
  duration?: number;
  maxBarHeight?: number;
  barColor?: string;
  textColor?: string;
  subtitleColor?: string;
  accentColor?: string;
  style?: Record<string, unknown>;
}

export const StyleLetterboxReveal: React.FC<StyleLetterboxRevealProps> = ({
  x = 0,
  y = 0,
  title = 'CINEMATIC',
  subtitle = 'A letterbox reveal',
  mode = 'in',
  duration = 60,
  maxBarHeight = 15,
  barColor = '#000000',
  textColor = '#ffffff',
  subtitleColor = '#93c5fd',
  accentColor = '#3b82f6',
  opacity: opacityProp = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();

  // --- Deterministic animation math (pure function of frame) ---
  // IN mode: bars shrink from maxBarHeight to 0; OUT mode: bars grow 0 to maxBarHeight
  const barHeight = mode === 'in'
    ? interpolate(frame, [0, duration], [maxBarHeight, 0], { extrapolateRight: 'clamp' })
    : interpolate(frame, [0, duration], [0, maxBarHeight], { extrapolateRight: 'clamp' });

  // Content opacity: fades in (in mode) or out (out mode)
  const contentOpacity = mode === 'in'
    ? interpolate(frame, [0, duration * 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [duration * 0.5, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // --- Layout sizing via useCanvas ---
  const titleFontSize = c.vmin(4);
  const subtitleFontSize = c.vmin(2.4);
  const letterSpacing = c.vmin(0.3);
  const accentBarWidth = c.vmin(8);
  const accentBarHeight = c.vmin(0.4);
  const gap = c.vmin(1.5);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        opacity: opacityProp,
        ...style,
      }}
    >
      {/* Top letterbox bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${barHeight}%`,
          backgroundColor: barColor,
          zIndex: 10,
        }}
      />

      {/* Bottom letterbox bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${barHeight}%`,
          backgroundColor: barColor,
          zIndex: 10,
        }}
      />

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: contentOpacity,
        }}
      >
        <div
          style={{
            width: `${accentBarWidth}px`,
            height: `${accentBarHeight}px`,
            background: accentColor,
            borderRadius: '2px',
            marginBottom: `${gap}px`,
          }}
        />
        <h1
          style={{
            color: textColor,
            fontSize: `${titleFontSize}px`,
            fontWeight: 'bold',
            margin: 0,
            letterSpacing: `${letterSpacing}em`,
            fontFamily: 'Inter Tight, sans-serif',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            color: subtitleColor,
            fontSize: `${subtitleFontSize}px`,
            marginTop: `${gap}px`,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {subtitle}
        </p>
        <div
          style={{
            width: `${accentBarWidth}px`,
            height: `${accentBarHeight}px`,
            background: accentColor,
            borderRadius: '2px',
            marginTop: `${gap}px`,
          }}
        />
      </div>
    </div>
  );
};
