import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface UnderlineRevealProps extends UniversalProps {
  text?: string;
  underlineColor?: string;
  underlineWidth?: number;
}

export const UnderlineReveal: React.FC<UnderlineRevealProps> = ({
  text = 'Underline',
  color = '#ffffff',
  underlineColor = '#3b82f6', // Blue 500
  underlineWidth = 6,
  fontSize = 80,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // El texto aparece primero
  const textScale = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  // La línea de subrayado aparece 15 frames después
  const underlineProgress = spring({ 
    frame: Math.max(0, adjustedFrame - 15), 
    fps, 
    config: { damping: 14, mass: 0.5, stiffness: 100 } 
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) scale(${textScale})`,
        display: 'inline-block',
        color: color,
        fontSize: `${fontSize}px`,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        zIndex: 40,
      }}
    >
      {text}
      
      {/* Línea de Subrayado */}
      <div
        style={{
          position: 'absolute',
          bottom: '-5%',
          left: '0',
          width: `${underlineProgress * 100}%`,
          height: `${underlineWidth}px`,
          backgroundColor: underlineColor,
          borderRadius: '4px',
        }}
      />
    </div>
  );
};
