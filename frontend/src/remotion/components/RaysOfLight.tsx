import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

export interface RaysOfLightProps extends UniversalProps {
  color1?: string; // Ray color (e.g., #ffffff)
  color2?: string; // Background color (e.g., #000000)
  numRays?: number; // Number of light rays
}

export const RaysOfLight: React.FC<RaysOfLightProps> = ({
  color1 = '#ffffff',
  color2 = '#0f172a',
  numRays = 12,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { width, height } = useVideoConfig();

  // Slow rotation
  const rotation = adjustedFrame * 0.5;

  // Generate the rays as polygon shapes
  const rays = Array.from({ length: numRays }).map((_, i) => {
    const angle = (360 / numRays) * i;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '150vw', // Extra long to cover corners
          height: '10vh', // Thickness of the ray
          backgroundColor: color1,
          transformOrigin: '0 50%', // Rotate from left edge (which is placed at center)
          transform: `translateY(-50%) rotate(${angle}deg)`,
          opacity: 0.1, // Subtle
          // Add a blur filter or linear gradient to make them look like soft light
          background: `linear-gradient(90deg, ${color1} 0%, transparent 100%)`,
        }}
      />
    );
  });

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
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          // Mask to fade out the rays from the center outwards
          WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
          maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
        }}
      >
        {rays}
      </div>
    </div>
  );
};
