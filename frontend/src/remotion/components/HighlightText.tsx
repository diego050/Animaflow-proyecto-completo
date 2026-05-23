import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { UniversalProps } from './types';

export interface HighlightTextProps extends UniversalProps {
  text: string;
  highlightColor?: string;
  width?: number;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  color = '#ffffff',
  highlightColor = '#eab308', // Yellow-500
  x = 540,
  y = 960,
  fontSize = 80,
  width = 900,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig();

  // Animation for the highlight sweeping left to right
  const progress = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 14,
      mass: 0.5,
      stiffness: 80,
    },
  });

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
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Highlight Background */}
        <div
          style={{
            position: 'absolute',
            bottom: '5%',
            left: '-2%',
            height: '40%',
            width: `${progress * 104}%`,
            backgroundColor: highlightColor,
            zIndex: 1,
            borderRadius: '4px',
            transform: 'rotate(-2deg)',
          }}
        />
        
        {/* Main Text */}
        <span
          style={{
            color,
            fontSize,
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative',
            zIndex: 2,
            padding: '0 10px',
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
