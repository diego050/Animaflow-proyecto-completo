import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

export const SearchEngineTyping: React.FC<{
  text: string;
  width?: number;
} & UniversalProps> = ({
  text,
  width,
  x = 540,
  y = 960,
  delay = 0,
  color,
  bgColor,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const charsToShow = Math.floor(adjustedFrame / 2);
  const displayedText = text.substring(0, charsToShow);
  const isFinished = charsToShow >= text.length;

  const rippleFrame = adjustedFrame - text.length * 2 - 10;
  const showRipple = rippleFrame > 0 && rippleFrame < 15;
  const rippleScale = showRipple ? 1 + rippleFrame * 0.02 : 1;
  const rippleOpacity = showRipple ? 1 - rippleFrame / 15 : 0;

  // Relativo al lienzo (antes px: width 900, height 100, fontSize 40, svg 40).
  const w = width ?? c.vw(86);
  const barH = c.vmin(13);

  return (
    <div
      style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', zIndex: 10 }}
    >
      {/* Ripple ring */}
      {isFinished && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${w}px`,
            height: `${barH}px`,
            borderRadius: '999px',
            border: `${c.vmin(0.6)}px solid ${color || '#38bdf8'}`,
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main Search Bar */}
      <div
        style={{
          width: `${w}px`,
          minHeight: `${barH}px`,
          height: 'auto',
          backgroundColor: bgColor || '#ffffff',
          borderRadius: '999px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          padding: `${c.vmin(2.6)}px ${c.vmin(5)}px`,
        }}
      >
        {/* Search Icon */}
        <svg style={{ flexShrink: 0 }} width={c.vmin(6)} height={c.vmin(6)} viewBox="0 0 24 24" fill="none" stroke={color || "#94a3b8"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>

        {/* Text */}
        <div
          style={{
            marginLeft: `${c.vmin(4)}px`,
            fontSize: `${c.vmin(5)}px`,
            color: textColor || '#1e293b',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 500,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            lineHeight: 1.2,
          }}
        >
          {displayedText}
          <span style={{ opacity: Math.floor(adjustedFrame / 15) % 2 === 0 ? 1 : 0, color: textColor || '#000' }}>|</span>
        </div>
      </div>
    </div>
  );
};
