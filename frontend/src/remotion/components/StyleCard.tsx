import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface StyleCardProps extends UniversalProps {
  title?: string;
  subtitle?: string;
  variant?: 'elevated' | 'filled' | 'outlined' | 'glass';
  width?: number;
  height?: number;
  style?: Record<string, unknown>;
  children?: React.ReactNode;
}

const variantMap = {
  elevated: { bg: '#1E293B', border: '1px solid #334155', shadow: '0 8px 32px rgba(0,0,0,0.4)' },
  filled: { bg: '#1E293B', border: 'none', shadow: 'none' },
  outlined: { bg: 'transparent', border: '2px solid #334155', shadow: 'none' },
  glass: { bg: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(51, 65, 85, 0.5)', shadow: '0 8px 32px rgba(0,0,0,0.2)', backdropBlur: 'blur(12px)' },
};

export const StyleCard: React.FC<StyleCardProps> = ({
  x = 540,
  y = 960,
  title,
  subtitle,
  variant = 'elevated',
  width = 400,
  height,
  style,
  delay = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance: slide up + fade
  const translateY = interpolate(adjustedFrame, [0, 20], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const v = variantMap[variant];

  // Style overrides
  const customPadding = style?.padding ? `${style.padding}px` : '24px';
  const customBorderRadius = (style?.borderRadius as number) ?? 12;
  const customBg = (style?.backgroundColor as string) ?? v.bg;
  const customBorderWidth = style?.borderWidth ? `${style.borderWidth}px` : (v.border === 'none' ? '0px' : v.border.split(' ')[0]);
  const customBorderColor = (style?.borderColor as string) ?? (v.border === 'none' ? 'transparent' : v.border.split(' ')[2]);
  const customBorderStyle = (style?.borderStyle as string) ?? 'solid';
  const customBoxShadow = style?.boxShadow ? `${(style.boxShadow as Record<string, unknown>).x || 0}px ${(style.boxShadow as Record<string, unknown>).y || 8}px ${(style.boxShadow as Record<string, unknown>).blur || 32}px ${(style.boxShadow as Record<string, unknown>).spread || 0}px ${(style.boxShadow as Record<string, unknown>).color || 'rgba(0,0,0,0.4)'}` : v.shadow;
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;
  const customWidth = style?.width ? `${style.width}px` : `${width}px`;
  const customHeight = height ? `${height}px` : (style?.height ? `${style.height}px` : 'auto');
  const customBackdropBlur = style?.backdropBlur ? `blur(${style.backdropBlur}px)` : ((v as Record<string, unknown>).backdropBlur as string | undefined);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) translateY(${translateY}px)`,
        width: customWidth,
        height: customHeight,
        padding: customPadding,
        backgroundColor: customBg,
        borderRadius: `${customBorderRadius}px`,
        borderWidth: customBorderWidth,
        borderColor: customBorderColor,
        borderStyle: customBorderStyle,
        boxShadow: customBoxShadow,
        zIndex: 50,
        opacity: customOpacity,
        backdropFilter: customBackdropBlur,
        WebkitBackdropFilter: customBackdropBlur,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        overflow: style?.overflow === 'hidden' ? 'hidden' : 'visible',
      }}
    >
      {title && (
        <div style={{ fontFamily: 'Inter Tight, sans-serif', fontWeight: 700, fontSize: 24, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
          {title}
        </div>
      )}
      {subtitle && (
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 14, color: '#94A3B8', lineHeight: 1.5 }}>
          {subtitle}
        </div>
      )}
      {children}
    </div>
  );
};
