import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { UniversalProps } from './types';

export interface KineticBackgroundProps extends UniversalProps {
  color1?: string;
  color2?: string;
  theme?: string;
}

export const KineticBackground: React.FC<KineticBackgroundProps> = ({ 
  color1 = '#0f172a', 
  color2 = '#312e81', 
  theme = 'default',
  delay = 0 
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { durationInFrames } = useVideoConfig();

  // Create a slow shifting animation for the gradient
  const shift = interpolate(adjustedFrame, [0, durationInFrames], [0, 100]);

  // Optionally override colors based on theme
  let c1 = color1;
  let c2 = color2;

  if (theme === 'neon') {
    c1 = '#ff00ff';
    c2 = '#00ffff';
  } else if (theme === 'dark_glow') {
    c1 = '#000000';
    c2 = color1;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `linear-gradient(${135 + shift}deg, ${c1} 0%, ${c2} 100%)`,
        zIndex: 0,
      }}
    />
  );
};
