import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

export interface GridPerspectiveProps extends UniversalProps {
  color1?: string; // Color of the grid lines (e.g. #ff00ff)
  color2?: string; // Background color (e.g. #000000)
  speed?: number;  // Speed of forward movement
}

export const GridPerspective: React.FC<GridPerspectiveProps> = ({
  color1 = '#38bdf8',
  color2 = '#0f172a',
  speed = 4,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { width, height } = useVideoConfig();

  // We want the grid to move forward continuously and loop smoothly.
  // The grid size is 100px. So we take adjustedFrame * speed modulo 100 to loop.
  const offset = (adjustedFrame * speed) % 100;

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: color2,
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* 
        This is the actual grid layer. 
        We make it larger than the screen so that when rotated in 3D, it still covers the bottom corners.
      */}
      <div
        style={{
          position: 'absolute',
          bottom: '-50%',
          left: '-50%',
          width: '200%',
          height: '150%',
          backgroundImage: `
            linear-gradient(to right, ${color1} 2px, transparent 2px),
            linear-gradient(to bottom, ${color1} 2px, transparent 2px)
          `,
          backgroundSize: '100px 100px',
          backgroundPosition: `0px ${offset}px`,
          transformOrigin: 'top center',
          transform: 'perspective(600px) rotateX(60deg)',
          // Add a fade out towards the horizon (top)
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 50%)',
        }}
      />
    </div>
  );
};
