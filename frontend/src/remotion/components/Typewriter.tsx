import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { fitText } from '../utils/fitText';
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
  text,
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
  const { width: canvasWidth, height: canvasHeight, fps } = useVideoConfig();

  const effectiveWidth = width || Math.min(900, Math.floor(canvasWidth * 0.85));

  const fitted = fitText(text, effectiveWidth, Math.floor(canvasHeight * 0.6), {
    minFontSize: 48,
    maxFontSize: fontSize || 60,
    fontWeight: 900,
    lineHeight: 1.3,
    padding: 20,
  });
  const actualFontSize = fitted.fontSize;

  const delayFrames = Math.round(delay * 30);
  const adjustedFrame = Math.max(0, frame - delayFrames);

  const totalChars = text.length;

  // v7.2: acoplar el tecleo a la DURACIÓN de la escena (≈ audio).
  // Si tenemos durationInFrames, repartimos el texto suavemente sobre la
  // ventana de la escena y terminamos ~0.4s antes del final (reservedFrames),
  // de modo que la última palabra quede visible antes del corte. Solo si NO
  // hay duración usamos la velocidad fija heredada.
  const reservedFrames = 12; // ~0.4s de margen al final
  let charsToShow: number;
  if (wordTimestamps && wordTimestamps.length > 0) {
    // v7.3: KARAOKE — revela el texto al ritmo en que se PRONUNCIAN las
    // palabras. Usamos la fracción de palabras ya habladas para revelar esa
    // misma fracción del texto (robusto a diferencias de conteo entre el texto
    // y la transcripción). La palabra aparece justo cuando se dice.
    const tSec = frame / fps; // segundos desde el inicio de la escena (= audio)
    let spoken = 0;
    for (const w of wordTimestamps) {
      if (w.start <= tSec) spoken++;
      else break;
    }
    const fraction = Math.min(1, spoken / wordTimestamps.length);
    charsToShow = Math.ceil(fraction * totalChars);
  } else if (durationInFrames && durationInFrames > 0) {
    // Sin timestamps: repartir suave sobre la duración de la escena.
    const typingWindow = Math.max(1, durationInFrames - reservedFrames - delayFrames);
    const progress = Math.min(1, adjustedFrame / typingWindow);
    charsToShow = Math.ceil(progress * totalChars);
  } else {
    const speed = speedProp ?? 2;
    charsToShow = Math.floor(adjustedFrame / speed);
  }
  const displayedText = text.substring(0, charsToShow);
  const cursorBlink = Math.floor(adjustedFrame / 15) % 2 === 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${effectiveWidth}px`,
        textAlign: 'left',
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
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
        }}
      >
        {displayedText}
        <span style={{ opacity: cursorBlink ? 1 : 0, marginLeft: 2 }}>|</span>
      </div>
    </div>
  );
};
