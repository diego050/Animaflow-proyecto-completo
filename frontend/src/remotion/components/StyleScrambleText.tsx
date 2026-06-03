import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface StyleScrambleTextProps extends UniversalProps {
  text?: string;
  speed?: number;
  characters?: string;
  loop?: boolean;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  style?: Record<string, unknown>;
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
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const totalFrames = Math.ceil(text.length / speed) + 10;
  const progress = Math.min(adjustedFrame / totalFrames, 1);
  const revealedChars = Math.floor(progress * text.length);

  const opacity = interpolate(adjustedFrame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const displayText = useMemo(() => {
    return text.split('').map((char, i) => {
      if (i < revealedChars) return char;
      if (char === ' ') return ' ';
      return characters[Math.floor(Math.random() * characters.length)];
    }).join('');
  }, [revealedChars, text, characters]);

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
        textTransform: 'uppercase',
      }}
    >
      {displayText}
    </div>
  );
};
