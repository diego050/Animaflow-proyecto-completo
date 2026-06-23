/**
 * EndCard — Closing "thanks for watching" card: a glowing bordered panel with a
 * title, a CTA button, a row of social dots, and a studio/credit line, all
 * springing in with staggered delays (end card / outro / thanks for watching /
 * subscribe). Fully atomic: every color, label, size, delay and toggle is a prop.
 *
 * Coordinate contract: x/y = offset from canvas center (card position).
 * Full-bleed background gradient behind the card. All sizing via useCanvas().
 * Deterministic: springs/glow from useCurrentFrame().
 */
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import type { UniversalProps } from './types';

interface EndCardProps extends UniversalProps {
  // Background
  bgColor1?: string;
  bgColor2?: string;
  showBackground?: boolean;
  // Card
  cardBg?: string;
  borderColor?: string;
  borderRadius?: number;
  glow?: boolean;
  glowColor?: string;
  glowSpeed?: number;
  // Title
  title?: string;
  titleColor?: string;
  titleWeight?: number;
  // Button
  showButton?: boolean;
  buttonLabel?: string;
  buttonTextColor?: string;
  buttonGradientStart?: string;
  buttonGradientEnd?: string;
  buttonDelay?: number;
  // Social
  showSocial?: boolean;
  socialColors?: string[];
  socialDelay?: number;
  // Studio / credit
  showStudio?: boolean;
  studioName?: string;
  studioColor?: string;
  // Motion
  springDamping?: number;
  springMass?: number;
  speed?: number;
  style?: Record<string, unknown>;
}

export const EndCard: React.FC<EndCardProps> = ({
  x = 0,
  y = 0,
  bgColor1 = '#111827',
  bgColor2 = '#1a1a2e',
  showBackground = true,
  cardBg = 'rgba(17, 24, 39, 0.8)',
  borderColor = '#4361ee',
  borderRadius = 16,
  glow = true,
  glowColor = '#4361ee',
  glowSpeed = 1,
  title = 'Thanks for Watching',
  titleColor = '#ffffff',
  titleWeight = 700,
  showButton = true,
  buttonLabel = 'Subscribe for More',
  buttonTextColor = '#ffffff',
  buttonGradientStart = '#4361ee',
  buttonGradientEnd = '#7209b7',
  buttonDelay = 20,
  showSocial = true,
  socialColors = ['#3b82f6', '#4361ee', '#7209b7', '#9333ea'],
  socialDelay = 30,
  showStudio = true,
  studioName = 'STUDIO CREATIVE',
  studioColor = 'rgba(255,255,255,0.5)',
  springDamping = 12,
  springMass = 0.6,
  fontSize,
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const f = frame * Math.max(0.05, speed);

  const titleSize = fontSize ?? c.vmin(7);
  const cfg = { damping: springDamping, mass: springMass };

  const scale = spring({ frame: f, fps, from: 0.8, to: 1, durationInFrames: 35, config: cfg });
  const contentOpacity = spring({ frame: f, fps, from: 0, to: 1, durationInFrames: 30 });
  const glowAmt = glow ? interpolate(Math.sin(f * 0.08 * glowSpeed), [-1, 1], [0.3, 0.7]) : 0;
  const buttonOpacity = showButton ? spring({ frame: Math.max(0, f - buttonDelay), fps, from: 0, to: 1, durationInFrames: 25 }) : 0;
  const iconsOpacity = showSocial ? spring({ frame: Math.max(0, f - socialDelay), fps, from: 0, to: 1, durationInFrames: 25 }) : 0;

  const dot = c.vmin(4);
  const pad = c.vmin(5);

  const card = (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity: contentOpacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: `${pad}px ${pad * 1.4}px`,
        borderRadius: `${borderRadius}px`,
        border: `2px solid ${glow ? glowColor : borderColor}`,
        boxShadow: glow ? `0 0 ${c.vmin(5)}px ${glowColor}` : 'none',
        background: cardBg,
        fontFamily: 'Inter, system-ui, sans-serif',
        ...(glow ? { borderColor: glowColor, opacity: contentOpacity } : {}),
        ...style,
      }}
    >
      {/* Glow strength via an extra shadow layer so it can pulse atomically */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: `${borderRadius}px`, boxShadow: glow ? `0 0 ${c.vmin(8)}px ${glowColor}` : 'none', opacity: glowAmt, pointerEvents: 'none' }} />

      <div style={{ color: titleColor, fontSize: `${titleSize}px`, fontWeight: titleWeight, letterSpacing: '0.03em', textAlign: 'center', lineHeight: 1.1 }}>
        {title}
      </div>

      {showButton && (
        <div
          style={{
            opacity: buttonOpacity,
            marginTop: `${c.vmin(4)}px`,
            padding: `${c.vmin(2)}px ${c.vmin(5)}px`,
            background: `linear-gradient(90deg, ${buttonGradientStart}, ${buttonGradientEnd})`,
            borderRadius: `${c.vmin(1.2)}px`,
          }}
        >
          <span style={{ color: buttonTextColor, fontSize: `${titleSize * 0.4}px`, fontWeight: 600, letterSpacing: '0.05em' }}>
            {buttonLabel}
          </span>
        </div>
      )}

      {showSocial && (
        <div style={{ display: 'flex', gap: `${c.vmin(2)}px`, marginTop: `${c.vmin(4)}px`, opacity: iconsOpacity }}>
          {(socialColors || []).map((col, i) => (
            <div key={i} style={{ width: `${dot}px`, height: `${dot}px`, borderRadius: '50%', background: col }} />
          ))}
        </div>
      )}

      {showStudio && (
        <div style={{ color: studioColor, fontSize: `${titleSize * 0.28}px`, marginTop: `${c.vmin(3.5)}px`, letterSpacing: '0.1em', fontWeight: 300 }}>
          {studioName}
        </div>
      )}
    </div>
  );

  if (!showBackground) return card;

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${bgColor1} 0%, ${bgColor2} 100%)`, zIndex: 0 }} />
      {card}
    </>
  );
};
