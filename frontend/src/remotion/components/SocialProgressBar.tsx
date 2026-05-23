import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

export const SocialProgressBar: React.FC<{
  heightPx?: number;
} & UniversalProps> = ({
  color = 'rgba(255, 255, 255, 0.8)',
  heightPx = 4,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { width, durationInFrames } = useVideoConfig();

  // Progress from 0 to 1 over the whole video. Note: ProgressBar usually spans whole video so adjustedFrame might just act as a late start.
  const progress = interpolate(adjustedFrame, [0, durationInFrames - delay], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px', // slightly above bottom edge
        left: 0,
        width: `${width}px`,
        height: `${heightPx}px`,
        backgroundColor: 'rgba(255,255,255,0.2)', // Track color
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: color,
          transformOrigin: 'left center',
          transform: `scaleX(${progress})`,
        }}
      />
    </div>
  );
};
