import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

export const BarChartReveal: React.FC<{
  color1?: string; // Main color of the bars
  color2?: string; // Secondary color
  data?: number[]; // Array of values (0 to 100)
  width?: number;
  height?: number;
} & UniversalProps> = ({
  color1 = '#3b82f6',
  color2 = '#0ea5e9',
  data = [30, 50, 75, 45, 90], // Default heights
  x = 540,
  y = 960,
  delay = 0,
  width = 800,
  height = 500,
  color,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig();

  // Gap between bars
  const gap = 20;
  // Calculate width per bar based on total width and gap
  const barWidth = (width - gap * (data.length - 1)) / data.length;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${width}px`,
        height: `${height}px`,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        zIndex: 10,
        // Optional subtle background lines for the chart grid
        backgroundSize: '100% 20%',
        backgroundImage: 'linear-gradient(to top, rgba(255,255,255,0.05) 1px, transparent 1px)',
      }}
    >
      {data.map((value, i) => {
        // Stagger the animation: each bar starts 5 frames after the previous
        const progress = spring({
          frame: adjustedFrame - i * 5,
          fps,
          config: {
            damping: 14,
            stiffness: 90,
          },
        });

        // The height is calculated dynamically
        const currentHeight = progress * (value / 100) * height;

        return (
          <div
            key={i}
            style={{
              width: `${barWidth}px`,
              height: `${Math.max(currentHeight, 0)}px`,
              // Gradient for the bar
              background: `linear-gradient(to top, ${color || color1}, ${color2})`,
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          />
        );
      })}
    </div>
  );
};
