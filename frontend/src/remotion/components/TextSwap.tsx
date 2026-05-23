import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface TextSwapProps extends UniversalProps {
  initialText?: string;
  finalText?: string;
  initialColor?: string;
  finalColor?: string;
}

export const TextSwap: React.FC<TextSwapProps> = ({
  initialText = 'BEFORE',
  finalText = 'AFTER',
  initialColor = '#ef4444', // Red 500
  finalColor = '#10b981', // Emerald 500
  fontSize = 80,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // 1. Entrance of initial text
  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  // 2. Swap action starts at frame 30
  const swapProgress = spring({ 
    frame: Math.max(0, adjustedFrame - 30), 
    fps, 
    config: { damping: 16, mass: 1, stiffness: 80 } 
  });

  // Calculate translations for the swap effect (like a slot machine)
  const yOffset = fontSize * 1.5;
  
  // Initial text slides up and fades out
  const initialY = -swapProgress * yOffset;
  const initialOpacity = 1 - swapProgress;
  
  // Final text slides up from below and fades in
  const finalY = (1 - swapProgress) * yOffset;
  const finalOpacity = swapProgress;

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
        height: `${fontSize * 1.5}px`,
        overflow: 'hidden', // Hide the text when it slides out of bounds
        width: '100%',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Initial Text */}
        <div
          style={{
            position: 'absolute',
            color: initialColor,
            fontSize: `${fontSize}px`,
            opacity: initialOpacity,
            transform: `translateY(${initialY}px)`,
            whiteSpace: 'nowrap',
          }}
        >
          {initialText}
        </div>

        {/* Final Text */}
        <div
          style={{
            position: 'absolute',
            color: finalColor,
            fontSize: `${fontSize}px`,
            opacity: finalOpacity,
            transform: `translateY(${finalY}px)`,
            whiteSpace: 'nowrap',
          }}
        >
          {finalText}
        </div>
      </div>
    </div>
  );
};
