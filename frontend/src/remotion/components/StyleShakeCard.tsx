import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

// ---------------------------------------------------------------------------
// StyleShakeCard — Card that shakes with decaying amplitude for impact moments
// ---------------------------------------------------------------------------

interface StyleShakeCardProps extends UniversalProps {
  title?: string;
  subtitle?: string;
  intensity?: number;
  duration?: number;
  frequency?: number;
  cardBg?: string;
  borderColor?: string;
  subtitleColor?: string;
  accentColor?: string;
  style?: Record<string, unknown>;
}

export const StyleShakeCard: React.FC<StyleShakeCardProps> = ({
  x = 540,
  y = 960,
  title = 'IMPACT',
  subtitle = 'Camera shake with decaying amplitude',
  intensity = 15,
  duration = 60,
  frequency = 0.8,
  bgColor = '#111827',
  cardBg = 'linear-gradient(135deg, #1e293b, #0f172a)',
  borderColor = 'rgba(59, 130, 246, 0.3)',
  textColor = '#ffffff',
  subtitleColor = '#93c5fd',
  accentColor = '#3b82f6',
  opacity: opacityProp = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();

  // --- Deterministic shake math (pure function of frame) ---
  const amplitude = interpolate(frame, [0, duration], [intensity, 0], {
    extrapolateRight: 'clamp',
  });
  const shakeX = Math.sin(frame * frequency) * amplitude;
  const shakeY = Math.cos(frame * frequency * 1.375) * amplitude;

  // --- Layout sizing via useCanvas ---
  const cardWidth = c.vw(50);
  const cardPadding = c.vmin(3);
  const titleFontSize = c.vmin(4);
  const subtitleFontSize = c.vmin(2.4);
  const accentLineWidth = c.vmin(6);
  const borderRadius = c.vmin(2);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) translate(${shakeX}px, ${shakeY}px)`,
        width: '100%',
        height: '100%',
        backgroundColor: bgColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: opacityProp,
        ...style,
      }}
    >
      <div
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: `${borderRadius}px`,
          padding: `${cardPadding}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: `${cardWidth}px`,
          boxShadow: `0 0 ${c.vmin(4)}px ${borderColor}`,
        }}
      >
        <h1
          style={{
            color: textColor,
            fontSize: `${titleFontSize}px`,
            fontWeight: 'bold',
            margin: 0,
            letterSpacing: '0.15em',
            fontFamily: 'Inter Tight, sans-serif',
          }}
        >
          {title}
        </h1>
        <div
          style={{
            width: `${accentLineWidth}px`,
            height: '3px',
            background: `linear-gradient(90deg, ${accentColor}, #a855f7)`,
            margin: `${c.vmin(1.5)}px 0`,
            borderRadius: '2px',
          }}
        />
        <p
          style={{
            color: subtitleColor,
            fontSize: `${subtitleFontSize}px`,
            margin: 0,
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
};
