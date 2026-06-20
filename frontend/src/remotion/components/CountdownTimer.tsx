import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface CountdownTimerProps extends UniversalProps {
  seconds?: number;
  /** Diámetro del círculo (px). */
  size?: number;
  /** Grosor del anillo (unidades del viewBox 0-100). */
  lineWidth?: number;
  /** Color del anillo que ya transcurrió (el "sobrante"/track). */
  trackColor?: string;
  /** Rebote en cada segundo. */
  tick?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  seconds = 10,
  bgColor = '#0f172a',
  textColor = '#ffffff',
  color = '#eab308', // Ring (progress) color
  trackColor = '#334155',
  size = 400,
  lineWidth = 6,
  tick = true,
  x = 540,
  y = 540,
  fontSize = 200,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  const elapsedSeconds = adjustedFrame / fps;
  const currentNumber = Math.max(0, Math.ceil(seconds - elapsedSeconds));

  const tickFrame = adjustedFrame % fps;
  const tickPop = spring({ frame: tickFrame, fps, config: { damping: 12, mass: 0.5 } });
  const scale = tick ? entrance * (0.9 + tickPop * 0.1) : entrance;

  const progress = interpolate(adjustedFrame, [0, seconds * fps], [0, 100], { extrapolateRight: 'clamp' });

  const ringSize = size * 1.12;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${scale})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', zIndex: 50 }}>
      {/* Background circle */}
      <div style={{ position: 'absolute', width: `${size}px`, height: `${size}px`, borderRadius: '50%', backgroundColor: bgColor, boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }} />

      {/* SVG Ring */}
      <svg width={ringSize} height={ringSize} viewBox="0 0 100 100" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="45" fill="none" stroke={trackColor} strokeWidth={lineWidth} />
        <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth={lineWidth} strokeLinecap="round" strokeDasharray="283" strokeDashoffset={(progress / 100) * 283} />
      </svg>

      {/* Number */}
      <div style={{ fontSize: `${fontSize}px`, fontWeight: 900, color: textColor, zIndex: 2, fontVariantNumeric: 'tabular-nums' }}>
        {currentNumber}
      </div>
    </div>
  );
};
