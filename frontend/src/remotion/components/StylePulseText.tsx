/**
 * StylePulseText — Per-character pulse animation with glow.
 *
 * Each character scales up and down in a wave pattern with a blurred
 * glow circle behind it. The animation loops continuously.
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas() — no hardcoded px.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StylePulseTextProps extends UniversalProps {
  text?: string;
  textColor?: string;
  glowColor?: string;
  cycleDuration?: number;
  staggerDelay?: number;
  pulseScale?: number;
  fontWeight?: number;
  style?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StylePulseText: React.FC<StylePulseTextProps> = ({
  x = 0,
  y = 0,
  text = 'PULSE',
  textColor = '#ffffff',
  glowColor = 'rgba(255, 255, 255, 0.2)',
  cycleDuration = 30,
  staggerDelay = 6,
  pulseScale = 1.2,
  fontWeight = 800,
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();

  // Layout sizing via canvas
  const computedFontSize = fontSize ?? c.vmin(10);
  const glowSize = c.vmin(8);
  const glowBlur = c.vmin(2);
  const charGap = c.vmin(1);

  const characters = text.split('');

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        gap: `${charGap}px`,
        ...style,
      }}
    >
      {characters.map((char, i) => {
        const delay = i * staggerDelay;
        const cyclePos = ((frame - delay) % cycleDuration + cycleDuration) % cycleDuration / cycleDuration;

        // Scale: 1 → pulseScale → 1
        const scale = interpolate(cyclePos, [0, 0.5, 1], [1, pulseScale, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        // Glow opacity: 0.5 → 1 → 0.5
        const glowOpacity = interpolate(cyclePos, [0, 0.5, 1], [0.5, 1, 0.5], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={i}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${scale})`,
            }}
          >
            {/* Character */}
            <span
              style={{
                fontSize: `${computedFontSize}px`,
                fontWeight,
                color: textColor,
                position: 'relative',
                zIndex: 2,
                whiteSpace: 'pre',
                lineHeight: 1,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>

            {/* Glow circle */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${glowSize}px`,
                height: `${glowSize}px`,
                background: glowColor,
                borderRadius: '50%',
                filter: `blur(${glowBlur}px)`,
                opacity: glowOpacity,
                zIndex: 1,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
