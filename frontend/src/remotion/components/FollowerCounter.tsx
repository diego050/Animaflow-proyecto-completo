import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface FollowerCounterProps extends UniversalProps {
  startCount?: number;
  endCount?: number;
  platform?: 'youtube' | 'insta' | 'tiktok';
}

export const FollowerCounter: React.FC<FollowerCounterProps> = ({
  startCount = 5000,
  endCount = 100000,
  platform = 'insta',
  color = '#e1306c', // Default IG
  bgColor = '#ffffff',
  textColor = '#0f172a',
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
  const countProgress = spring({ frame: Math.max(0, adjustedFrame - 20), fps, config: { damping: 20, mass: 2 } });
  const currentValue = startCount + (endCount - startCount) * countProgress;

  const label = platform === 'youtube' ? 'SUBSCRIBERS' : 'FOLLOWERS';
  // Relativo al lienzo (antes px: fontSize 120, icon 80, padding 50/100).
  const fs = fontSize ?? c.vmin(16);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: bgColor, padding: `${c.vmin(7)}px ${c.vmin(12)}px`, borderRadius: `${c.vmin(3.6)}px`, boxShadow: '0 30px 60px rgba(0,0,0,0.2)', fontFamily: 'Inter, sans-serif', zIndex: 60 }}>
      {/* Platform Icon Placeholder (Circle) */}
      <div style={{ width: c.vmin(12), height: c.vmin(12), borderRadius: '50%', backgroundColor: color, marginBottom: `${c.vmin(3)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: `${c.vmin(5)}px`, fontWeight: 'bold' }}>
        {platform.charAt(0).toUpperCase()}
      </div>

      <div style={{ fontSize: `${fs}px`, fontWeight: 900, color: textColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {Math.round(currentValue).toLocaleString()}
      </div>

      <div style={{ fontSize: `${c.vmin(4)}px`, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '4px', marginTop: `${c.vmin(1.6)}px` }}>
        {label}
      </div>
    </div>
  );
};
