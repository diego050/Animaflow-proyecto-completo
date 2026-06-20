import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

/**
 * MaskedReveal — revela texto con un barrido enmascarado (clip) direccional.
 *
 * Usa clip-path animado (no una caja con overflow), así el texto largo NO se
 * recorta de forma permanente: hace wrap y se ajusta. Tiene entrada (reveal) y
 * salida opcional (`exit`, cierra el clip al final de la escena).
 */
interface MaskedRevealProps extends UniversalProps {
  direction?: 'up' | 'down' | 'left' | 'right';
  content?: string;
  /** Cierra el reveal al final de la escena (salida). */
  exit?: boolean;
  /** Frames que dura la salida. */
  exitDuration?: number;
}

export const MaskedReveal: React.FC<MaskedRevealProps> = ({
  direction = 'up',
  content = 'Revealed Text',
  color = '#ffffff',
  bgColor = 'transparent',
  fontSize = 60,
  x = 540,
  y = 540,
  width = 800,
  exit = false,
  exitDuration = 20,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrada (0→1) y salida opcional (1→0 al final de la escena).
  const entryP = spring({ frame: adjustedFrame, fps, config: { damping: 16 } });
  const exitP = exit
    ? interpolate(frame, [durationInFrames - exitDuration, durationInFrames], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;
  const p = Math.min(entryP, exitP);

  // Barrido por dirección: clip-path que oculta un lado + leve deslizamiento.
  const h = (1 - p) * 100; // % oculto
  const d = 40; // px de deslizamiento
  let tx = 0;
  let ty = 0;
  let clip = 'inset(0 0 0 0)';
  if (direction === 'up') { ty = (1 - p) * d; clip = `inset(0 0 ${h}% 0)`; }
  else if (direction === 'down') { ty = -(1 - p) * d; clip = `inset(${h}% 0 0 0)`; }
  else if (direction === 'left') { tx = (1 - p) * d; clip = `inset(0 0 0 ${h}%)`; }
  else if (direction === 'right') { tx = -(1 - p) * d; clip = `inset(0 ${h}% 0 0)`; }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        maxWidth: `${width}px`,
        transform: 'translate(-50%, -50%)',
        backgroundColor: bgColor,
        zIndex: 45,
      }}
    >
      <div
        style={{
          transform: `translate(${tx}px, ${ty}px)`,
          clipPath: clip,
          WebkitClipPath: clip,
          color,
          fontSize: `${fontSize}px`,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 'bold',
          textAlign: 'center',
          lineHeight: 1.15,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {content}
      </div>
    </div>
  );
};
