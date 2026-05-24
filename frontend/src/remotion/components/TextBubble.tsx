import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface TextBubbleProps extends UniversalProps {
  text?: string;
  pointerPosition?: 'left' | 'right' | 'top' | 'bottom';
  shadow?: boolean;
}

export const TextBubble: React.FC<TextBubbleProps> = ({
  text = 'Hello World!',
  pointerPosition = 'bottom',
  shadow = true,
  bgColor = '#ffffff',
  textColor = '#0f172a',
  x = 540,
  y = 540,
  fontSize = 40,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Pop entrance
  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 10, mass: 0.8 } });
  
  // Transform origin based on pointer
  let transformOrigin = 'center center';
  if (pointerPosition === 'bottom') transformOrigin = 'center bottom';
  if (pointerPosition === 'top') transformOrigin = 'center top';
  if (pointerPosition === 'left') transformOrigin = 'left center';
  if (pointerPosition === 'right') transformOrigin = 'right center';

  // Triangle pointer pseudo-element logic done with absolute divs
  const getPointerStyles = (): React.CSSProperties => {
    const size = 30;
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };
    
    if (pointerPosition === 'bottom') {
      return {
        ...base,
        bottom: `-${size}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        borderWidth: `${size}px ${size}px 0 ${size}px`,
        borderColor: `${bgColor} transparent transparent transparent`,
      };
    } else if (pointerPosition === 'top') {
      return {
        ...base,
        top: `-${size}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        borderWidth: `0 ${size}px ${size}px ${size}px`,
        borderColor: `transparent transparent ${bgColor} transparent`,
      };
    } else if (pointerPosition === 'left') {
      return {
        ...base,
        left: `-${size}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: `${size}px ${size}px ${size}px 0`,
        borderColor: `transparent ${bgColor} transparent transparent`,
      };
    } else { // right
      return {
        ...base,
        right: `-${size}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        borderWidth: `${size}px 0 ${size}px ${size}px`,
        borderColor: `transparent transparent transparent ${bgColor}`,
      };
    }
  };

  return (
    <div style={{
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      transform: `translate(-50%, -50%) scale(${scale})`,
      transformOrigin,
      zIndex: 65,
    }}>
      <div style={{
        position: 'relative',
        backgroundColor: bgColor,
        padding: '30px 50px',
        borderRadius: '30px',
        color: textColor,
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        fontFamily: 'Inter, sans-serif',
        boxShadow: shadow ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none',
        whiteSpace: 'pre-wrap',
        textAlign: 'center',
        maxWidth: '800px',
      }}>
        {text}
        <div style={getPointerStyles()} />
      </div>
    </div>
  );
};
