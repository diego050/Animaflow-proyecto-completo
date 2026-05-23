import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface LoadingSpinnerProps extends UniversalProps {
  speed?: number;
  size?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  color = '#3b82f6',
  bgColor = '#1e293b',
  speed = 1,
  size = 100,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const rotation = (adjustedFrame * 5 * speed) % 360;
  
  // Opacity fade in
  const opacity = interpolate(adjustedFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', opacity, zIndex: 50 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        {/* Background Track */}
        <circle cx="50" cy="50" r="40" fill="none" stroke={bgColor} strokeWidth="10" />
        
        {/* Spinning Progress */}
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray="200" strokeDashoffset="100" style={{ transformOrigin: '50px 50px', transform: `rotate(${rotation}deg)` }} />
      </svg>
    </div>
  );
};
