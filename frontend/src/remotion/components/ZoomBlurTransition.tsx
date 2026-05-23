import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { UniversalProps } from './types';

interface ZoomBlurTransitionProps extends UniversalProps {
  durationFrames?: number;
  triggerFrame?: number;
}

export const ZoomBlurTransition: React.FC<ZoomBlurTransitionProps> = ({
  durationFrames = 15, // fast! half a second
  triggerFrame = 135, // default assumes a 150 frame scene
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Calculate progress only during the transition window
  const progress = interpolate(
    frame,
    [triggerFrame, triggerFrame + durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // If we haven't reached the trigger, render nothing to save performance
  if (progress === 0) return null;

  // Zoom scale (1 to 3)
  const scale = interpolate(progress, [0, 1], [1, 3], {
    easing: Easing.in(Easing.exp),
  });

  // Blur amount
  const blur = interpolate(progress, [0, 1], [0, 30], {
    easing: Easing.in(Easing.exp),
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 999, // Always on top
        backdropFilter: `blur(${blur}px) brightness(${1 + progress})`,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        pointerEvents: 'none',
      }}
    />
  );
};
