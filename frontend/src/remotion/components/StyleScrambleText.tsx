import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { UniversalProps } from "./types";

export interface WordTiming {
  word: string;
  start: number; // segundos, relativo al inicio de la escena
  end: number;
}

interface StyleScrambleTextProps extends UniversalProps {
  text?: string;
  speed?: number;
  characters?: string;
  loop?: boolean;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  /** Ancho máximo antes de hacer salto de línea (px). */
  width?: number;
  /** Forzar mayúsculas. */
  uppercase?: boolean;
  style?: Record<string, unknown>;
  wordTimestamps?: WordTiming[];
}

const DEFAULT_CHARS = '#$%&@!?*+=^~01';

export const StyleScrambleText: React.FC<StyleScrambleTextProps> = ({
  x = 540,
  y = 400,
  text = 'ACCESS GRANTED',
  speed = 2,
  characters = DEFAULT_CHARS,
  loop = false,
  fontSize,
  fontWeight,
  color,
  width = 900,
  uppercase = true,
  style,
  delay = 0,
  wordTimestamps,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);
  const hasKaraoke = !!(wordTimestamps && wordTimestamps.length > 0);

  // v7.3: reveal sincronizado al audio si hay timestamps (karaoke); si no, ritmo
  // por velocidad como antes.
  let revealedChars: number;
  if (hasKaraoke) {
    const tSec = frame / fps;
    let spoken = 0;
    for (const w of wordTimestamps!) {
      if (w.start <= tSec) spoken++;
      else break;
    }
    revealedChars = Math.ceil((spoken / wordTimestamps!.length) * text.length);
  } else {
    const totalFrames = Math.ceil(text.length / speed) + 10;
    const progress = Math.min(adjustedFrame / totalFrames, 1);
    revealedChars = Math.floor(progress * text.length);
  }

  const opacity = interpolate(adjustedFrame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // v7.3: scramble DETERMINISTA (antes Math.random() rompía la reproducibilidad
  // de Remotion → parpadeo distinto por worker). Función pura de (frame, índice).
  const displayText = text.split('').map((char, i) => {
    if (i < revealedChars) return char;
    if (char === ' ') return ' ';
    const idx = (frame * 31 + i * 17) % characters.length;
    return characters[idx];
  }).join('');

  // v7: prioriza props top-level (el backend los escribe ahí); default grande
  // para video móvil (antes 32px era ilegible).
  const customFontSize = fontSize ?? (style?.fontSize as number) ?? 80;
  const customFontWeight = fontWeight ?? (style?.fontWeight as number) ?? 700;
  const customColor = color ?? (style?.color as string) ?? '#00FFAB';
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;
  const customFontFamily = (style?.fontFamily as string) ?? 'JetBrains Mono, monospace';
  const customLetterSpacing = style?.letterSpacing ? `${style.letterSpacing}px` : '2px';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        fontFamily: customFontFamily,
        fontWeight: customFontWeight,
        fontSize: `${customFontSize}px`,
        color: customColor,
        letterSpacing: customLetterSpacing,
        zIndex: 50,
        opacity: customOpacity,
        textTransform: uppercase ? 'uppercase' : 'none',
        width: `${width}px`,
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {displayText}
    </div>
  );
};
