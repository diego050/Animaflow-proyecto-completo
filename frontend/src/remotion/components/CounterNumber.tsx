import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface CounterNumberProps extends UniversalProps {
  from?: number;
  to?: number;
  prefix?: string;
  suffix?: string;
}

export const CounterNumber: React.FC<CounterNumberProps> = ({
  from = 0,
  to = 1000000,
  prefix = '$',
  suffix = '+',
  color = '#22c55e',
  x = 540,
  y = 540,
  fontSize = 150,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance scale
  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 12 } });
  
  // Count animation
  const countProgress = spring({ frame: Math.max(0, adjustedFrame - 10), fps, config: { damping: 20, mass: 2 } });
  const currentValue = from + (to - from) * countProgress;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, display: 'flex', alignItems: 'baseline', gap: '10px', fontFamily: 'Inter, sans-serif', zIndex: 60, textShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
      {prefix && (
        <div style={{ fontSize: `${fontSize * 0.6}px`, fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>
          {prefix}
        </div>
      )}
      
      <div style={{ fontSize: `${fontSize}px`, fontWeight: 900, color: color, fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(currentValue).toLocaleString()}
      </div>
      
      {suffix && (
        <div style={{ fontSize: `${fontSize * 0.6}px`, fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>
          {suffix}
        </div>
      )}
    </div>
  );
};
