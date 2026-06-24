import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

// ---------------------------------------------------------------------------
// StyleClockWipe — Clock wipe transition that reveals/hides content using a
// conic-gradient mask that sweeps like a clock hand.
// ---------------------------------------------------------------------------

interface StyleClockWipeProps extends UniversalProps {
  title?: string;
  subtitle?: string;
  mode?: 'in' | 'out';
  direction?: 'clockwise' | 'counter-clockwise';
  duration?: number;
  bgColor?: string;
  overlayBg?: string;
  textColor?: string;
  subtitleColor?: string;
  accentColor?: string;
  style?: Record<string, unknown>;
}

export const StyleClockWipe: React.FC<StyleClockWipeProps> = ({
  x = 540,
  y = 960,
  title = 'SCENE B',
  subtitle = 'Revealed by clock wipe',
  mode = 'in',
  direction = 'clockwise',
  duration = 75,
  bgColor = 'linear-gradient(135deg, #3b1f5e, #111827)',
  overlayBg = 'linear-gradient(135deg, #1e3a5f, #111827)',
  textColor = '#ffffff',
  subtitleColor = '#c084fc',
  accentColor = '#a855f7',
  style: styleOverride,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();

  // --- Layout sizing (responsive via useCanvas) ---
  const titleFs = c.vmin(3.5);
  const subtitleFs = c.vmin(2.4);
  const iconSize = c.vmin(8);
  const gap = c.vmin(1);

  // --- Deterministic angle math ---
  const startAngle = mode === 'in' ? 0 : 360;
  const endAngle = mode === 'in' ? 360 : 0;
  const angle = direction === 'counter-clockwise'
    ? interpolate(frame, [0, duration], [360 - startAngle, 360 - endAngle], { extrapolateRight: 'clamp' })
    : interpolate(frame, [0, duration], [startAngle, endAngle], { extrapolateRight: 'clamp' });

  // --- Conic-gradient mask for the overlay (scene A being wiped away) ---
  const maskAngle = mode === 'in' ? angle : 360 - angle;
  const maskImage = `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent ${maskAngle}deg, black ${maskAngle}deg, black 360deg)`;

  // --- Coordinate contract: absolute center from layoutSolver ---
  const left = x;
  const top = y;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translate(-50%, -50%)',
        width: `${c.width}px`,
        height: `${c.height}px`,
        ...(styleOverride as React.CSSProperties),
      }}
    >
      {/* Scene B — revealed content (background) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: bgColor,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: `${gap}px`,
        }}
      >
        <div
          style={{
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            borderRadius: '50%',
            background: accentColor,
            marginBottom: `${gap * 2}px`,
          }}
        />
        <span
          style={{
            fontSize: `${titleFs}px`,
            fontWeight: 800,
            fontFamily: 'Inter Tight, sans-serif',
            color: textColor,
            textAlign: 'center',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: `${subtitleFs}px`,
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
            color: subtitleColor,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </span>
      </div>

      {/* Scene A — overlay being wiped away via conic-gradient mask */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: overlayBg,
          WebkitMaskImage: maskImage,
          maskImage,
        }}
      />
    </div>
  );
};
