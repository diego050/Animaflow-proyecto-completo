import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from "./types";

export const AbstractWave: React.FC<{
  width?: number;
  height?: number;
} & UniversalProps> = ({
  color = '#818cf8', // Indigo
  x = 540,
  y = 960,
  delay = 0,
  width = 1080,
  height = 400,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // We will generate multiple overlapping waves for a cool effect
  const numWaves = 3;
  const waves = [];

  for (let w = 0; w < numWaves; w++) {
    const points = [];
    // Calculate 50 points across the width
    const numPoints = 50;
    const stepX = width / numPoints;
    
    // Different speed and amplitude for each wave
    const speed = (w + 1) * 0.05;
    const amplitude = (height / 2) * (1 - w * 0.2); // Smaller as w increases
    const frequency = 0.01 + w * 0.005;

    for (let i = 0; i <= numPoints; i++) {
      const px = i * stepX;
      // Math.sin( x * frequency + timeOffset ) * amplitude
      const py = height / 2 + Math.sin(px * frequency + adjustedFrame * speed) * amplitude;
      points.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
    }
    
    waves.push(points.join(' '));
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 2,
      }}
    >
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {waves.map((pathD, i) => (
          <path
            key={i}
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={12 - i * 3} // Thinner for background waves
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity: 1 - i * 0.25,
              filter: `drop-shadow(0 0 ${10 + i*5}px ${color})`
            }}
          />
        ))}
      </svg>
    </div>
  );
};
