import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { UniversalProps } from "./types";

interface LoadingSpinnerProps extends UniversalProps {
  speed?: number;
  size?: number;
  /** Grosor del anillo (unidades viewBox 0-100). */
  lineWidth?: number;
  /** Color del aro de fondo (el "track" que queda detrás). */
  trackColor?: string;
  /** Porción visible del aro que gira (0-1 de la circunferencia). */
  arc?: number;
  /** Frames del fade de entrada (0 = aparece de golpe). */
  fadeDuration?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  color = '#3b82f6',
  trackColor = '#1e293b',
  speed = 1,
  size = 100,
  lineWidth = 10,
  arc = 0.5,
  fadeDuration = 15,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const rotation = (adjustedFrame * 5 * speed) % 360;

  // Fade de entrada configurable (0 = sin fade, aparece de golpe).
  const opacity = fadeDuration > 0
    ? interpolate(adjustedFrame, [0, fadeDuration], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })
    : 1;

  // Circunferencia para r=40 ≈ 251. La porción visible la define `arc`.
  const circumference = 2 * Math.PI * 40;
  const visible = Math.max(0, Math.min(1, arc)) * circumference;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', opacity, zIndex: 50 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        {/* Background Track */}
        <circle cx="50" cy="50" r="40" fill="none" stroke={trackColor} strokeWidth={lineWidth} />

        {/* Spinning Progress */}
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth={lineWidth} strokeLinecap="round" strokeDasharray={`${visible} ${circumference}`} style={{ transformOrigin: '50px 50px', transform: `rotate(${rotation}deg)` }} />
      </svg>
    </div>
  );
};
