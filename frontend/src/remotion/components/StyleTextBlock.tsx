import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface StyleTextBlockProps extends UniversalProps {
  text?: string;
  variant?: 'heading' | 'body' | 'caption' | 'quote';
  align?: 'left' | 'center' | 'right';
  maxLines?: number;
  width?: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  style?: Record<string, unknown>;
}

// v7: defaults grandes para VIDEO VERTICAL móvil (1080px). Los valores previos
// (heading 32 / body 16) eran de UI web y dejaban el texto ilegible en video.
const variantMap = {
  heading: { fontSize: 88, fontWeight: 800, lineHeight: 1.15, color: '#FFFFFF', letterSpacing: '-0.5px' },
  body: { fontSize: 56, fontWeight: 500, lineHeight: 1.4, color: '#E2E8F0', letterSpacing: '0' },
  caption: { fontSize: 36, fontWeight: 400, lineHeight: 1.4, color: '#94A3B8', letterSpacing: '0.2px' },
  quote: { fontSize: 60, fontWeight: 400, lineHeight: 1.4, color: '#CBD5E1', letterSpacing: '-0.2px', fontStyle: 'italic' },
};

export const StyleTextBlock: React.FC<StyleTextBlockProps> = ({
  x = 540,
  y = 400,
  text = 'Text block content goes here',
  variant = 'heading',
  align = 'center',
  maxLines,
  width = 400,
  fontSize,
  fontWeight,
  color,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance: fade + slide up
  const translateY = interpolate(adjustedFrame, [0, 15], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(adjustedFrame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const v = variantMap[variant];

  // Style overrides — prioridad: prop top-level > style.* > default del variant.
  // v7: el backend escribe fontSize/color/fontWeight como props top-level
  // (auto-fit, fontSize>=64). Antes solo se leía style.* y se ignoraban → 32px.
  const resolvedFontSize = fontSize ?? (style?.fontSize as number | undefined) ?? v.fontSize;
  const customFontSize = `${resolvedFontSize}px`;
  const customFontWeight = fontWeight ?? (style?.fontWeight as number) ?? v.fontWeight;
  const customLineHeight = (style?.lineHeight as number) ?? v.lineHeight;
  const customColor = color ?? (style?.color as string) ?? v.color;
  const customLetterSpacing = style?.letterSpacing ? `${style.letterSpacing}px` : `${v.letterSpacing}px`;
  const customTextAlign = (style?.textAlign as React.CSSProperties['textAlign']) ?? align;
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;
  const customWidth = style?.width ? `${style.width}px` : `${width}px`;
  const customTextShadow = style?.textShadow ? `${(style.textShadow as Record<string, unknown>).x || 0}px ${(style.textShadow as Record<string, unknown>).y || 0}px ${(style.textShadow as Record<string, unknown>).blur || 4}px ${(style.textShadow as Record<string, unknown>).color || 'rgba(0,0,0,0.5)'}` : 'none';
  const customTextDecoration = (style?.textDecoration as React.CSSProperties['textDecoration']) ?? 'none';
  const customFontStyle = variant === 'quote' ? 'italic' : ((style?.fontStyle as string) ?? 'normal');

  const webkitLineClamp = maxLines ? {
    WebkitLineClamp: maxLines,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    display: '-webkit-box',
  } : {};

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) translateY(${translateY}px)`,
        width: customWidth,
        fontFamily: variant === 'heading' ? 'Inter Tight, sans-serif' : 'Inter, sans-serif',
        fontWeight: customFontWeight,
        fontSize: customFontSize,
        lineHeight: customLineHeight,
        color: customColor,
        letterSpacing: customLetterSpacing,
        textAlign: customTextAlign as React.CSSProperties['textAlign'],
        fontStyle: customFontStyle,
        textDecoration: customTextDecoration,
        textShadow: customTextShadow,
        zIndex: 50,
        opacity: customOpacity,
        ...webkitLineClamp,
      }}
    >
      {text}
    </div>
  );
};
