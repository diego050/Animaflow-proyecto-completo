import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface SplitTextProps extends UniversalProps {
  topText?: string;
  bottomText?: string;
  revealedText?: string;
  revealedColor?: string;
  /** Dirección de apertura. */
  direction?: 'vertical' | 'horizontal';
  /** Cuánto se separan las mitades (multiplicador del fontSize). */
  splitAmount?: number;
  /** Frames antes de que empiece la apertura. */
  revealDelay?: number;
}

export const SplitText: React.FC<SplitTextProps> = ({
  topText = 'SECRET',
  bottomText = 'MESSAGE',
  revealedText = 'UNLOCKED',
  color = '#ffffff',
  revealedColor = '#10b981',
  fontSize = 100,
  direction = 'vertical',
  splitAmount = 1.5,
  revealDelay = 30,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const splitProgress = spring({
    frame: Math.max(0, adjustedFrame - revealDelay),
    fps,
    config: { damping: 16, mass: 1, stiffness: 60 },
  });

  const splitDistance = splitProgress * (fontSize * splitAmount);
  const horizontal = direction === 'horizontal';

  const halfStyle: React.CSSProperties = {
    color,
    fontSize: `${fontSize}px`,
    lineHeight: 1,
    zIndex: 2,
    whiteSpace: 'nowrap',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 900,
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) scale(${entrance})`,
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
      }}
    >
      {/* Texto revelado al centro */}
      <div
        style={{
          position: 'absolute',
          color: revealedColor,
          fontSize: `${fontSize * 0.7}px`,
          fontWeight: 900,
          fontFamily: 'Inter, sans-serif',
          opacity: splitProgress,
          transform: `scale(${interpolate(splitProgress, [0, 1], [0.8, 1])})`,
          whiteSpace: 'nowrap',
          zIndex: 1,
        }}
      >
        {revealedText}
      </div>

      {/* Mitad superior / izquierda */}
      <div style={{ ...halfStyle, transform: horizontal ? `translateX(-${splitDistance / 2}px)` : `translateY(-${splitDistance / 2}px)` }}>
        {topText}
      </div>

      {/* Mitad inferior / derecha */}
      <div style={{ ...halfStyle, transform: horizontal ? `translateX(${splitDistance / 2}px)` : `translateY(${splitDistance / 2}px)` }}>
        {bottomText}
      </div>
    </div>
  );
};
