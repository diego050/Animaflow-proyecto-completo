import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

export const PercentageRing: React.FC<{
  targetPercentage?: number; // 0 to 100
  size?: number; // Diameter of the circle
} & UniversalProps> = ({
  targetPercentage = 85,
  color = '#8b5cf6', // Purple
  x = 540,
  y = 960,
  delay = 0,
  size = 400,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig();

  // Animation progress
  const progress = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 14, stiffness: 60 },
  });

  const currentPercentage = Math.round(interpolate(progress, [0, 1], [0, targetPercentage]));

  // SVG Circle math
  const strokeWidth = size * 0.08; // 8% of size
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Offset calculated from progress
  const strokeDashoffset = circumference - (currentPercentage / 100) * circumference;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${size}px`,
        height: `${size}px`,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Number inside */}
      <div
        style={{
          position: 'absolute',
          fontSize: `${size * 0.25}px`,
          fontWeight: 800,
          color: textColor || '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {currentPercentage}%
      </div>

      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Animated fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
            filter: `drop-shadow(0 0 10px ${color})`,
          }}
        />
      </svg>
    </div>
  );
};
