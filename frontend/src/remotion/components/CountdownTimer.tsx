import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface CountdownTimerProps extends UniversalProps {
  seconds?: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  seconds = 10,
  bgColor = '#0f172a',
  textColor = '#ffffff',
  color = '#eab308', // Ring color
  x = 540,
  y = 540,
  fontSize = 200,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance
  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  // Countdown logic
  const elapsedSeconds = adjustedFrame / fps;
  const currentNumber = Math.max(0, Math.ceil(seconds - elapsedSeconds));
  
  // Pop on each second tick
  const tickFrame = adjustedFrame % fps;
  const tickPop = spring({ frame: tickFrame, fps, config: { damping: 12, mass: 0.5 } });
  const scale = entrance * (0.9 + (tickPop * 0.1));

  // Ring progress
  const progress = interpolate(adjustedFrame, [0, seconds * fps], [0, 100], { extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${scale})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', zIndex: 50 }}>
      {/* Background circle */}
      <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', backgroundColor: bgColor, boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }} />
      
      {/* SVG Ring */}
      <svg width="450" height="450" viewBox="0 0 100 100" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#334155" strokeWidth="6" />
        <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray="283" strokeDashoffset={(progress / 100) * 283} />
      </svg>
      
      {/* Number */}
      <div style={{ fontSize: `${fontSize}px`, fontWeight: 900, color: textColor, zIndex: 2, fontVariantNumeric: 'tabular-nums' }}>
        {currentNumber}
      </div>
    </div>
  );
};
