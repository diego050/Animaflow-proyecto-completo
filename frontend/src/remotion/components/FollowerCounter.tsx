import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

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
  fontSize = 120,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance
  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  // Count animation
  const countProgress = spring({ frame: Math.max(0, adjustedFrame - 20), fps, config: { damping: 20, mass: 2 } });
  const currentValue = startCount + (endCount - startCount) * countProgress;

  // Platform label
  const label = platform === 'youtube' ? 'SUBSCRIBERS' : 'FOLLOWERS';

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: bgColor, padding: '50px 100px', borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.2)', fontFamily: 'Inter, sans-serif', zIndex: 60 }}>
      
      {/* Platform Icon Placeholder (Circle) */}
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: color, marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold' }}>
        {platform.charAt(0).toUpperCase()}
      </div>

      <div style={{ fontSize: `${fontSize}px`, fontWeight: 900, color: textColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {Math.round(currentValue).toLocaleString()}
      </div>
      
      <div style={{ fontSize: '32px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '4px', marginTop: '10px' }}>
        {label}
      </div>
    </div>
  );
};
