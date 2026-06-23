/**
 * XFollowCard — X (Twitter) profile follow card: cover band, avatar, name +
 * verified badge, handle, bio, meta (location / website / joined) and a Follow
 * button (X profile / Twitter card / follow card / social profile).
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas(). Entrance driven by useCurrentFrame() (deterministic).
 */
import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';
import { elevation, radius } from '../utils/tokens';
import type { UniversalProps } from './types';

interface XFollowCardProps extends UniversalProps {
  name?: string;
  handle?: string;
  bio?: string;
  location?: string;
  website?: string;
  joined?: string;
  verified?: boolean;
  buttonLabel?: string;
  avatarUrl?: string;
  coverUrl?: string;
  avatarColor?: string;
  coverColor?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  mutedColor?: string;
  orientation?: 'horizontal' | 'vertical';
  cardWidth?: number;
  speed?: number;
  style?: Record<string, unknown>;
}

export const XFollowCard: React.FC<XFollowCardProps> = ({
  x = 0,
  y = 0,
  name = 'remocn',
  handle = 'remocn',
  bio = 'Production-ready components for Remotion — text animations, backgrounds, transitions, UI blocks.',
  location = 'Ukraine',
  website = 'remocn.dev',
  joined = 'January 2024',
  verified = true,
  buttonLabel = 'Follow',
  avatarUrl,
  coverUrl,
  avatarColor = '#1d9bf0',
  coverColor = '#16202a',
  accentColor = '#1d9bf0',
  bgColor = '#000000',
  textColor = '#e7e9ea',
  mutedColor = '#71767b',
  cardWidth = 760,
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const entrance = spring({ frame: frame * Math.max(0.05, speed), fps, config: { damping: 16 } });

  const fs = c.vmin(2.8);
  const coverH = c.vmin(16);
  const avatar = c.vmin(13);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: `translate(-50%, -50%) scale(${0.96 + entrance * 0.04})`,
        opacity: entrance,
        width: `${cardWidth}px`,
        backgroundColor: bgColor,
        border: `1px solid rgba(255,255,255,0.12)`,
        borderRadius: `${radius('lg', c.vmin)}px`,
        boxShadow: elevation(3, c.vmin),
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Cover */}
      <div style={{ height: `${coverH}px`, backgroundColor: coverColor, backgroundImage: coverUrl ? `url(${coverUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />

      <div style={{ padding: `0 ${c.vmin(4)}px ${c.vmin(4)}px` }}>
        {/* Avatar + Follow button row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: `-${avatar / 2}px` }}>
          <div style={{ width: `${avatar}px`, height: `${avatar}px`, borderRadius: '50%', backgroundColor: avatarColor, backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined, backgroundSize: 'cover', border: `${c.vmin(0.6)}px solid ${bgColor}` }} />
          <div style={{ marginBottom: `${c.vmin(1.5)}px`, backgroundColor: textColor, color: bgColor, fontWeight: 700, fontSize: `${fs}px`, padding: `${c.vmin(1.4)}px ${c.vmin(3.2)}px`, borderRadius: '999px' }}>{buttonLabel}</div>
        </div>

        {/* Identity */}
        <div style={{ marginTop: `${c.vmin(2)}px`, display: 'flex', alignItems: 'center', gap: `${c.vmin(1)}px` }}>
          <span style={{ color: textColor, fontSize: `${fs * 1.4}px`, fontWeight: 800 }}>{name}</span>
          {verified ? <span style={{ color: accentColor, fontSize: `${fs * 1.2}px` }}>✓</span> : null}
        </div>
        <div style={{ color: mutedColor, fontSize: `${fs}px` }}>@{handle}</div>

        {/* Bio */}
        <div style={{ color: textColor, fontSize: `${fs}px`, lineHeight: 1.4, marginTop: `${c.vmin(2)}px` }}>{bio}</div>

        {/* Meta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${c.vmin(2.5)}px`, color: mutedColor, fontSize: `${fs * 0.92}px`, marginTop: `${c.vmin(2)}px` }}>
          {location ? <span>📍 {location}</span> : null}
          {website ? <span style={{ color: accentColor }}>🔗 {website}</span> : null}
          {joined ? <span>🗓 Joined {joined}</span> : null}
        </div>
      </div>
    </div>
  );
};
