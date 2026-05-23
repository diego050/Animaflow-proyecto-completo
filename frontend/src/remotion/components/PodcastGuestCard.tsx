import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

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
  fontSize = 32,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  // Pulsing glow effect
  const pulse = Math.abs(Math.sin(adjustedFrame * 0.05));
  const glowOpacity = 0.3 + (pulse * 0.4);
  const glowSize = 30 + (pulse * 20);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, zIndex: 40 }}>
      {/* Outer Glow */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', backgroundColor: glowColor, filter: `blur(${glowSize}px)`, opacity: glowOpacity, borderRadius: '24px', zIndex: -1 }} />
      
      {/* Card */}
      <div style={{ width: '500px', backgroundColor: bgColor, borderRadius: '24px', padding: '30px', display: 'flex', alignItems: 'center', gap: '25px', boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
        {/* Placeholder Avatar */}
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#334155', border: `3px solid ${glowColor}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        
        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ fontWeight: 'bold', fontSize: `${fontSize}px`, color: textColor }}>{name}</div>
          <div style={{ fontSize: `${fontSize - 12}px`, color: glowColor, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>{role}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>REC</div>
          </div>
        </div>
      </div>
    </div>
  );
};
