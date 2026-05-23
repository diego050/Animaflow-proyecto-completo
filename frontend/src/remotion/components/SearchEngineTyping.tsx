import React from 'react';
import { useCurrentFrame } from 'remotion';
import { UniversalProps } from './types';

export const SearchEngineTyping: React.FC<{
  text: string;
  width?: number;
} & UniversalProps> = ({
  text,
  width = 900,
  x = 540,
  y = 960,
  delay = 0,
  color,
  bgColor,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const charsToShow = Math.floor(adjustedFrame / 2);
  const displayedText = text.substring(0, charsToShow);
  const isFinished = charsToShow >= text.length;

  // Ripple effect starts after typing is finished (at frame text.length * 2)
  const rippleFrame = adjustedFrame - (text.length * 2) - 10;
  const showRipple = rippleFrame > 0 && rippleFrame < 15;
  const rippleScale = showRipple ? 1 + (rippleFrame * 0.02) : 1;
  const rippleOpacity = showRipple ? 1 - (rippleFrame / 15) : 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
    >
      {/* Ripple ring */}
      {isFinished && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${width}px`,
            height: '100px',
            borderRadius: '50px',
            border: `4px solid ${color || '#38bdf8'}`,
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main Search Bar */}
      <div
        style={{
          width: `${width}px`,
          height: '100px',
          backgroundColor: bgColor || '#ffffff',
          borderRadius: '50px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
        }}
      >
        {/* Search Icon */}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color || "#94a3b8"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>

        {/* Text */}
        <div
          style={{
            marginLeft: '30px',
            fontSize: '45px',
            color: textColor || '#1e293b',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 500,
          }}
        >
          {displayedText}
          <span style={{ opacity: Math.floor(adjustedFrame / 15) % 2 === 0 ? 1 : 0, color: textColor || '#000' }}>|</span>
        </div>
      </div>
    </div>
  );
};
