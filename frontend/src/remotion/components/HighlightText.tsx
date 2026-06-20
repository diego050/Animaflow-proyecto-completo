import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import type { UniversalProps } from "./types";

export interface HighlightTextProps extends UniversalProps {
  text: string;
  highlightColor?: string;
  /** Altura de la franja de marcador (% de la línea). */
  highlightHeight?: number;
  width?: number;
}

/**
 * HighlightText — texto con barrido de marcador que crece de izq→der.
 *
 * El marcador es un background del propio texto con box-decoration-break: clone,
 * así resalta TODAS las líneas (antes era una sola banda → fallaba multilínea).
 */
export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  color = '#0f172a',
  highlightColor = '#eab308',
  highlightHeight = 45,
  x = 540,
  y = 960,
  fontSize = 80,
  width = 900,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 14, mass: 0.5, stiffness: 80 },
  });

  const h = Math.min(100, Math.max(0, highlightHeight));

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${width}px`,
        textAlign: 'center',
        zIndex: 10,
      }}
    >
      <span
        style={{
          color,
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: 1.35,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          // Marcador: background del texto que crece en ancho; clonado por línea.
          backgroundImage: `linear-gradient(${highlightColor}, ${highlightColor})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${progress * 100}% ${h}%`,
          backgroundPosition: '0 88%',
          WebkitBoxDecorationBreak: 'clone',
          boxDecorationBreak: 'clone',
          padding: '0 6px',
        }}
      >
        {text}
      </span>
    </div>
  );
};
