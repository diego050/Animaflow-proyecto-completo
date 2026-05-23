import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

export interface BrowserWindowProps extends UniversalProps {
  text: string;
  width?: number;
  height?: number;
}

export const BrowserWindow: React.FC<BrowserWindowProps> = ({
  text,
  width = 800,
  height = 500,
  x = 540,
  y = 960,
  textColor = '#1e293b',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig();

  // Animation: scale up with bounce
  const scale = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
    },
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          height: '40px',
          backgroundColor: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981' }} />
        </div>
      </div>
      
      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <span
          style={{
            fontSize: '60px',
            fontWeight: 800,
            color: textColor,
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
