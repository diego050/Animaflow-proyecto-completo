import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface SplitTextProps extends UniversalProps {
  topText?: string;
  bottomText?: string;
  revealedText?: string;
  revealedColor?: string;
}

export const SplitText: React.FC<SplitTextProps> = ({
  topText = 'SECRET',
  bottomText = 'MESSAGE',
  revealedText = 'UNLOCKED',
  color = '#ffffff',
  revealedColor = '#10b981', // Emerald 500
  fontSize = 100,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // 1. Entrance of outer text
  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  // 2. Splitting action starts at frame 30 (after entrance)
  const splitProgress = spring({ 
    frame: Math.max(0, adjustedFrame - 30), 
    fps, 
    config: { damping: 16, mass: 1, stiffness: 60 } 
  });

  // Calculate split distance
  const splitDistance = splitProgress * (fontSize * 1.5);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) scale(${entrance})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        fontWeight: '900',
        zIndex: 40,
      }}
    >
      {/* Revealed Inner Text */}
      <div
        style={{
          position: 'absolute',
          color: revealedColor,
          fontSize: `${fontSize * 0.7}px`,
          opacity: splitProgress,
          transform: `scale(${interpolate(splitProgress, [0, 1], [0.8, 1])})`,
          whiteSpace: 'nowrap',
          zIndex: 1,
        }}
      >
        {revealedText}
      </div>

      {/* Top Half */}
      <div
        style={{
          color: color,
          fontSize: `${fontSize}px`,
          transform: `translateY(-${splitDistance / 2}px)`,
          lineHeight: '1',
          zIndex: 2,
          whiteSpace: 'nowrap',
        }}
      >
        {topText}
      </div>

      {/* Bottom Half */}
      <div
        style={{
          color: color,
          fontSize: `${fontSize}px`,
          transform: `translateY(${splitDistance / 2}px)`,
          lineHeight: '1',
          zIndex: 2,
          whiteSpace: 'nowrap',
        }}
      >
        {bottomText}
      </div>
    </div>
  );
};
