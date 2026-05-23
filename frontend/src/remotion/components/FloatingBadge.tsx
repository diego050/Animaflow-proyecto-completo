import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface FloatingBadgeProps extends UniversalProps {
  text?: string;
  shape?: 'pill' | 'rect' | 'circle';
  borderWidth?: number;
  shadow?: boolean;
}

export const FloatingBadge: React.FC<FloatingBadgeProps> = ({
  text = 'NEW!',
  shape = 'pill',
  borderWidth = 0,
  shadow = true,
  color = '#ef4444',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  fontSize = 32,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Scale and hover
  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 10, mass: 0.8 } });
  const hoverY = interpolate(Math.sin(adjustedFrame * 0.1), [-1, 1], [-10, 10]);

  let br = '0px';
  if (shape === 'pill') br = '9999px';
  if (shape === 'circle') br = '50%';
  if (shape === 'rect') br = '12px';

  return (
    <div style={{ 
      position: 'absolute', 
      top: `${y}px`, 
      left: `${x}px`, 
      transform: `translate(-50%, calc(-50% + ${hoverY}px)) scale(${scale})`, 
      backgroundColor: color, 
      color: textColor, 
      fontSize: `${fontSize}px`, 
      fontWeight: 900, 
      padding: shape === 'circle' ? '40px' : '15px 40px', 
      borderRadius: br, 
      border: borderWidth > 0 ? `${borderWidth}px solid #ffffff` : 'none',
      boxShadow: shadow ? `0 20px 40px ${color}80` : 'none',
      fontFamily: 'Inter, sans-serif', 
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      aspectRatio: shape === 'circle' ? '1/1' : 'auto',
      zIndex: 60 
    }}>
      {text}
    </div>
  );
};
