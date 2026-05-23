import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface GlitchTransitionProps extends UniversalProps {
  intensity?: number;
}

export const GlitchTransition: React.FC<GlitchTransitionProps> = ({
  durationFrames = 10,
  triggerFrame = 140,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Only render during the transition window
  if (frame < triggerFrame || frame > triggerFrame + durationFrames) return null;

  // Pseudo-random logic based on frame number
  const isGlitchA = frame % 3 === 0;
  const isGlitchB = frame % 2 === 0;

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
        // Invert colors and hue rotate for classic glitch colors
        backdropFilter: isGlitchA ? 'invert(1) hue-rotate(90deg)' : 'hue-rotate(-90deg) contrast(2)',
      }}
    >
      {/* Glitch block 1 */}
      {isGlitchA && (
        <div
          style={{
            position: 'absolute',
            top: `${(frame * 13) % height}px`,
            left: 0,
            width: '100%',
            height: '150px',
            backgroundColor: 'rgba(255, 0, 0, 0.3)',
            transform: 'translateX(20px)',
            mixBlendMode: 'difference',
          }}
        />
      )}
      
      {/* Glitch block 2 */}
      {isGlitchB && (
        <div
          style={{
            position: 'absolute',
            top: `${(frame * 7) % height}px`,
            left: 0,
            width: '100%',
            height: '80px',
            backgroundColor: 'rgba(0, 255, 255, 0.3)',
            transform: 'translateX(-30px)',
            mixBlendMode: 'difference',
          }}
        />
      )}
    </div>
  );
};
