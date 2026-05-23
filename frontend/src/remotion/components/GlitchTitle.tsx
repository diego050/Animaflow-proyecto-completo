import React from 'react';
import { useCurrentFrame, useVideoConfig, random, interpolate } from 'remotion';
import { UniversalProps } from './types';

export interface GlitchTitleProps extends UniversalProps {
  text: string;
  width?: number;
}

export const GlitchTitle: React.FC<GlitchTitleProps> = ({
  text,
  color = '#ffffff',
  x = 540,
  y = 960,
  fontSize = 80,
  width = 900,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig();

  // Create a jittery random value based on the frame
  const r1 = random(`glitch1-${adjustedFrame}`);
  const r2 = random(`glitch2-${adjustedFrame}`);
  
  // Decide if we should glitch this frame (e.g., 20% probability)
  const isGlitching = r1 > 0.8 && adjustedFrame > 0;
  
  const offset1 = isGlitching ? interpolate(r2, [0, 1], [-10, 10]) : 0;
  const offset2 = isGlitching ? interpolate(random(`glitch3-${adjustedFrame}`), [0, 1], [-10, 10]) : 0;
  
  // For slice glitch
  const clipPath1 = isGlitching ? `inset(${interpolate(r1, [0.8, 1], [0, 80])}% 0 ${interpolate(r2, [0, 1], [0, 20])}% 0)` : 'none';
  const clipPath2 = isGlitching ? `inset(${interpolate(r2, [0, 1], [0, 40])}% 0 ${interpolate(r1, [0.8, 1], [0, 60])}% 0)` : 'none';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${width}px`,
        textAlign: 'center',
        zIndex: 10,
      }}
    >
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Main Text */}
        <span
          style={{
            color,
            fontSize,
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {text}
        </span>

        {/* Red Channel Glitch */}
        <span
          style={{
            color: '#ff0000',
            fontSize,
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'absolute',
            top: 0,
            left: `${offset1}px`,
            opacity: isGlitching ? 0.8 : 0,
            clipPath: clipPath1,
            zIndex: 1,
            mixBlendMode: 'screen',
          }}
        >
          {text}
        </span>

        {/* Cyan Channel Glitch */}
        <span
          style={{
            color: '#00ffff',
            fontSize,
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'absolute',
            top: 0,
            left: `${offset2}px`,
            opacity: isGlitching ? 0.8 : 0,
            clipPath: clipPath2,
            zIndex: 1,
            mixBlendMode: 'screen',
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
