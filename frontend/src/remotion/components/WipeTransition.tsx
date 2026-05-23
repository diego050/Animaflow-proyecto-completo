import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface WipeTransitionProps extends UniversalProps {
  durationFrames?: number;
  triggerFrame?: number;
}

export const WipeTransition: React.FC<WipeTransitionProps> = ({
  color = '#0f172a', // Slate 900
  durationFrames = 15,
  triggerFrame = 135,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Only render during the transition window
  if (frame < triggerFrame) return null;

  const progress = interpolate(
    frame,
    [triggerFrame, triggerFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.ease) }
  );

  // We want a giant rectangle rotated 45 degrees to sweep across the screen.
  // The hypotenuse of the screen is roughly Math.sqrt(w^2 + h^2)
  const diag = Math.sqrt(width * width + height * height);
  // To sweep fully, we move from -diag to diag
  const translateX = interpolate(progress, [0, 1], [-diag, diag * 1.5]);

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
        overflow: 'hidden', // Ensure it doesn't bleed out of bounds
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${diag * 2}px`, // Extremely wide to cover corners when rotated
          height: `${diag * 2}px`, // Extremely tall
          backgroundColor: color,
          transform: `translate(-50%, -50%) rotate(45deg) translateX(${translateX}px)`,
        }}
      />
    </div>
  );
};
