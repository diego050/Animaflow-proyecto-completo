import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface FloatingBadgeProps extends UniversalProps {
  text?: string;
  shape?: 'pill' | 'rect' | 'circle';
  borderWidth?: number;
  borderColor?: string;
  /** Radio de esquinas para shape 'rect' (px). */
  cornerRadius?: number;
  shadow?: boolean;
  /** Amplitud del flotado (px). 0 = quieto. */
  hoverAmount?: number;
  /** Ancho máximo antes de hacer salto de línea (px). 0 = sin límite. */
  width?: number;
}

export const FloatingBadge: React.FC<FloatingBadgeProps> = ({
  text = 'NEW!',
  shape = 'pill',
  borderWidth = 0,
  borderColor = '#ffffff',
  cornerRadius = 12,
  shadow = true,
  hoverAmount = 10,
  width = 0,
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

  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 10, mass: 0.8 } });
  const hoverY = interpolate(Math.sin(adjustedFrame * 0.1), [-1, 1], [-hoverAmount, hoverAmount]);

  let br = '0px';
  if (shape === 'pill') br = '9999px';
  else if (shape === 'circle') br = '50%';
  else if (shape === 'rect') br = `${cornerRadius}px`;

  const hasMax = width > 0;

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
      border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
      boxShadow: shadow ? `0 20px 40px ${color}80` : 'none',
      fontFamily: 'Inter, sans-serif',
      whiteSpace: hasMax ? 'pre-wrap' : 'nowrap',
      wordBreak: 'break-word',
      maxWidth: hasMax ? `${width}px` : undefined,
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      aspectRatio: shape === 'circle' ? '1/1' : 'auto',
      zIndex: 60,
    }}>
      {text}
    </div>
  );
};
