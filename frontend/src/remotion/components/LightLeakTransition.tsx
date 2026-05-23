import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface LightLeakTransitionProps extends UniversalProps {
  durationFrames?: number;
  triggerFrame?: number;
  colorPrimary?: string;
  colorSecondary?: string;
  intensity?: number;
}

export const LightLeakTransition: React.FC<LightLeakTransitionProps> = ({
  durationFrames = 20,
  triggerFrame = 130, // 20 frames before the end of a 150f scene
  colorPrimary = 'rgba(255, 120, 0, 0.7)',
  colorSecondary = 'rgba(255, 50, 0, 0.5)',
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Only render during the transition window
  if (frame < triggerFrame || frame > triggerFrame + durationFrames) return null;

  const progress = interpolate(
    frame,
    [triggerFrame, triggerFrame + durationFrames / 2, triggerFrame + durationFrames],
    [0, 1, 0], // fades in then out
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const posX1 = interpolate(frame, [triggerFrame, triggerFrame + durationFrames], [-width, width * 1.5]);
  const posX2 = interpolate(frame, [triggerFrame, triggerFrame + durationFrames], [width * 1.5, -width]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 999,
        pointerEvents: 'none',
        mixBlendMode: 'screen', // Additive blending
        opacity: progress,
      }}
    >
      {/* Light Leak 1 */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: `${posX1}px`,
          width: '800px',
          height: '1200px',
          backgroundColor: colorPrimary,
          borderRadius: '50%',
          filter: 'blur(150px)',
          transform: 'skew(-20deg)',
        }}
      />
      
      {/* Light Leak 2 */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: `${posX2}px`,
          width: '1000px',
          height: '800px',
          backgroundColor: colorSecondary,
          borderRadius: '50%',
          filter: 'blur(200px)',
          transform: 'skew(30deg)',
        }}
      />
    </div>
  );
};
