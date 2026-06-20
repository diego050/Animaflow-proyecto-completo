import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { fitText } from '../utils/fitText';
import type { UniversalProps } from "./types";

export interface WordTiming {
  word: string;
  start: number; // segundos, relativo al inicio de la escena
  end: number;
}

export interface TextRevealProps extends UniversalProps {
  text: string;
  animation?: 'fade' | 'blur' | 'slide_up';
  glowIntensity?: number;
  width?: number;
  /** Frames entre la entrada de cada palabra (sin timestamps). */
  stagger?: number;
  wordTimestamps?: WordTiming[];
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text = 'Texto que aparece',
  color = '#ffffff',
  animation = 'slide_up',
  glowIntensity = 0.5,
  x = 540,
  y = 960,
  fontSize = 60,
  width,  // Remove hardcoded default
  stagger = 3,
  delay = 0,
  wordTimestamps,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps, width: canvasWidth, height: canvasHeight } = useVideoConfig();

  const safeText = text ?? '';
  const hasKaraoke = !!(wordTimestamps && wordTimestamps.length > 0);

  // Calculate effective container width
  const effectiveWidth = width || Math.min(900, Math.floor(canvasWidth * 0.85));

  // Auto-scale fontSize to fit text
  const fitted = fitText(safeText, effectiveWidth, Math.floor(canvasHeight * 0.5), {
    minFontSize: 48,
    maxFontSize: fontSize || 60,
    fontWeight: 900,
    lineHeight: 1.4,
    padding: 20,
  });
  const actualFontSize = fitted.fontSize;

  const words = safeText.split(' ');

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${effectiveWidth}px`,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'center',
        alignContent: 'center',
        gap: `${Math.max(10, actualFontSize * 0.3)}px`,
        zIndex: 10,
        textAlign: 'left',
      }}
    >
      {words.map((word, index) => {
        // v7.3: KARAOKE — si hay timestamps, cada palabra entra cuando se
        // pronuncia (mapeo por índice, clamp al último). Si no, stagger fijo.
        let wordStartFrame: number;
        let baseFrame: number;
        if (hasKaraoke) {
          const ts = wordTimestamps![Math.min(index, wordTimestamps!.length - 1)];
          wordStartFrame = Math.round((ts?.start ?? 0) * fps);
          baseFrame = frame; // timestamps son relativos al inicio de la escena (= audio)
        } else {
          wordStartFrame = index * Math.max(0, stagger);
          baseFrame = adjustedFrame;
        }
        const wordFrame = Math.max(0, baseFrame - wordStartFrame);

        // Spring animation from 0 to 1
        const progress = spring({
          fps,
          frame: wordFrame,
          config: {
            damping: 12,
            stiffness: 150,
          },
        });

        // Map progress to CSS properties
        const opacity = progress;
        
        let transform = 'none';
        let filter = 'none';

        if (animation === 'slide_up') {
          const y = interpolate(progress, [0, 1], [50, 0]);
          transform = `translateY(${y}px)`;
        } else if (animation === 'blur') {
          const blur = interpolate(progress, [0, 1], [20, 0]);
          filter = `blur(${blur}px)`;
        }

        const textShadow = glowIntensity > 0 
            ? `0 4px 20px rgba(0,0,0,0.8), 0 0 30px ${color}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`
            : '0 4px 20px rgba(0,0,0,0.8)';

        return (
          <span
            key={index}
            style={{
              color,
              fontSize: actualFontSize,
              fontWeight: 900,
              opacity,
              transform,
              filter,
              textShadow,
              fontFamily: 'Inter, system-ui, sans-serif',
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
