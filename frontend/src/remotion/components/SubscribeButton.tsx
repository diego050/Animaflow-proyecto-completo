import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import { UniversalProps } from './types';

interface SubscribeButtonProps extends UniversalProps {
  clickFrame?: number;
  clickedColor?: string;
  text?: string;
  clickedText?: string;
}

export const SubscribeButton: React.FC<SubscribeButtonProps> = ({
  x = 540,
  y = 800,
  color = '#FF0000',         // ← AHORA DINÁMICO (rojo, azul, lo que sea)
  textColor = '#FFFFFF',     // ← AHORA DINÁMICO
  clickedColor = '#333333',  // ← AHORA DINÁMICO
  text = 'Subscribe',
  clickedText = 'Subscribed',
  clickFrame = 90,
  fontSize = 40,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const isClicked = adjustedFrame >= clickFrame;

  const scale = interpolate(adjustedFrame, [clickFrame, clickFrame + 5, clickFrame + 10], [1, 0.9, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });

  const bgColor = isClicked ? clickedColor : color;
  const displayText = isClicked ? clickedText : text;
  const txtColor = isClicked ? '#AAAAAA' : textColor;

  // Entrance opacity
  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        backgroundColor: bgColor,
        padding: '20px 40px',
        borderRadius: '50px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 'bold',
        fontSize: `${fontSize}px`,
        color: txtColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        zIndex: 50,
        opacity,
      }}
    >
      {isClicked && (
        <span style={{ marginRight: '15px', fontSize: `${fontSize * 0.875}px` }}>🔔</span>
      )}
      {displayText}
    </div>
  );
};
