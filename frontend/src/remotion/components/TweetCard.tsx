import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface TweetCardProps extends UniversalProps {
  username?: string;
  handle?: string;
  content?: string;
  retweets?: string;
  likes?: string;
  verified?: boolean;
}

export const TweetCard: React.FC<TweetCardProps> = ({
  username = 'SaaS Founder',
  handle = '@saas_founder',
  content = 'Just shipped the new feature. Building in public is the ultimate cheat code. 🚀',
  retweets = '1.2K',
  likes = '4.5K',
  verified = true,
  bgColor = '#ffffff',
  textColor = '#0f172a',
  color = '#1d9bf0', // X/Twitter Blue
  x = 540,
  y = 540,
  fontSize,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  // Relativo al lienzo (antes px: width 800, fontSize 24-32, avatar 80, svg 24-28).
  const fs = fontSize ?? c.vmin(4.2);
  const avatar = c.vmin(13);
  const statFont = c.vmin(3.2);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, width: `${c.vw(86)}px`, backgroundColor: bgColor, borderRadius: `${c.vmin(3.6)}px`, padding: `${c.vmin(5)}px`, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 50 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(3)}px`, marginBottom: `${c.vmin(3)}px` }}>
        <div style={{ width: avatar, height: avatar, borderRadius: '50%', backgroundColor: '#cbd5e1', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(0.8)}px` }}>
            <span style={{ fontWeight: 'bold', fontSize: `${c.vmin(4.4)}px`, color: textColor }}>{username}</span>
            {verified && (
              <svg width={c.vmin(4)} height={c.vmin(4)} viewBox="0 0 24 24" fill={color}><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.746 1.867 3.447-.04.283-.062.573-.062.87 0 2.21 1.71 3.998 3.918 3.998.47 0 .92-.084 1.336-.25C9.182 21.585 10.49 22.5 12 22.5s2.816-.917 3.337-2.25c.416.165.866.25 1.336.25 2.21 0 3.918-1.79 3.918-4 0-.297-.02-.587-.062-.87 1.127-.702 1.867-1.988 1.867-3.447zm-12.874 5.923l-4.14-4.14L6.9 12.87l2.726 2.727 6.963-6.964 1.414 1.414-8.377 8.378z" /></svg>
            )}
          </div>
          <span style={{ fontSize: `${c.vmin(3.2)}px`, color: '#64748b' }}>{handle}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ fontSize: `${fs}px`, color: textColor, lineHeight: 1.5, marginBottom: `${c.vmin(3.5)}px` }}>
        {content}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: `${c.vmin(5)}px`, color: '#64748b', fontSize: `${statFont}px`, fontWeight: 500, borderTop: '1px solid #e2e8f0', paddingTop: `${c.vmin(3)}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(1.4)}px` }}>
          <svg width={c.vmin(4.6)} height={c.vmin(4.6)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
          {likes}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(1.4)}px` }}>
          <svg width={c.vmin(4.6)} height={c.vmin(4.6)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
          {retweets}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(1.4)}px`, color: '#ef4444' }}>
          <svg width={c.vmin(4.6)} height={c.vmin(4.6)} viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          {likes}
        </div>
      </div>
    </div>
  );
};
