import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fitText } from '../utils/fitText';
import type { UniversalProps } from "./types";

export interface TypewriterProps extends UniversalProps {
  text: string;
  width?: number;
  speed?: number;
  durationInFrames?: number;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  color = '#ffffff',
  x = 540,
  y = 960,
  fontSize = 60,
  width,
  speed: speedProp,
  delay = 0,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width: canvasWidth, height: canvasHeight } = useVideoConfig();

  const effectiveWidth = width || Math.min(900, Math.floor(canvasWidth * 0.85));

  const fitted = fitText(text, effectiveWidth, Math.floor(canvasHeight * 0.6), {
    minFontSize: 48,
    maxFontSize: fontSize || 60,
    fontWeight: 900,
    lineHeight: 1.3,
    padding: 20,
  });
  const actualFontSize = fitted.fontSize;

  const adjustedFrame = Math.max(0, frame - delay);

  const totalChars = text.length;
  const reservedFrames = 30;
  const availableFrames = (durationInFrames || 0) - reservedFrames - Math.round(delay * 30);
  const dynamicSpeed = availableFrames > 0 && totalChars > 0
    ? Math.max(1, Math.floor(availableFrames / totalChars))
    : (speedProp ?? 2);

  const speed = speedProp ?? dynamicSpeed;
  const charsToShow = Math.floor(adjustedFrame / speed);
  const displayedText = text.substring(0, charsToShow);
  const cursorBlink = Math.floor(adjustedFrame / 15) % 2 === 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${effectiveWidth}px`,
        textAlign: 'left',
        zIndex: 10,
      }}
    >
      <div
        style={{
          color,
          fontSize: actualFontSize,
          fontWeight: 900,
          fontFamily: 'Inter, system-ui, sans-serif',
          lineHeight: 1.3,
          wordBreak: 'break-word',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
        }}
      >
        {displayedText}
        <span style={{ opacity: cursorBlink ? 1 : 0, marginLeft: 2 }}>|</span>
      </div>
    </div>
  );
};
