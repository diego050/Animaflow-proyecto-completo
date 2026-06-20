import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fitText } from '../utils/fitText';
import { TEXT_HALO } from '../utils/tokens';
import type { UniversalProps } from "./types";

export interface WordTiming {
  word: string;
  start: number; // segundos, relativo al inicio de la escena
  end: number;
}

export interface TypewriterProps extends UniversalProps {
  text: string;
  width?: number;
  speed?: number;
  durationInFrames?: number;
  wordTimestamps?: WordTiming[];
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text = 'Texto de ejemplo',
  color = '#ffffff',
  x = 540,
  y = 960,
  fontSize = 60,
  width,
  speed: speedProp,
  delay = 0,
  durationInFrames,
  wordTimestamps,
}) => {
  const frame = useCurrentFrame();
  const { width: canvasWidth, height: canvasHeight, fps, durationInFrames: cfgDuration } = useVideoConfig();

  const effectiveWidth = width || Math.min(900, Math.floor(canvasWidth * 0.85));

  const fitted = fitText(text, effectiveWidth, Math.floor(canvasHeight * 0.6), {
    minFontSize: 48,
    maxFontSize: fontSize || 60,
    fontWeight: 900,
    lineHeight: 1.3,
    padding: 20,
  });
  const actualFontSize = fitted.fontSize;

  const safeText = text ?? '';
  const delayFrames = Math.round(delay * fps);
  const adjustedFrame = Math.max(0, frame - delayFrames);

  const totalChars = safeText.length;

  // GARANTÍA: el tecleo SIEMPRE termina dentro de la duración disponible. Usamos
  // la duración del prop o, si falta (p.ej. en el preview), la del composition
  // (useVideoConfig) → nunca se queda a medias. `speed` es un multiplicador para
  // terminar ANTES (>=1): speed=1 termina al final de la escena; speed=2 a la
  // mitad. No puede ser más lento que terminar dentro de la escena.
  const reservedFrames = 12; // ~0.4s de margen al final
  const sceneDuration = (durationInFrames && durationInFrames > 0) ? durationInFrames : cfgDuration;
  let charsToShow: number;
  if (Array.isArray(wordTimestamps) && wordTimestamps.length > 0) {
    // KARAOKE — revela al ritmo en que se PRONUNCIAN las palabras.
    const tSec = frame / fps;
    let spoken = 0;
    for (const w of wordTimestamps) {
      if (w.start <= tSec) spoken++;
      else break;
    }
    const fraction = Math.min(1, spoken / wordTimestamps.length);
    charsToShow = Math.ceil(fraction * totalChars);
  } else {
    const fullWindow = Math.max(1, sceneDuration - reservedFrames - delayFrames);
    const window = fullWindow / Math.max(1, speedProp ?? 1);
    const progress = Math.min(1, adjustedFrame / window);
    charsToShow = Math.ceil(progress * totalChars);
  }
  const displayedText = safeText.substring(0, charsToShow);
  const cursorBlink = Math.floor(adjustedFrame / 15) % 2 === 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${effectiveWidth}px`,
        textAlign: 'center',
        zIndex: 10,
      }}
    >
      <div
        style={{
          color,
          fontSize: actualFontSize,
          fontWeight: 900,
          fontFamily: 'Inter, system-ui, sans-serif',
          lineHeight: 1.3,
          wordBreak: 'break-word',
          textShadow: TEXT_HALO,
        }}
      >
        {displayedText}
        <span style={{ opacity: cursorBlink ? 1 : 0, marginLeft: 2 }}>|</span>
      </div>
    </div>
  );
};
