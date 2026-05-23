import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface MaskedRevealProps extends UniversalProps {
  direction?: 'up' | 'down' | 'left' | 'right';
  content?: string;
}

export const MaskedReveal: React.FC<MaskedRevealProps> = ({
  direction = 'up',
  content = 'Revealed Text',
  color = '#ffffff',
  bgColor = 'transparent',
  fontSize = 60,
  x = 540,
  y = 540,
  width = 800,
  height = 150,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance spring
  const progress = spring({ frame: adjustedFrame, fps, config: { damping: 16 } });

  // Translation based on direction
  let translateX = 0;
  let translateY = 0;

  const distance = Math.max(width || 800, height || 150);

  if (direction === 'up') translateY = (1 - progress) * distance;
  if (direction === 'down') translateY = -(1 - progress) * distance;
  if (direction === 'left') translateX = (1 - progress) * distance;
  if (direction === 'right') translateX = -(1 - progress) * distance;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: 'translate(-50%, -50%)',
        overflow: 'hidden', // The magic of the mask
        backgroundColor: bgColor,
        zIndex: 45,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${translateX}px, ${translateY}px)`,
          color: color,
          fontSize: `${fontSize}px`,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'pre-wrap',
          textAlign: 'center',
        }}
      >
        {content}
      </div>
    </div>
  );
};
