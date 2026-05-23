import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface AnimatedArrowProps extends UniversalProps {
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  curved?: boolean;
  strokeWidth?: number;
  headSize?: number;
}

export const AnimatedArrow: React.FC<AnimatedArrowProps> = ({
  startX = 200,
  startY = 200,
  endX = 800,
  endY = 800,
  curved = true,
  strokeWidth = 10,
  headSize = 25,
  color = '#ffffff',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance
  const drawProgress = spring({ frame: adjustedFrame, fps, config: { damping: 15 } });

  const dx = endX - startX;
  const dy = endY - startY;
  
  // Calculate a control point for the bezier curve
  // We offset it perpendicularly to create a natural curve
  const midX = startX + dx / 2;
  const midY = startY + dy / 2;
  const curveOffset = curved ? 150 : 0;
  
  // Perpendicular vector
  const len = Math.sqrt(dx*dx + dy*dy);
  const nx = -dy / len;
  const ny = dx / len;
  
  const cpX = midX + nx * curveOffset;
  const cpY = midY + ny * curveOffset;

  // Total length approximation for the path
  const approxLength = curved ? len * 1.2 : len;
  
  // The path string
  const pathD = curved 
    ? `M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`
    : `M ${startX} ${startY} L ${endX} ${endY}`;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 30, pointerEvents: 'none' }}>
      <svg width={width} height={height}>
        <defs>
          <marker 
            id="arrowhead_custom" 
            markerWidth={headSize} 
            markerHeight={headSize * 0.7} 
            refX={headSize * 0.8} 
            refY={headSize * 0.35} 
            orient="auto"
          >
            <polygon points={`0 0, ${headSize} ${headSize*0.35}, 0 ${headSize*0.7}`} fill={color} />
          </marker>
        </defs>
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={approxLength}
          strokeDashoffset={approxLength * (1 - drawProgress)}
          markerEnd={drawProgress > 0.95 ? 'url(#arrowhead_custom)' : undefined}
          style={{
            filter: `drop-shadow(0 10px 15px rgba(0,0,0,0.3))`
          }}
        />
      </svg>
    </div>
  );
};
