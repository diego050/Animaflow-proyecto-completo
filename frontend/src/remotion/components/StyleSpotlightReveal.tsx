import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

// ---------------------------------------------------------------------------
// StyleSpotlightReveal — Spotlight reveal using clip-path circle with edge glow
// ---------------------------------------------------------------------------

interface StyleSpotlightRevealProps extends UniversalProps {
  title?: string;
  subtitle?: string;
  mode?: 'in' | 'out';
  duration?: number;
  maxRadius?: number;
  revealBg?: string;
  subtitleColor?: string;
  accentColor?: string;
  accentColorEnd?: string;
  glowColor?: string;
  glowIntensity?: number;
  showAccentBars?: boolean;
  accentWidth?: number;
  accentHeight?: number;
  style?: Record<string, unknown>;
}

export const StyleSpotlightReveal: React.FC<StyleSpotlightRevealProps> = ({
  x = 0,
  y = 0,
  title = 'REVEALED',
  subtitle = 'Spotlight reveal transition',
  mode = 'in',
  duration = 60,
  maxRadius = 75,
  bgColor = 'transparent',
  revealBg = 'linear-gradient(135deg, #111827, #1e1b4b)',
  textColor = '#ffffff',
  subtitleColor = '#c4b5fd',
  accentColor = '#3b82f6',
  accentColorEnd = '#a855f7',
  glowColor = '#8b5cf6',
  glowIntensity = 0.6,
  showAccentBars = true,
  accentWidth,
  accentHeight,
  opacity: opacityProp = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();

  // --- Deterministic reveal math (pure function of frame) ---
  // 'in': radius grows 0 → maxRadius; 'out': radius shrinks maxRadius → 0
  const radius = mode === 'in'
    ? interpolate(frame, [0, duration], [0, maxRadius], { extrapolateRight: 'clamp' })
    : interpolate(frame, [0, duration], [maxRadius, 0], { extrapolateRight: 'clamp' });

  // Glow peaks at 30% for 'in' mode, at 70% for 'out' mode
  const glowPeak = mode === 'in' ? 0.3 : 0.7;
  const glowOpacity = interpolate(
    frame,
    [0, duration * glowPeak, duration],
    [0, glowIntensity, 0],
    { extrapolateRight: 'clamp' },
  );

  // --- Layout sizing via useCanvas ---
  const titleFontSize = c.vmin(4);
  const subtitleFontSize = c.vmin(2.4);
  const accentBarWidth = accentWidth ?? c.vmin(8);
  const accentBarHeight = accentHeight ?? c.vmin(0.4);
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
        backgroundColor: bgColor,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: opacityProp,
        ...style,
      }}
    >
      {/* Revealed area with clip-path */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: revealBg,
          clipPath: `circle(${radius}% at 50% 50%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {showAccentBars && (
          <div
            style={{
              width: `${accentBarWidth}px`,
              height: `${accentBarHeight}px`,
              background: `linear-gradient(90deg, ${accentColor}, ${accentColorEnd})`,
              borderRadius: '2px',
              marginBottom: `${gap}px`,
            }}
          />
        )}
        <h1
          style={{
            color: textColor,
            fontSize: `${titleFontSize}px`,
            fontWeight: 'bold',
            margin: 0,
            letterSpacing: '0.1em',
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
        {showAccentBars && (
          <div
            style={{
              width: `${accentBarWidth}px`,
              height: `${accentBarHeight}px`,
              background: `linear-gradient(90deg, ${accentColorEnd}, ${accentColor})`,
              borderRadius: '2px',
              marginTop: `${gap}px`,
            }}
          />
        )}
      </div>

      {/* Edge glow overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, transparent ${radius - 2}%, ${glowColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')} ${radius}%, transparent ${radius + 3}%)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
