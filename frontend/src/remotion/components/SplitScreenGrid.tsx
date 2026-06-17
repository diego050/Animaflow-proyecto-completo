import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { useCanvas } from '../utils/canvas';

export const SplitScreenGrid: React.FC<{
  splitFrame?: number;
}> = ({
  splitFrame = 60,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const c = useCanvas();

  // Animation to scale down and move to corners
  const splitProgress = spring({
    frame: Math.max(0, frame - splitFrame),
    fps,
    config: { damping: 15, mass: 1.2, stiffness: 120 }, // smooth ease out
  });

  // Calculate positions
  // Panel sizes shrink to 49% to leave a tiny gap in the middle
  const targetW = width * 0.495;
  const targetH = height * 0.495;
  
  // Starting full screen
  const startW = width;
  const startH = height;

  const currentW = startW - (startW - targetW) * splitProgress;
  const currentH = startH - (startH - targetH) * splitProgress;

  // Colors for the 4 quadrants (placeholders for videos)
  const panels = [
    { color: '#ef4444', tx: 0, ty: 0 }, // Top Left (Red)
    { color: '#3b82f6', tx: width - targetW, ty: 0 }, // Top Right (Blue)
    { color: '#10b981', tx: 0, ty: height - targetH }, // Bottom Left (Green)
    { color: '#f59e0b', tx: width - targetW, ty: height - targetH }, // Bottom Right (Yellow)
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: '#0f172a', // Background gap color
        zIndex: 10,
      }}
    >
      {panels.map((panel, i) => {
        // Calculate current X, Y based on splitProgress
        // They all start at 0,0 full screen, then move to their target
        const currentX = panel.tx * splitProgress;
        const currentY = panel.ty * splitProgress;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${currentW}px`,
              height: `${currentH}px`,
              backgroundColor: panel.color,
              transform: `translate(${currentX}px, ${currentY}px)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: `${c.vmin(5)}px`,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 'bold',
              boxShadow: splitProgress > 0.1 ? '0 10px 30px rgba(0,0,0,0.5)' : 'none',
              borderRadius: splitProgress > 0.1 ? `${c.vmin(3)}px` : '0px',
              overflow: 'hidden',
            }}
          >
            [Video {i + 1}]
          </div>
        );
      })}
    </div>
  );
};
