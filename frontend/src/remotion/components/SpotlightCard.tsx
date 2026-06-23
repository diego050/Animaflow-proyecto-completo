/**
 * SpotlightCard — Dark card where a soft radial light glides over the surface,
 * grazing a thin micro-border, with a title and body.
 *
 * Since video has no cursor, the spotlight follows a deterministic orbit inside
 * the card instead of the pointer.
 *
 * Coordinate contract: x/y = absolute canvas coords (solver-resolved center of the element); centered via translate(-50%,-50%).
 * Card dimensions are user-controlled props; type sizing derives from useCanvas.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface SpotlightCardProps extends UniversalProps {
  title?: string;
  body?: string;
  cardWidth?: number;
  cardHeight?: number;
  /** Diameter of the spotlight in px. */
  glowSize?: number;
  /** Spotlight strength (0–1). */
  glowOpacity?: number;
  glowColor?: string;
  cardColor?: string;
  textColor?: string;
  mutedColor?: string;
  borderColor?: string;
  borderRadius?: number;
  /** Orbit speed multiplier. */
  speed?: number;
  style?: Record<string, unknown>;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  x = 540,
  y = 960,
  title = 'Spotlight Card',
  body = 'Soft radial light glides across the surface, grazing the micro-border.',
  cardWidth = 520,
  cardHeight = 320,
  glowSize = 600,
  glowOpacity = 0.08,
  glowColor = '#ffffff',
  cardColor = '#0a0a0a',
  textColor = '#fafafa',
  mutedColor = '#71717a',
  borderColor = 'rgba(255,255,255,0.10)',
  borderRadius = 24,
  speed = 1,
  fontSize,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const t = frame * 0.04 * Math.max(0.05, speed);
  const gx = 50 + Math.cos(t) * 38; // percent within card
  const gy = 50 + Math.sin(t * 1.3) * 38;

  const titleSize = fontSize ?? c.vmin(4.2);
  const bodySize = titleSize * 0.5;
  const pad = c.vmin(3);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        borderRadius: `${borderRadius}px`,
        backgroundColor: cardColor,
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Spotlight glow following a deterministic orbit */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(${glowSize}px circle at ${gx.toFixed(2)}% ${gy.toFixed(2)}%, ${glowColor}, transparent 60%)`,
          opacity: glowOpacity,
          pointerEvents: 'none',
        }}
      />
      {/* Content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${pad}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: `${titleSize * 0.3}px`,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ color: textColor, fontSize: `${titleSize}px`, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
        <div style={{ color: mutedColor, fontSize: `${bodySize}px`, fontWeight: 400, lineHeight: 1.4 }}>{body}</div>
      </div>
    </div>
  );
};
