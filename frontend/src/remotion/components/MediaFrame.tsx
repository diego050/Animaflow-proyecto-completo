import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface MediaFrameProps extends UniversalProps {
  url?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  dropShadow?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill';
}

export const MediaFrame: React.FC<MediaFrameProps> = ({
  url = '',
  borderRadius = 20,
  borderWidth = 0,
  borderColor = '#ffffff',
  dropShadow = true,
  objectFit = 'cover',
  x = 540,
  y = 540,
  width = 600,
  height = 400,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Simple scale entrance
  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        borderRadius: `${borderRadius}px`,
        border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
        boxShadow: dropShadow ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none',
        overflow: 'hidden',
        backgroundColor: '#f1f5f9', // Placeholder background
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 'bold',
        fontSize: '24px',
        zIndex: 40,
      }}
    >
      {url ? (
        <img
          src={url}
          alt="Media"
          style={{ width: '100%', height: '100%', objectFit }}
        />
      ) : (
        <div>[Media Placeholder]</div>
      )}
    </div>
  );
};
