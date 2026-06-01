import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface CursorPoint {
  x: number;
  y: number;
  click?: boolean;
  holdFrames?: number;
}

interface StyleCursorProps extends UniversalProps {
  points?: CursorPoint[];
  speed?: number;
  showRipple?: boolean;
  style?: Record<string, unknown>;
}

export const StyleCursor: React.FC<StyleCursorProps> = ({
  x = 0,
  y = 0,
  points = [
    { x: 400, y: 500, click: true, holdFrames: 15 },
    { x: 600, y: 700, click: true, holdFrames: 15 },
    { x: 540, y: 960, click: false },
  ],
  speed = 1,
  showRipple = true,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // Calculate total duration
  let totalFrames = 0;
  const pointFrames: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = Math.abs(points[i + 1].x - points[i].x);
    const dy = Math.abs(points[i + 1].y - points[i].y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const moveFrames = Math.ceil(distance / (2 * speed));
    pointFrames.push(moveFrames);
    totalFrames += moveFrames + (points[i].holdFrames || 0);
  }

  // Find current position
  let elapsed = 0;
  let currentPoint = points[0];
  let nextPoint = points[1] || points[0];
  let progress = 0;
  let isClicking = false;

  for (let i = 0; i < pointFrames.length; i++) {
    const moveFrames = pointFrames[i];
    const holdFrames = points[i].holdFrames || 0;

    if (adjustedFrame < elapsed + moveFrames) {
      currentPoint = points[i];
      nextPoint = points[i + 1] || points[i];
      progress = (adjustedFrame - elapsed) / moveFrames;
      break;
    }
    elapsed += moveFrames;

    if (adjustedFrame < elapsed + holdFrames) {
      currentPoint = points[i];
      nextPoint = points[i];
      progress = 1;
      isClicking = points[i].click || false;
      break;
    }
    elapsed += holdFrames;
  }

  const cursorX = currentPoint.x + (nextPoint.x - currentPoint.x) * progress;
  const cursorY = currentPoint.y + (nextPoint.y - currentPoint.y) * progress;

  const clickScale = isClicking ? interpolate(adjustedFrame - elapsed, [0, 5, 10], [1, 0.7, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  }) : 1;

  const rippleScale = isClicking ? interpolate(adjustedFrame - elapsed, [0, 15], [0.5, 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) : 0;

  const rippleOpacity = isClicking ? interpolate(adjustedFrame - elapsed, [0, 15], [0.5, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) : 0;

  const customColor = style?.color ?? '#FFFFFF';
  const customSize = style?.width ?? 24;
  const customOpacity = style?.opacity ?? 0.9;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${cursorX}px, ${cursorY}px)`,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      {/* Ripple effect */}
      {showRipple && rippleOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -customSize / 2,
            left: -customSize / 2,
            width: customSize,
            height: customSize,
            borderRadius: '50%',
            border: `2px solid ${customColor}`,
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
          }}
        />
      )}

      {/* Cursor SVG */}
      <svg
        width={customSize}
        height={customSize}
        viewBox="0 0 24 24"
        style={{
          transform: `translate(-50%, -50%) scale(${clickScale})`,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          opacity: customOpacity,
        }}
      >
        <path d="M5 3l14 8-6 2-3 6z" fill={customColor} stroke="#0F172A" strokeWidth="1" />
      </svg>
    </div>
  );
};
