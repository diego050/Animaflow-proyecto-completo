import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { IconifyIcon } from './IconifyIcon';

interface StyleChipProps extends UniversalProps {
  text?: string;
  icon?: string;
  deletable?: boolean;
  variant?: 'filled' | 'outlined' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  style?: Record<string, unknown>;
}

const sizeMap = {
  sm: { padding: '4px 10px', fontSize: 12, iconSize: 14 },
  md: { padding: '6px 14px', fontSize: 14, iconSize: 16 },
  lg: { padding: '8px 18px', fontSize: 16, iconSize: 18 },
};

const variantMap = {
  filled: { bg: '#334155', color: '#E2E8F0', border: 'none' },
  outlined: { bg: 'transparent', color: '#E2E8F0', border: '1px solid #475569' },
  soft: { bg: 'rgba(51, 65, 85, 0.4)', color: '#E2E8F0', border: '1px solid rgba(71, 85, 105, 0.3)' },
};

export const StyleChip: React.FC<StyleChipProps> = ({
  x = 540,
  y = 400,
  text = 'Chip',
  icon,
  deletable = false,
  variant = 'filled',
  size = 'md',
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance: scale + fade
  const scale = interpolate(adjustedFrame, [0, 12], [0.7, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.2)),
  });

  const opacity = interpolate(adjustedFrame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const s = sizeMap[size];
  const v = variantMap[variant];

  // Style overrides
  const customPadding = style?.padding ? `${style.padding}px` : s.padding;
  const customBorderRadius = (style?.borderRadius as number) ?? 999;
  const customBg = (style?.backgroundColor as string) ?? v.bg;
  const customColor = (style?.color as string) ?? v.color;
  const customBorderWidth = style?.borderWidth ? `${style.borderWidth}px` : (v.border === 'none' ? '0px' : v.border.split(' ')[0]);
  const customBorderColor = (style?.borderColor as string) ?? (v.border === 'none' ? 'transparent' : v.border.split(' ')[2]);
  const customBorderStyle = (style?.borderStyle as string) ?? 'solid';
  const customBoxShadow = style?.boxShadow ? `${(style.boxShadow as Record<string, unknown>).x || 0}px ${(style.boxShadow as Record<string, unknown>).y || 2}px ${(style.boxShadow as Record<string, unknown>).blur || 8}px ${(style.boxShadow as Record<string, unknown>).spread || 0}px ${(style.boxShadow as Record<string, unknown>).color || 'rgba(0,0,0,0.2)'}` : '0 2px 8px rgba(0,0,0,0.15)';
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
        fontWeight: 500,
        fontSize: `${s.fontSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        zIndex: 50,
        opacity: customOpacity,
      }}
    >
      {icon && <IconifyIcon icon={icon} size={s.iconSize} color={customColor} />}
      {text}
      {deletable && (
        <span style={{ marginLeft: 2, opacity: 0.6, fontSize: s.fontSize }}>✕</span>
      )}
    </div>
  );
};
