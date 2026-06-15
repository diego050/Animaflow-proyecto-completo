import React from 'react';
import { useVideoConfig, useCurrentFrame } from 'remotion';
import { fitText } from '../utils/fitText';
import { TEXT_HALO } from '../utils/tokens';
import type { UniversalProps } from './types';

export interface WordTiming {
  word: string;
  start: number; // segundos, relativo al inicio de la escena
  end: number;
}

export interface WordHighlightProps extends UniversalProps {
  text: string;
  /** Color base de las palabras. */
  color?: string;
  /** Color de la palabra que se está pronunciando. */
  highlightColor?: string;
  fontSize?: number;
  fontWeight?: number;
  width?: number;
  /** Cuánto "crece" la palabra activa (1 = sin pop). */
  activeScale?: number;
  /** Atenúa las palabras aún no pronunciadas. */
  dimUpcoming?: boolean;
  wordTimestamps?: WordTiming[];
}

/**
 * WordHighlight — subtítulo "karaoke" estilo redes sociales.
 *
 * Muestra el texto hablado y RESALTA la palabra que se está pronunciando en cada
 * frame, usando `wordTimestamps` (timestamps relativos a la escena). Las palabras
 * ya dichas quedan a color base; la activa cambia de color y crece; las que faltan
 * pueden atenuarse.
 *
 * Determinista: depende solo de `frame` + props. Si no hay `wordTimestamps`,
 * degrada a un subtítulo estático (todo el texto a color base).
 */
export const WordHighlight: React.FC<WordHighlightProps> = ({
  text,
  color = '#FFFFFF',
  highlightColor = '#fbbf24',
  x = 540,
  y = 960,
  fontSize = 84,
  fontWeight = 900,
  width,
  activeScale = 1.08,
  dimUpcoming = true,
  wordTimestamps,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: canvasWidth, height: canvasHeight } = useVideoConfig();

  const effectiveWidth = width || Math.min(900, Math.floor(canvasWidth * 0.85));

  const fitted = fitText(text, effectiveWidth, Math.floor(canvasHeight * 0.5), {
    minFontSize: 48,
    maxFontSize: fontSize || 84,
    fontWeight,
    lineHeight: 1.25,
    padding: 20,
  });
  const actualFontSize = fitted.fontSize;

  const words = text.split(' ');
  const hasKaraoke = !!(wordTimestamps && wordTimestamps.length > 0);

  // Índice de la palabra activa (la que suena ahora). Si estamos en un hueco
  // entre palabras, se mantiene activa la última que empezó.
  const tSec = Math.max(0, frame - Math.round(delay * fps)) / fps;
  let activeIndex = -1;
  if (hasKaraoke) {
    for (let i = 0; i < wordTimestamps!.length; i++) {
      if (wordTimestamps![i].start <= tSec) activeIndex = i;
      else break;
    }
    // si la activa ya terminó hace rato y no hay siguiente, sigue siendo la última
    const cur = wordTimestamps![activeIndex];
    if (cur && tSec >= cur.end && activeIndex < wordTimestamps!.length - 1) {
      // entre palabras: la siguiente aún no empieza → mantener la última dicha
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
        width: `${effectiveWidth}px`,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        alignContent: 'center',
        gap: `${Math.max(12, actualFontSize * 0.34)}px`,
        zIndex: 10,
        textAlign: 'center',
      }}
    >
      {words.map((word, index) => {
        const isActive = hasKaraoke && index === activeIndex;
        const isUpcoming = hasKaraoke && activeIndex !== -1 && index > activeIndex;

        const wordColor = isActive ? highlightColor : color;
        const scale = isActive ? activeScale : 1;
        // Fase 3 (§10.10): el dim a 0.4 dejaba las palabras casi ilegibles sobre
        // fondos oscuros. 0.55 mantiene la jerarquía sin perder legibilidad.
        const opacity = isUpcoming && dimUpcoming ? 0.55 : 1;

        return (
          <span
            key={index}
            style={{
              color: wordColor,
              fontSize: actualFontSize,
              fontWeight,
              opacity,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              display: 'inline-block',
              fontFamily: 'Inter, system-ui, sans-serif',
              textShadow: TEXT_HALO,
              wordBreak: 'break-word',
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
