import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface StrikethroughTextProps extends UniversalProps {
  text?: string;
  strikeColor?: string;
  strikeWidth?: number;
  /** Ancho máximo antes de hacer salto de línea (px). */
  width?: number;
}

/**
 * StrikethroughText — texto con tachado animado que crece de izq→der.
 *
 * Usa un background clonado por línea (box-decoration-break) → tacha TODAS las
 * líneas cuando el texto hace wrap (antes solo tachaba la primera). `width` limita
 * el ancho para que el texto largo baje en vez de salirse.
 */
export const StrikethroughText: React.FC<StrikethroughTextProps> = ({
  text = 'Strikethrough',
  color = '#ffffff',
  strikeColor = '#ef4444',
  strikeWidth = 8,
  fontSize = 80,
  width = 900,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const textScale = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const strikeProgress = spring({
    frame: Math.max(0, adjustedFrame - 15),
    fps,
    config: { damping: 12, mass: 0.8, stiffness: 120 },
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) scale(${textScale})`,
        width: `${width}px`,
        textAlign: 'center',
        zIndex: 40,
      }}
    >
      <span
        style={{
          color,
          fontSize: `${fontSize}px`,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 'bold',
          lineHeight: 1.35,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          // Línea de tachado al centro de cada línea, crece de izq→der.
          backgroundImage: `linear-gradient(${strikeColor}, ${strikeColor})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${strikeProgress * 100}% ${strikeWidth}px`,
          backgroundPosition: '0 55%',
          WebkitBoxDecorationBreak: 'clone',
          boxDecorationBreak: 'clone',
        }}
      >
        {text}
      </span>
    </div>
  );
};
