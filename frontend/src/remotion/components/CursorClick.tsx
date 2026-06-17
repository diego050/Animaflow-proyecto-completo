import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

export const CursorClick: React.FC<{
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  cursorColor?: string;
  rippleColor?: string;
  cursorSize?: number;
  clickFrame?: number;
  moveDuration?: number;
} & UniversalProps> = ({
  startX = 800,
  startY = 1500,
  endX = 540,
  endY = 960,
  delay = 0,
  color,
  cursorColor,
  rippleColor,
  cursorSize = 48,
  clickFrame = 35,
  moveDuration = 30,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig();

  // Colores: props específicas con fallback a `color` y al default original.
  const fillColor = cursorColor || color || '#1e293b';
  const ripColor = rippleColor || color || 'rgba(56, 189, 248, 0.4)';

  // Animate position with an ease-out (smooth finish)
  const progress = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 80,
    },
    durationInFrames: moveDuration,
  });

  const x = interpolate(progress, [0, 1], [startX, endX]);
  const y = interpolate(progress, [0, 1], [startY, endY]);

  // Click happens at `clickFrame`
  const isClicking = adjustedFrame >= clickFrame && adjustedFrame <= clickFrame + 5;
  const cursorScale = isClicking ? 0.8 : 1; // It shrinks slightly when clicking

  // Ripple effect
  const rippleFrame = adjustedFrame - clickFrame;
  const showRipple = rippleFrame >= 0 && rippleFrame < 15;
  const rippleScale = showRipple ? interpolate(rippleFrame, [0, 15], [0, 3]) : 0;
  const rippleOpacity = showRipple ? interpolate(rippleFrame, [0, 15], [0.8, 0]) : 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 999, // Always on top
      }}
    >
      {/* Ripple */}
      {showRipple && (
        <div
          style={{
            position: 'absolute',
            left: endX,
            top: endY,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: ripColor,
            transform: `translate(-50%, -50%) scale(${rippleScale})`,
            opacity: rippleOpacity,
          }}
        />
      )}

      {/* Cursor */}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `scale(${cursorScale})`,
          // Offset the anchor point slightly so the tip points exactly to the coord
          marginLeft: '-4px',
          marginTop: '-4px',
        }}
      >
        <svg
          width={cursorSize}
          height={cursorSize}
          viewBox="0 0 24 24"
          fill={fillColor}
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>
      </div>
    </div>
  );
};
