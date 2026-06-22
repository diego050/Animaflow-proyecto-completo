import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

// ---------------------------------------------------------------------------
// StyleCardFlip — 3D card flip with configurable front/back faces
// ---------------------------------------------------------------------------

interface StyleCardFlipProps extends UniversalProps {
  frontText?: string;
  backText?: string;
  frontGradientStart?: string;
  frontGradientEnd?: string;
  backGradientStart?: string;
  backGradientEnd?: string;
  cardWidth?: number;
  cardHeight?: number;
  fontSize?: number;
  borderRadius?: number;
  perspective?: number;
  springDamping?: number;
  springMass?: number;
  loop?: boolean;
  style?: Record<string, unknown>;
}

export const StyleCardFlip: React.FC<StyleCardFlipProps> = ({
  x = 0,
  y = 0,
  frontText = 'Remotion 👋',
  backText = 'Back',
  frontGradientStart = '#1e3a8a',
  frontGradientEnd = '#3b82f6',
  backGradientStart = '#7209b7',
  backGradientEnd = '#f72585',
  cardWidth,
  cardHeight,
  fontSize,
  borderRadius,
  perspective = 1000,
  springDamping = 15,
  springMass = 0.5,
  loop = false,
  style: styleOverride,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();

  // --- Layout sizing (responsive via useCanvas) ---
  const w = cardWidth ?? c.vmin(30);
  const h = cardHeight ?? c.vmin(40);
  const fs = fontSize ?? c.vmin(4);
  const br = borderRadius ?? c.vmin(2.5);

  // --- Deterministic spring animation ---
  const loopDuration = 90;
  const springFrame = loop ? frame % loopDuration : frame;
  const rotation = spring({
    frame: springFrame,
    fps,
    from: 0,
    to: 360,
    config: { damping: springDamping, mass: springMass },
  });

  // --- Coordinate contract: absolute center from layoutSolver ---
  const left = c.width / 2 + x;
  const top = c.height / 2 + y;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translate(-50%, -50%)',
        perspective: `${perspective}px`,
        width: `${w}px`,
        height: `${h}px`,
        ...(styleOverride as React.CSSProperties),
      }}
    >
      {/* Card wrapper with 3D transform */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotation}deg)`,
          transition: 'none',
        }}
      >
        {/* Front face */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: `linear-gradient(135deg, ${frontGradientStart}, ${frontGradientEnd})`,
            borderRadius: `${br}px`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: `${fs}px`,
            fontWeight: 700,
            fontFamily: 'Inter Tight, sans-serif',
            color: '#ffffff',
            padding: `${c.vmin(2)}px`,
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {frontText}
        </div>

        {/* Back face — rotated 180° so it shows when card flips */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: `linear-gradient(135deg, ${backGradientStart}, ${backGradientEnd})`,
            borderRadius: `${br}px`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: `${fs}px`,
            fontWeight: 700,
            fontFamily: 'Inter Tight, sans-serif',
            color: '#ffffff',
            padding: `${c.vmin(2)}px`,
            textAlign: 'center',
            boxSizing: 'border-box',
            transform: 'rotateY(180deg)',
          }}
        >
          {backText}
        </div>
      </div>
    </div>
  );
};
