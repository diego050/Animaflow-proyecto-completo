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
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // Tamaños derivados del lienzo (Fase 2): mismo tamaño físico en 9:16/1:1/16:9
  // y escalado por resolución (720p/4K). vmin equivale a los px previos en 1080.
  const sizeMap = {
    sm: { padding: `${c.vmin(0.9)}px ${c.vmin(2)}px`, fontSize: c.vmin(2.6) },
    md: { padding: `${c.vmin(1.3)}px ${c.vmin(2.8)}px`, fontSize: c.vmin(3.5) },
    lg: { padding: `${c.vmin(1.7)}px ${c.vmin(3.7)}px`, fontSize: c.vmin(4.4) },
  };

  // Entrance: scale bounce
  const scale = interpolate(adjustedFrame, [0, 8, 12, 16], [0, 1.15, 0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(adjustedFrame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const v = variantMap[variant];
  const s = sizeMap[size];

  // Style overrides
  const customPadding = style?.padding ? `${style.padding}px` : s.padding;
  const customBorderRadius = (style?.borderRadius as number) ?? 999;
  const customBg = (style?.backgroundColor as string) ?? v.bg;
  const customColor = (style?.color as string) ?? v.color;
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;
  const customBorderWidth = style?.borderWidth ? `${style.borderWidth}px` : '0px';
  const customBorderColor = (style?.borderColor as string) ?? 'transparent';
  const customBorderStyle = (style?.borderStyle as string) ?? 'solid';
  const customBoxShadow = style?.boxShadow ? `${(style.boxShadow as Record<string, unknown>).x || 0}px ${(style.boxShadow as Record<string, unknown>).y || 2}px ${(style.boxShadow as Record<string, unknown>).blur || 8}px ${(style.boxShadow as Record<string, unknown>).spread || 0}px ${(style.boxShadow as Record<string, unknown>).color || 'rgba(0,0,0,0.2)'}` : `0 ${c.vmin(0.2)}px ${c.vmin(0.8)}px rgba(0,0,0,0.2)`;

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
        gap: `${c.vmin(0.6)}px`,
        zIndex: 50,
        opacity: customOpacity,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}
    >
      {icon && <IconifyIcon icon={icon} size={s.fontSize} color={customColor} />}
      {text}
    </div>
  );
};
