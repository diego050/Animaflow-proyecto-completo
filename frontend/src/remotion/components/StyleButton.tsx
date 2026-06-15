import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { IconifyIcon } from './IconifyIcon';
import { useCanvas } from '../utils/canvas';

interface StyleButtonProps extends UniversalProps {
  text?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  style?: Record<string, unknown>;
}

const variantMap = {
  primary: { bg: '#2C3E50', color: '#FFFFFF', border: 'none' },
  secondary: { bg: '#FF8C00', color: '#FFFFFF', border: 'none' },
  ghost: { bg: 'transparent', color: '#2C3E50', border: 'none' },
  outline: { bg: 'transparent', color: '#2C3E50', border: '2px solid #2C3E50' },
};

export const StyleButton: React.FC<StyleButtonProps> = ({
  x = 540,
  y = 960,
  text = 'Click Here',
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // Tamaños derivados del lienzo (Fase 2). vmin equivale a los px previos en 1080.
  const sizeMap = {
    sm: { padding: `${c.vmin(1.1)}px ${c.vmin(2.6)}px`, fontSize: c.vmin(2.96), borderRadius: c.vmin(0.93) },
    md: { padding: `${c.vmin(1.5)}px ${c.vmin(3.3)}px`, fontSize: c.vmin(3.7), borderRadius: c.vmin(1.3) },
    lg: { padding: `${c.vmin(2)}px ${c.vmin(4.4)}px`, fontSize: c.vmin(4.8), borderRadius: c.vmin(1.67) },
  };

  // Entrance animation: scale from 0.8 to 1, opacity 0 to 1
  const scale = interpolate(adjustedFrame, [0, 15], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.5)),
  });

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const s = sizeMap[size];
  const v = variantMap[variant];

  // Apply style overrides from LayerStyle
  const customPadding = style?.padding ? `${style.padding}px` : s.padding;
  const customBorderRadius = (style?.borderRadius as number) ?? s.borderRadius;
  const customBg = (style?.backgroundColor as string) ?? v.bg;
  const customColor = (style?.color as string) ?? v.color;
  const customBorderWidth = style?.borderWidth ? `${style.borderWidth}px` : (v.border === 'none' ? '0px' : v.border.split(' ')[0]);
  const customBorderColor = (style?.borderColor as string) ?? (v.border === 'none' ? 'transparent' : v.border.split(' ')[2]);
  const customBorderStyle = (style?.borderStyle as string) ?? 'solid';
  const customBoxShadow = style?.boxShadow ? `${(style.boxShadow as Record<string, unknown>).x || 0}px ${(style.boxShadow as Record<string, unknown>).y || 4}px ${(style.boxShadow as Record<string, unknown>).blur || 12}px ${(style.boxShadow as Record<string, unknown>).spread || 0}px ${(style.boxShadow as Record<string, unknown>).color || 'rgba(0,0,0,0.3)'}` : `0 ${c.vmin(0.9)}px ${c.vmin(2.8)}px rgba(0,0,0,0.3)`;
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        padding: customPadding,
        backgroundColor: customBg,
        color: customColor,
        borderRadius: `${customBorderRadius}px`,
        borderWidth: customBorderWidth,
        borderColor: customBorderColor,
        borderStyle: customBorderStyle,
        boxShadow: customBoxShadow,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        fontSize: `${s.fontSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${c.vmin(0.8)}px`,
        zIndex: 50,
        opacity: customOpacity,
        cursor: 'default',
      }}
    >
      {icon && iconPosition === 'left' && <IconifyIcon icon={icon} size={s.fontSize} color={customColor} />}
      {text}
      {icon && iconPosition === 'right' && <IconifyIcon icon={icon} size={s.fontSize} color={customColor} />}
    </div>
  );
};
