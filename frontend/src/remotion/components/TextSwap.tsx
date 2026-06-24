import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface TextSwapProps extends UniversalProps {
  initialText?: string;
  finalText?: string;
  initialColor?: string;
  finalColor?: string;
  /** Dirección/estilo del swap. '3d' = volteo falso 3D. */
  direction?: 'up' | 'down' | 'left' | 'right' | '3d';
  /** Frames antes de hacer el swap. */
  swapDelay?: number;
  /** Ancho máximo antes de hacer salto de línea (px). */
  width?: number;
}

export const TextSwap: React.FC<TextSwapProps> = ({
  initialText = 'BEFORE',
  finalText = 'AFTER',
  initialColor = '#ef4444',
  finalColor = '#10b981',
  fontSize = 80,
  direction = 'up',
  swapDelay = 30,
  width = 800,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const p = spring({ frame: Math.max(0, adjustedFrame - swapDelay), fps, config: { damping: 16, mass: 1, stiffness: 80 } });

  const off = fontSize * 1.5;

  // Transform de salida (initial) y entrada (final) según la dirección.
  let initialTransform = '';
  let finalTransform = '';
  if (direction === 'up') { initialTransform = `translateY(${-p * off}px)`; finalTransform = `translateY(${(1 - p) * off}px)`; }
  else if (direction === 'down') { initialTransform = `translateY(${p * off}px)`; finalTransform = `translateY(${-(1 - p) * off}px)`; }
  else if (direction === 'left') { initialTransform = `translateX(${-p * off}px)`; finalTransform = `translateX(${(1 - p) * off}px)`; }
  else if (direction === 'right') { initialTransform = `translateX(${p * off}px)`; finalTransform = `translateX(${-(1 - p) * off}px)`; }
  else { // 3d: volteo en X
    initialTransform = `rotateX(${p * 90}deg)`;
    finalTransform = `rotateX(${(1 - p) * -90}deg)`;
  }

  const textBase: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 900,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    textAlign: 'center',
    lineHeight: 1.15,
    backfaceVisibility: 'hidden',
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) scale(${entrance})`,
        width: `${width}px`,
        perspective: direction === '3d' ? '600px' : undefined,
        zIndex: 40,
      }}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Initial: relativo (define la altura del bloque) */}
        <div style={{ ...textBase, color: initialColor, opacity: 1 - p, transform: initialTransform }}>
          {initialText}
        </div>
        {/* Final: superpuesto */}
        <div style={{ ...textBase, color: finalColor, opacity: p, transform: finalTransform, position: 'absolute', top: 0, left: 0, width: '100%' }}>
          {finalText}
        </div>
      </div>
    </div>
  );
};
