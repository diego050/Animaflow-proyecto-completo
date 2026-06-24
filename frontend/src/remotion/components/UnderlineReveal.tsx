import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface UnderlineRevealProps extends UniversalProps {
  text?: string;
  underlineColor?: string;
  underlineWidth?: number;
  /** Ancho máximo antes de hacer salto de línea (px). */
  width?: number;
}

/**
 * UnderlineReveal — texto con subrayado animado que se dibuja de izq→der.
 *
 * Usa un background clonado por línea (box-decoration-break) → cada línea (al hacer
 * wrap) recibe su propio subrayado. `width` limita el ancho para que el texto baje.
 */
export const UnderlineReveal: React.FC<UnderlineRevealProps> = ({
  text = 'Underline',
  color = '#ffffff',
  underlineColor = '#3b82f6',
  underlineWidth = 6,
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
  const underlineProgress = spring({
    frame: Math.max(0, adjustedFrame - 15),
    fps,
    config: { damping: 14, mass: 0.5, stiffness: 100 },
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
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          // Subrayado bajo cada línea, se dibuja de izq→der.
          backgroundImage: `linear-gradient(${underlineColor}, ${underlineColor})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${underlineProgress * 100}% ${underlineWidth}px`,
          backgroundPosition: '0 100%',
          WebkitBoxDecorationBreak: 'clone',
          boxDecorationBreak: 'clone',
          paddingBottom: `${underlineWidth + 2}px`,
        }}
      >
        {text}
      </span>
    </div>
  );
};
