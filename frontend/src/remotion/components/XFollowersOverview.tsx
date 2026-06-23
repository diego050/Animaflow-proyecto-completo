/**
 * XFollowersOverview — X (Twitter) followers summary card: avatar, handle, a big
 * animated follower count and label (followers / X stats / social proof / growth).
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas(). Count-up driven by useCurrentFrame() (deterministic).
 */
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import { elevation, radius } from '../utils/tokens';
import type { UniversalProps } from './types';

interface XFollowersOverviewProps extends UniversalProps {
  totalFollowers?: number;
  startFollowers?: number;
  handle?: string;
  label?: string;
  avatarUrl?: string;
  avatarColor?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  mutedColor?: string;
  orientation?: 'horizontal' | 'vertical';
  duration?: number;
  speed?: number;
  style?: Record<string, unknown>;
}

export const XFollowersOverview: React.FC<XFollowersOverviewProps> = ({
  x = 0,
  y = 0,
  totalFollowers = 1709,
  startFollowers = 0,
  handle = 'remocn',
  label = 'Followers',
  avatarUrl,
  avatarColor = '#1d9bf0',
  accentColor = '#1d9bf0',
  bgColor = '#000000',
  textColor = '#e7e9ea',
  mutedColor = '#71767b',
  orientation = 'horizontal',
  fontSize,
  duration = 60,
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const f = frame * Math.max(0.05, speed);

  const entrance = spring({ frame: f, fps, config: { damping: 15 } });
  const countP = interpolate(f, [12, 12 + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const value = Math.round(startFollowers + (totalFollowers - startFollowers) * countP);

  const fs = fontSize ?? c.vmin(9);
  const avatar = c.vmin(11);
  const horizontal = orientation === 'horizontal';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: `translate(-50%, -50%) scale(${entrance})`,
        backgroundColor: bgColor,
        border: `1px solid rgba(255,255,255,0.12)`,
        borderRadius: `${radius('lg', c.vmin)}px`,
        boxShadow: elevation(3, c.vmin),
        padding: `${c.vmin(5)}px ${c.vmin(6)}px`,
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: 'center',
        gap: `${c.vmin(4)}px`,
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(2.5)}px` }}>
        <div style={{ width: `${avatar}px`, height: `${avatar}px`, borderRadius: '50%', backgroundColor: avatarColor, backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined, backgroundSize: 'cover' }} />
        <span style={{ color: mutedColor, fontSize: `${c.vmin(3)}px`, fontWeight: 500 }}>@{handle}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: horizontal ? 'flex-start' : 'center' }}>
        <span style={{ color: textColor, fontSize: `${fs}px`, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {value.toLocaleString('en-US')}
        </span>
        <span style={{ color: accentColor, fontSize: `${fs * 0.3}px`, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{label}</span>
      </div>
    </div>
  );
};
