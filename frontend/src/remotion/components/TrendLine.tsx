import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

export const TrendLine: React.FC<{
  data?: number[]; // Array of Y values (0 to 100)
  width?: number;
  height?: number;
} & UniversalProps> = ({
  color = '#10b981', // Success green
  data = [20, 30, 25, 45, 40, 65, 55, 85, 80, 100],
  x = 540,
  y = 960,
  delay = 0,
  width = 800,
  height = 400,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig();

  // Progress of the line drawing
  const progress = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 200, stiffness: 50 }, // Slow smooth reveal
    durationInFrames: 60,
  });

  // Generate SVG path from data
  // Data points are spread equally across width
  const stepX = width / (data.length - 1);
  
  // Create path string (e.g. "M 0 400 L 100 300 ...")
  // In SVG, Y=0 is the top, so we invert the Y value (height - mapped value)
  const pathD = data.reduce((acc, val, i) => {
    const px = i * stepX;
    const py = height - (val / 100) * height;
    return acc + (i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`);
  }, '');

  // To animate SVG drawing, we need the path length.
  // We approximate the path length based on straight lines between points.
  let pathLength = 0;
  for (let i = 1; i < data.length; i++) {
    const dx = stepX;
    const dy = (height - (data[i]/100)*height) - (height - (data[i-1]/100)*height);
    pathLength += Math.sqrt(dx*dx + dy*dy);
  }

  // strokeDashoffset goes from length to 0 to reveal
  const dashOffset = interpolate(progress, [0, 1], [pathLength, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 10,
        // Optional grid lines
        backgroundImage: 'linear-gradient(to top, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '100% 25%',
      }}
    >
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Shadow / Glow effect */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: dashOffset,
            filter: `drop-shadow(0px 10px 15px ${color})`,
          }}
        />
        {/* Main Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: dashOffset,
          }}
        />
      </svg>
    </div>
  );
};
