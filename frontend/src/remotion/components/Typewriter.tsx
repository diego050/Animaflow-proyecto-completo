import React from 'react';
import { useCurrentFrame } from 'remotion';
import { UniversalProps } from './types';

export interface TypewriterProps extends UniversalProps {
  text: string;
  width?: number;
  speed?: number; // frames per character
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  color = '#ffffff',
  x = 540,
  y = 960,
  fontSize = 60,
  width = 900,
  speed = 2,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

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
        width: `${width}px`,
        textAlign: 'center',
        zIndex: 10,
      }}
    >
      <div 
        style={{ 
          color,
          fontSize,
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
