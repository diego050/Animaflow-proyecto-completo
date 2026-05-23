import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface AnimatedShapeProps extends UniversalProps {
  shape?: 'rect' | 'circle' | 'rounded-rect' | 'pill' | 'diamond' | 'hexagon';
  width?: number;
  height?: number;
  borderRadius?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetY?: number;
  rotation?: number;
  opacity?: number;
}

export const AnimatedShape: React.FC<AnimatedShapeProps> = ({
  shape = 'rounded-rect',
  width = 200,
  height = 200,
  borderRadius = 32,
  startX = -200,
  startY = 540,
  endX = 540,
  endY = 540,
  shadowColor = 'rgba(0,0,0,0.3)',
  shadowBlur = 20,
  shadowOffsetY = 10,
  rotation = 0,
  opacity = 1,
  color = '#3b82f6',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance and movement
  const enter = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  const currentX = interpolate(enter, [0, 1], [startX, endX]);
  const currentY = interpolate(enter, [0, 1], [startY, endY]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${currentX}px`,
    top: `${currentY}px`,
    width: `${width}px`,
    height: shape === 'circle' ? `${width}px` : `${height}px`,
    backgroundColor: color,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    opacity,
    boxShadow: `0 ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`,
    zIndex: 10,
  };

  if (shape === 'rounded-rect') {
    style.borderRadius = `${borderRadius}px`;
  } else if (shape === 'circle') {
    style.borderRadius = '50%';
  } else if (shape === 'pill') {
    style.borderRadius = '9999px';
  } else if (shape === 'diamond') {
    style.transform = `translate(-50%, -50%) rotate(${rotation + 45}deg)`;
  } else if (shape === 'hexagon') {
    style.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
    style.borderRadius = '0'; // Custom clip path doesn't take standard border radius easily
    delete style.boxShadow; // Shadows are weird with clip-path, would need a drop-shadow filter
    style.filter = `drop-shadow(0 ${shadowOffsetY}px ${shadowBlur}px ${shadowColor})`;
  }

  return <div style={style} />;
};
