import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fitText } from '../utils/fitText';
import type { UniversalProps } from "./types";

export interface TypewriterProps extends UniversalProps {
  text: string;
  width?: number;
  speed?: number; // frames per character
  durationInFrames?: number;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  color = '#ffffff',
  x = 540,
  y = 960,
  fontSize = 60,
  width,  // Remove hardcoded default — calculate from canvas
  speed: speedProp,
  delay = 0,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width: canvasWidth, height: canvasHeight } = useVideoConfig();

  // Calculate effective container width from canvas if not explicitly provided
  const effectiveWidth = width || Math.min(900, Math.floor(canvasWidth * 0.85));

  // Auto-scale fontSize to fit text within container
  const fitted = fitText(text, effectiveWidth, Math.floor(canvasHeight * 0.6), {
    minFontSize: 28,
    maxFontSize: fontSize || 60,
    fontWeight: 900,
    lineHeight: 1.3,
    padding: 20,
  });
  const actualFontSize = fitted.fontSize;

  const adjustedFrame = Math.max(0, frame - delay);

  // Calculate dynamic speed if durationInFrames is available
  const totalChars = text.length;
  const reservedFrames = 30; // reserve 1s for cursor blink at end
  const availableFrames = (durationInFrames || 0) - reservedFrames - Math.round(delay * 30);
  const dynamicSpeed = availableFrames > 0 && totalChars > 0 
    ? Math.max(1, Math.floor(availableFrames / totalChars))
    : (speedProp ?? 2);
  
  const speed = speedProp ?? dynamicSpeed;

  // Number of characters to show based on current frame
  const charsToShow = Math.floor(adjustedFrame / speed);
  const displayedText = text.substring(0, charsToShow);
  
  // Blinking cursor
  const cursorBlink = Math.floor(adjustedFrame / 15) % 2 === 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${effectiveWidth}px`,
        textAlign: 'center',
        zIndex: 10,
      }}
    >
      <div 
        style={{ 
          color,
          fontSize: actualFontSize,
          fontWeight: 900,
          fontFamily: 'monospace, system-ui, sans-serif',
          display: 'inline-block',
          textAlign: 'left',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)'
        }}
      >
        {displayedText}
        <span style={{ opacity: cursorBlink ? 1 : 0 }}>|</span>
      </div>
    </div>
  );
};
