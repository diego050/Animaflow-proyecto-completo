import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { IconifyIcon } from './IconifyIcon';
import { useCanvas } from '../utils/canvas';

interface StyleBadgeProps extends UniversalProps {
  text?: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Color del ícono (vacío = color del texto). */
  iconColor?: string;
  /** Borde. */
  borderWidth?: number;
  borderColor?: string;
  /** Radio de borde en px (default 999 = píldora). */
  borderRadius?: number;
  /** Ancho máximo (px). >0 permite salto de línea. 0 = una línea. */
  width?: number;
  /** Texto en mayúsculas. */
  uppercase?: boolean;
  /** Mostrar sombra. */
  shadow?: boolean;
  /** Reproducir la entrada propia (rebote). false / disableEntry = la controla el wrapper. */
  animateIn?: boolean;
  style?: Record<string, unknown>;
}

const variantMap = {
  success: { bg: '#00FFAB', color: '#0F172A' },
  warning: { bg: '#FF8C00', color: '#0F172A' },
  error: { bg: '#EF4444', color: '#FFFFFF' },
  info: { bg: '#3B82F6', color: '#FFFFFF' },
  neutral: { bg: '#334155', color: '#E2E8F0' },
};

export const StyleBadge: React.FC<StyleBadgeProps> = ({
  x = 540,
  y = 200,
  text = 'Badge',
  variant = 'neutral',
  icon,
  size = 'md',
  bgColor,
  textColor,
  iconColor,
  fontSize,
  borderWidth = 0,
  borderColor = 'transparent',
  borderRadius,
  width = 0,
  uppercase = true,
  shadow = true,
  animateIn = true,
  disableEntry = false,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const sizeMap = {
    sm: { padding: `${c.vmin(0.9)}px ${c.vmin(2)}px`, fontSize: c.vmin(2.6) },
    md: { padding: `${c.vmin(1.3)}px ${c.vmin(2.8)}px`, fontSize: c.vmin(3.5) },
    lg: { padding: `${c.vmin(1.7)}px ${c.vmin(3.7)}px`, fontSize: c.vmin(4.4) },
  };
  const s = sizeMap[size];
  const v = variantMap[variant];

  const showEntry = animateIn && !disableEntry;
  const scale = showEntry
    ? interpolate(adjustedFrame, [0, 8, 12, 16], [0, 1.15, 0.95, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
    : 1;
  const opacity = showEntry
    ? interpolate(adjustedFrame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;

  const bg = bgColor || v.bg;
  const fg = textColor || v.color;
  const ic = iconColor || fg;
  const fs = fontSize && fontSize > 0 ? fontSize : s.fontSize;
  const radius = borderRadius ?? 999;
  const hasMax = width > 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        padding: s.padding,
        backgroundColor: bg,
        color: fg,
        borderRadius: `${radius}px`,
        border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
        boxShadow: shadow ? `0 ${c.vmin(0.2)}px ${c.vmin(0.8)}px rgba(0,0,0,0.2)` : 'none',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        fontSize: `${fs}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${c.vmin(0.6)}px`,
        zIndex: 50,
        opacity,
        letterSpacing: '0.5px',
        textTransform: uppercase ? 'uppercase' : 'none',
        maxWidth: hasMax ? `${width}px` : undefined,
        whiteSpace: hasMax ? 'normal' : 'nowrap',
        wordBreak: 'break-word',
        textAlign: 'center',
      }}
    >
      {icon && <IconifyIcon icon={icon} size={fs} color={ic} inline />}
      {text}
    </div>
  );
};
