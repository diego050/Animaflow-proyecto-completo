/**
 * GitHubStars — GitHub repo card with an animated star counter and star icon
 * (GitHub stars / repo card / star count / open source). Light or dark theme.
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas(). Count-up driven by useCurrentFrame() (deterministic).
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { useCanvas } from '../utils/canvas';
import { elevation, radius } from '../utils/tokens';
import type { UniversalProps } from './types';

interface GitHubStarsProps extends UniversalProps {
  repo?: string;
  totalStars?: number;
  startStars?: number;
  orientation?: 'horizontal' | 'vertical';
  theme?: 'light' | 'dark';
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  mutedColor?: string;
  duration?: number;
  speed?: number;
  style?: Record<string, unknown>;
}

export const GitHubStars: React.FC<GitHubStarsProps> = ({
  x = 0,
  y = 0,
  repo = 'kapishdima/remocn',
  totalStars = 24813,
  startStars = 0,
  orientation = 'horizontal',
  theme = 'light',
  accentColor = '#ffbb00',
  bgColor,
  textColor,
  mutedColor,
  fontSize,
  duration = 60,
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const f = frame * Math.max(0.05, speed);

  const dark = theme === 'dark';
  const bg = bgColor ?? (dark ? '#0d1117' : '#ffffff');
  const fg = textColor ?? (dark ? '#e6edf3' : '#1f2328');
  const muted = mutedColor ?? (dark ? '#8b949e' : '#59636e');
  const border = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  const entrance = spring({ frame: f, fps, config: { damping: 14 } });
  const countP = interpolate(f, [10, 10 + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const value = Math.round(startStars + (totalStars - startStars) * countP);

  const fs = fontSize ?? c.vmin(5.5);
  const horizontal = orientation === 'horizontal';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: `translate(-50%, -50%) scale(${entrance})`,
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: `${radius('lg', c.vmin)}px`,
        boxShadow: elevation(2, c.vmin),
        padding: `${c.vmin(4)}px ${c.vmin(5)}px`,
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: 'center',
        gap: `${c.vmin(3)}px`,
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(2)}px` }}>
        <span style={{ fontSize: `${fs}px`, color: accentColor }}>★</span>
        <span style={{ fontSize: `${fs * 1.2}px`, color: fg, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {value.toLocaleString('en-US')}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: horizontal ? 'flex-start' : 'center' }}>
        <span style={{ fontSize: `${fs * 0.5}px`, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stars</span>
        <span style={{ fontSize: `${fs * 0.6}px`, color: fg, fontWeight: 600 }}>{repo}</span>
      </div>
    </div>
  );
};
