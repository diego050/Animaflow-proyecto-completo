import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface AnimatedIconProps extends UniversalProps {
  icon?: 'star' | 'heart' | 'arrow' | 'check' | 'cross' | 'bolt' | 'fire' | 'rocket' | 'diamond' | 'crown';
  animation?: 'bounce' | 'pulse' | 'spin' | 'float' | 'shake';
  size?: number;
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  icon = 'star',
  animation = 'bounce',
  size = 120,
  color = '#eab308',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance
  const entranceScale = spring({ frame: adjustedFrame, fps, config: { damping: 12, mass: 0.8 } });

  // Continuous animation
  let transformStr = `translate(-50%, -50%) scale(${entranceScale})`;
  
  if (entranceScale >= 0.99) {
    if (animation === 'bounce') {
      const yOffset = Math.sin(adjustedFrame * 0.15) * 20;
      transformStr = `translate(-50%, calc(-50% + ${yOffset}px)) scale(1)`;
    } else if (animation === 'pulse') {
      const pScale = 1 + Math.sin(adjustedFrame * 0.1) * 0.1;
      transformStr = `translate(-50%, -50%) scale(${pScale})`;
    } else if (animation === 'spin') {
      transformStr = `translate(-50%, -50%) rotate(${adjustedFrame * 2}deg)`;
    } else if (animation === 'float') {
      const yOffset = Math.sin(adjustedFrame * 0.05) * 30;
      const rOffset = Math.cos(adjustedFrame * 0.05) * 10;
      transformStr = `translate(-50%, calc(-50% + ${yOffset}px)) rotate(${rOffset}deg)`;
    } else if (animation === 'shake') {
      const xOffset = Math.sin(adjustedFrame * 0.5) * 10;
      transformStr = `translate(calc(-50% + ${xOffset}px), -50%)`;
    }
  }

  // Very basic inline SVG definitions for standard shapes to keep it independent
  const getIconSvg = () => {
    switch (icon) {
      case 'heart': return <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />;
      case 'check': return <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />;
      case 'cross': return <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />;
      case 'bolt': return <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.16-.28L13.28 1h.72l-1 7H16.5c.67 0 .61.37.44.66-.08.13-5.59 12.34-5.94 12.34z" />;
      case 'fire': return <path d="M11.96 4C11.96 4 10.5 7.11 8.5 9 6.5 10.89 5 12.5 5 15c0 3.87 3.13 7 7 7s7-3.13 7-7c0-2.5-1.5-4.11-3.5-6-2-1.89-3.5-5-3.5-5zm0 13c-1.66 0-3-1.34-3-3 0-1.28.84-2.4 2.05-2.82l.95-.33v-3.8c1.33 1.04 2.5 2.23 2.5 4.95 0 2.76-2.24 5-5 5z" />;
      case 'rocket': return <path d="M14 2L12 4l2 2-2 2h3.58c.27 0 .52-.11.71-.29l5-5c.39-.39.39-1.02 0-1.41l-5-5a1.003 1.003 0 0 0-1.41 0l-5 5c-.39.39-.39 1.02 0 1.41l5 5c.19.19.44.29.71.29H14l-2 2 2 2-2 2c0 1.1-.9 2-2 2s-2-.9-2-2l-2-2 2-2L6 8l2-2-2-2c-.19-.19-.44-.29-.71-.29H2c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h2l2 2-2 2v3.58c0 .27.11.52.29.71l5 5c.39.39 1.02.39 1.41 0l5-5c.39-.39.39-1.02 0-1.41l-5-5a.996.996 0 0 0-.71-.29H14v-2l-2-2 2-2zm-2.5-7.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />;
      case 'diamond': return <path d="M12.16 3h-.32L9.21 8.25h5.58L12.16 3zm-4.3 5.25h-.16L4.54 5.37l3.16 2.88zM4.09 9.75L12 21.05l7.91-11.3H4.09zm15.37-4.38l-3.16 2.88h-.16l3.32-2.88zm-3.66 2.88h-.16L13.1 3h-.94l2.64 5.25h.16l.84-1.63L18.84 3l-3.04 5.25zM6.9 3h-.94L8.6 8.25h-.16l-.84-1.63L5.16 3l3.04 5.25h.16z" />;
      case 'crown': return <path d="M19 19H5V17H19V19ZM19 15H5V13H19V15ZM22 5L17 11L12 2L7 11L2 5V11C2 11.55 2.45 12 3 12H21C21.55 12 22 11.55 22 11V5Z" />;
      default: // star
        return <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />;
    }
  };

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: transformStr, width: `${size}px`, height: `${size}px`, zIndex: 40 }}>
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill={color}>
        {getIconSvg()}
      </svg>
    </div>
  );
};
