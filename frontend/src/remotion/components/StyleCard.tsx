import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface StyleCardProps extends UniversalProps {
  title?: string;
  subtitle?: string;
  variant?: 'elevated' | 'filled' | 'outlined' | 'glass';
  width?: number;
  height?: number;
  /** Colores y tamaños de texto. */
  titleColor?: string;
  subtitleColor?: string;
  titleSize?: number;
  subtitleSize?: number;
  /** Borde / forma. */
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  /** Sombra. */
  shadow?: boolean;
  /** Padding interior (px). */
  padding?: number;
  /** Entrada propia. false / disableEntry = la controla el wrapper. */
  animateIn?: boolean;
  style?: Record<string, unknown>;
  children?: React.ReactNode;
}

const variantMap = {
  elevated: { bg: '#1E293B', borderColor: '#334155', borderWidth: 1, shadow: true, blur: false },
  filled: { bg: '#1E293B', borderColor: 'transparent', borderWidth: 0, shadow: false, blur: false },
  outlined: { bg: 'transparent', borderColor: '#334155', borderWidth: 2, shadow: false, blur: false },
  glass: { bg: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(51, 65, 85, 0.5)', borderWidth: 1, shadow: true, blur: true },
};

export const StyleCard: React.FC<StyleCardProps> = ({
  x = 540,
  y = 960,
  title,
  subtitle,
  variant = 'elevated',
  width,
  height,
  bgColor,
  titleColor = '#FFFFFF',
  subtitleColor = '#94A3B8',
  titleSize,
  subtitleSize,
  borderColor,
  borderWidth,
  borderRadius,
  shadow,
  padding,
  animateIn = true,
  disableEntry = false,
  delay = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);
  const defaultWidth = c.isLandscape ? c.vw(42) : c.vw(80);

  const showEntry = animateIn && !disableEntry;
  const translateY = showEntry ? interpolate(adjustedFrame, [0, 20], [c.vmin(3), 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }) : 0;
  const opacity = showEntry ? interpolate(adjustedFrame, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;

  const v = variantMap[variant];
  const bg = bgColor || v.bg;
  const bColor = borderColor || v.borderColor;
  const bWidth = borderWidth && borderWidth > 0 ? borderWidth : v.borderWidth;
  const radius = borderRadius && borderRadius > 0 ? borderRadius : c.vmin(1.4);
  const pad = padding && padding > 0 ? padding : c.vmin(2.6);
  const showShadow = shadow ?? v.shadow;
  const blur = v.blur ? 'blur(12px)' : undefined;
  const tSize = titleSize && titleSize > 0 ? titleSize : c.vmin(4);
  const sSize = subtitleSize && subtitleSize > 0 ? subtitleSize : c.vmin(2.4);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) translateY(${translateY}px)`,
        width: width && width > 0 ? `${width}px` : `${defaultWidth}px`,
        height: height && height > 0 ? `${height}px` : 'auto',
        padding: `${pad}px`,
        backgroundColor: bg,
        borderRadius: `${radius}px`,
        border: bWidth > 0 ? `${bWidth}px solid ${bColor}` : 'none',
        boxShadow: showShadow ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
        zIndex: 50,
        opacity,
        backdropFilter: blur,
        WebkitBackdropFilter: blur,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: `${c.vmin(0.8)}px`,
        overflow: 'hidden',
      }}
    >
      {title && (
        <div style={{ fontFamily: 'Inter Tight, sans-serif', fontWeight: 700, fontSize: `${tSize}px`, color: titleColor, letterSpacing: '-0.5px', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
          {title}
        </div>
      )}
      {subtitle && (
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: `${sSize}px`, color: subtitleColor, lineHeight: 1.5, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
          {subtitle}
        </div>
      )}
      {children}
    </div>
  );
};
