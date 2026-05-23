import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface GradientOverlayProps extends UniversalProps {
  color1?: string;
  color2?: string;
  angle?: number;
  opacity?: number;
}

export const GradientOverlay: React.FC<GradientOverlayProps> = ({
  color1 = '#000000',
  color2 = 'transparent',
  angle = 180,
  opacity = 0.8,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Fade in
  const currentOpacity = interpolate(adjustedFrame, [0, 15], [0, opacity], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        background: `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`,
        opacity: currentOpacity,
        zIndex: 5, // Above background, below text
        pointerEvents: 'none',
      }}
    />
  );
};
