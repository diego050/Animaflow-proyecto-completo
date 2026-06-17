import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface PodcastGuestCardProps extends UniversalProps {
  name?: string;
  role?: string;
  glowColor?: string;
}

export const PodcastGuestCard: React.FC<PodcastGuestCardProps> = ({
  name = 'Sam Altman',
  role = 'CEO, OpenAI',
  glowColor = '#3b82f6',
  bgColor = '#0f172a',
  textColor = '#ffffff',
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

  const pulse = Math.abs(Math.sin(adjustedFrame * 0.05));
  const glowOpacity = 0.3 + pulse * 0.4;
  const glowSize = c.vmin(4) + pulse * c.vmin(2.6);

  // Relativo al lienzo (antes px: card 500, avatar 100, fontSize 32, padding 30).
  const fs = fontSize ?? c.vmin(5);
  const avatar = c.vmin(16);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, zIndex: 40 }}>
      {/* Outer Glow */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', backgroundColor: glowColor, filter: `blur(${glowSize}px)`, opacity: glowOpacity, borderRadius: `${c.vmin(3.6)}px`, zIndex: -1 }} />

      {/* Card */}
      <div style={{ width: `${c.vw(74)}px`, backgroundColor: bgColor, borderRadius: `${c.vmin(3.6)}px`, padding: `${c.vmin(4)}px`, display: 'flex', alignItems: 'center', gap: `${c.vmin(3.5)}px`, boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
        {/* Placeholder Avatar */}
        <div style={{ width: avatar, height: avatar, borderRadius: '50%', backgroundColor: '#334155', border: `${c.vmin(0.5)}px solid ${glowColor}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width={c.vmin(8)} height={c.vmin(8)} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </div>

        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: `${c.vmin(1.2)}px`, fontFamily: 'Inter, sans-serif' }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fs}px`, color: textColor }}>{name}</div>
          <div style={{ fontSize: `${fs - c.vmin(2)}px`, color: glowColor, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>{role}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(1)}px`, marginTop: `${c.vmin(1)}px` }}>
            <div style={{ width: c.vmin(1.6), height: c.vmin(1.6), borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ fontSize: `${c.vmin(2.4)}px`, color: '#94a3b8' }}>REC</div>
          </div>
        </div>
      </div>
    </div>
  );
};
