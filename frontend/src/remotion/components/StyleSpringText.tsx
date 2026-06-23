/**
 * StyleSpringText — Per-character spring entrance with opacity, translation, and rotation.
 *
 * Each character springs in from a configurable direction (top/bottom/left) with
 * opacity 0→1, Y/X offset→0, and rotation→0. Staggered delay between characters.
 * ONE-TIME entrance animation (not looping).
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas() — no hardcoded px.
 */
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StyleSpringTextProps extends UniversalProps {
  text?: string;
  textColor?: string;
  fontWeight?: number;
  staggerDelay?: number;
  springMass?: number;
  springDamping?: number;
  entranceFrom?: 'top' | 'bottom' | 'left';
  maxRotation?: number;
  textAlign?: 'left' | 'center' | 'right';
  style?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StyleSpringText: React.FC<StyleSpringTextProps> = ({
  x = 0,
  y = 0,
  text = 'Hello Remotion',
  textColor = '#ffffff',
  fontWeight = 800,
  staggerDelay = 5,
  springMass = 0.5,
  springDamping = 10,
  entranceFrom = 'top',
  maxRotation = -180,
  textAlign = 'center',
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();

  // Layout sizing via canvas
  const computedFontSize = fontSize ?? c.vmin(8);
  const yOffset = c.vmin(5);
  const xOffset = c.vmin(5);

  const characters = text.split('');

  // Spring config (shared across all characters)
  const springConfig = { mass: springMass, damping: springDamping };

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        width: '100%',
        textAlign,
        ...style,
      }}
    >
      {characters.map((char, i) => {
        const delay = i * staggerDelay;
        const springFrame = frame - delay;

        // Opacity: 0 → 1
        const opacity = spring({
          frame: springFrame,
          fps,
          from: 0,
          to: 1,
          config: springConfig,
        });

        // Translation: offset → 0 (direction depends on entranceFrom)
        let translateX = 0;
        let translateY = 0;
        if (entranceFrom === 'top') {
          translateY = spring({ frame: springFrame, fps, from: -yOffset, to: 0, config: springConfig });
        } else if (entranceFrom === 'bottom') {
          translateY = spring({ frame: springFrame, fps, from: yOffset, to: 0, config: springConfig });
        } else {
          translateX = spring({ frame: springFrame, fps, from: -xOffset, to: 0, config: springConfig });
        }

        // Rotation: maxRotation → 0
        const rotate = spring({
          frame: springFrame,
          fps,
          from: maxRotation,
          to: 0,
          config: { mass: springMass, damping: springDamping + 2 },
        });

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              color: textColor,
              fontSize: `${computedFontSize}px`,
              fontWeight,
              whiteSpace: 'pre',
              lineHeight: 1,
              transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg)`,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </div>
  );
};
