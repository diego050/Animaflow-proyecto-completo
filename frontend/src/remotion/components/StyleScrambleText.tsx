import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface StyleScrambleTextProps extends UniversalProps {
  text?: string;
  speed?: number;
  characters?: string;
  loop?: boolean;
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

  const customFontSize = (style?.fontSize as number) ?? 32;
  const customFontWeight = (style?.fontWeight as number) ?? 700;
  const customColor = (style?.color as string) ?? '#00FFAB';
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
