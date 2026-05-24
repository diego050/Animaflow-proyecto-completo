import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface RippleEffectProps extends UniversalProps {
  maxRadius?: number;
  count?: number;
  speed?: number;
}

export const RippleEffect: React.FC<RippleEffectProps> = ({
  maxRadius = 300,
  count = 3,
  speed = 1.0,
  color = '#3b82f6',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig(); // eslint-disable-line @typescript-eslint/no-unused-vars

  // If we haven't reached the delay, return null to save performance
  if (adjustedFrame === 0) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
      {Array.from({ length: count }).map((_, i) => {
        // Stagger each ring
        const ringDelay = i * 20;
        const ringFrame = Math.max(0, adjustedFrame - ringDelay);
        
        // Use modulo to make rings pulse continuously
        // Speed determines how fast they grow. 60 frames = 1 cycle at 1.0 speed
        const cycleLength = 90 / speed;
        const progress = (ringFrame % cycleLength) / cycleLength;
        
        // Size grows from 0 to maxRadius
        const size = interpolate(progress, [0, 1], [0, maxRadius * 2]);
        
        // Opacity fades out as it grows
        const opacity = interpolate(progress, [0, 0.2, 1], [0, 0.8, 0]);

        if (ringFrame === 0) return null;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              border: `4px solid ${color}`,
              transform: 'translate(-50%, -50%)',
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};
