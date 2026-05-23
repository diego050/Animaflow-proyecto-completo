import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface AnimatedLineProps extends UniversalProps {
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  strokeWidth?: number;
  dashStyle?: 'solid' | 'dashed' | 'dotted';
  arrowHead?: boolean;
}

export const AnimatedLine: React.FC<AnimatedLineProps> = ({
  startX = 100,
  startY = 100,
  endX = 900,
  endY = 900,
  strokeWidth = 8,
  dashStyle = 'solid',
  arrowHead = false,
  color = '#3b82f6',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Calculate length
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Draw animation
  const drawProgress = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  let strokeDasharray = `${length}`;
  if (dashStyle === 'dashed') strokeDasharray = `${strokeWidth * 3}, ${strokeWidth * 3}`;
  if (dashStyle === 'dotted') strokeDasharray = `1, ${strokeWidth * 2}`;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 20, pointerEvents: 'none' }}>
      <svg width={width} height={height}>
        {arrowHead && (
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={color} />
            </marker>
          </defs>
        )}
        <line
          x1={startX}
          y1={startY}
          x2={startX + dx * drawProgress}
          y2={startY + dy * drawProgress}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          markerEnd={arrowHead && drawProgress > 0.95 ? 'url(#arrowhead)' : undefined}
        />
      </svg>
    </div>
  );
};
