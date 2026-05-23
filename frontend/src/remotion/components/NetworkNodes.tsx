import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

export const NetworkNodes: React.FC<{
  nodeColor?: string;
  lineColor?: string;
  width?: number;
  height?: number;
} & UniversalProps> = ({
  nodeColor = '#38bdf8', // Sky blue
  lineColor = 'rgba(56, 189, 248, 0.4)',
  x = 540,
  y = 960,
  delay = 0,
  width = 800,
  height = 600,
  color,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig();

  // Pre-defined nodes (relative to 0,0 center)
  const nodes = [
    { id: 1, cx: 0, cy: -200, r: 25 }, // Top
    { id: 2, cx: -250, cy: 0, r: 15 }, // Left
    { id: 3, cx: 250, cy: 50, r: 20 }, // Right
    { id: 4, cx: -150, cy: 200, r: 18 }, // Bottom Left
    { id: 5, cx: 150, cy: 150, r: 22 }, // Bottom Right
    { id: 6, cx: 50, cy: -50, r: 30 }, // Center
  ];

  // Connections (pairs of node IDs)
  const connections = [
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], // All connect to center
    [1, 2], [1, 3], [2, 4], [3, 5], [4, 5] // Perimeter connections
  ];

  // Subtle pulsing animation for nodes
  const pulseScale = 1 + Math.sin(adjustedFrame / 15) * 0.1;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox="-400 -300 800 600" // Center coordinate system
        style={{ overflow: 'visible' }}
      >
        {/* Lines */}
        {connections.map(([a, b], i) => {
          const nodeA = nodes.find(n => n.id === a)!;
          const nodeB = nodes.find(n => n.id === b)!;
          
          // Animate line opacity like data traveling
          const opacity = 0.2 + (Math.sin((adjustedFrame + i * 10) / 10) + 1) * 0.4;
          
          return (
            <line
              key={`line-${i}`}
              x1={nodeA.cx}
              y1={nodeA.cy}
              x2={nodeB.cx}
              y2={nodeB.cy}
              stroke={lineColor}
              strokeWidth="4"
              style={{
                opacity,
                filter: `drop-shadow(0 0 5px ${lineColor})`
              }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          // Individual pulse offsets
          const localPulse = 1 + Math.sin((adjustedFrame + i * 15) / 10) * 0.15;
          return (
            <circle
              key={node.id}
              cx={node.cx}
              cy={node.cy}
              r={node.r * localPulse}
              fill={nodeColor}
              style={{
                filter: `drop-shadow(0 0 15px ${nodeColor})`
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};
