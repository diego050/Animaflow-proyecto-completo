import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface StrikethroughTextProps extends UniversalProps {
  text?: string;
  strikeColor?: string;
  strikeWidth?: number;
}

export const StrikethroughText: React.FC<StrikethroughTextProps> = ({
  text = 'Strikethrough',
  color = '#ffffff',
  strikeColor = '#ef4444', // Red 500
  strikeWidth = 8,
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
  
  // La línea de tachado aparece 15 frames después
  const strikeProgress = spring({ 
    frame: Math.max(0, adjustedFrame - 15), 
    fps, 
    config: { damping: 12, mass: 0.8, stiffness: 120 } 
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
      
      {/* Línea de Tachado */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '-2%',
          width: `${strikeProgress * 104}%`,
          height: `${strikeWidth}px`,
          backgroundColor: strikeColor,
          transform: 'translateY(-50%) rotate(-2deg)',
          borderRadius: '4px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
};
