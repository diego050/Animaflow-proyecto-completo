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
  iconColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  /** Sombra. */
  shadow?: boolean;
  /** Entrada propia. false / disableEntry = la controla el wrapper. */
  animateIn?: boolean;
  style?: Record<string, unknown>;
}

const variantMap = {
  primary: { bg: '#2C3E50', color: '#FFFFFF', border: false },
  secondary: { bg: '#FF8C00', color: '#FFFFFF', border: false },
  ghost: { bg: 'transparent', color: '#2C3E50', border: false },
  outline: { bg: 'transparent', color: '#2C3E50', border: true },
};

export const StyleButton: React.FC<StyleButtonProps> = ({
  x = 540,
  y = 960,
  text = 'Click Here',
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  bgColor,
  textColor,
  iconColor,
  fontSize,
  width,
  height,
  borderWidth = 0,
  borderColor,
  borderRadius,
  shadow = true,
  animateIn = true,
  disableEntry = false,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const sizeMap = {
    sm: { padding: `${c.vmin(1.1)}px ${c.vmin(2.6)}px`, fontSize: c.vmin(2.96), borderRadius: c.vmin(0.93) },
    md: { padding: `${c.vmin(1.5)}px ${c.vmin(3.3)}px`, fontSize: c.vmin(3.7), borderRadius: c.vmin(1.3) },
    lg: { padding: `${c.vmin(2)}px ${c.vmin(4.4)}px`, fontSize: c.vmin(4.8), borderRadius: c.vmin(1.67) },
  };
  const s = sizeMap[size];
  const v = variantMap[variant];

  const showEntry = animateIn && !disableEntry;
  const scale = showEntry
    ? interpolate(adjustedFrame, [0, 15], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5)) })
    : 1;
  const opacity = showEntry
    ? interpolate(adjustedFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;

  const bg = bgColor || v.bg;
  const fg = textColor || v.color;
  const ic = iconColor || fg;
  const fs = fontSize && fontSize > 0 ? fontSize : s.fontSize;
  const radius = borderRadius && borderRadius > 0 ? borderRadius : s.borderRadius;
  // Borde: explícito por borderWidth, o el del preset 'outline'.
  const showBorder = borderWidth > 0 || v.border;
  const bWidth = borderWidth > 0 ? borderWidth : 2;
  const bColor = borderColor || fg;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        padding: s.padding,
        width: width && width > 0 ? `${width}px` : undefined,
        height: height && height > 0 ? `${height}px` : undefined,
        backgroundColor: bg,
        color: fg,
        borderRadius: `${radius}px`,
        border: showBorder ? `${bWidth}px solid ${bColor}` : 'none',
        boxShadow: shadow ? `0 ${c.vmin(0.9)}px ${c.vmin(2.8)}px rgba(0,0,0,0.3)` : 'none',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        fontSize: `${fs}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${c.vmin(0.8)}px`,
        zIndex: 50,
        opacity,
        cursor: 'default',
        boxSizing: 'border-box',
      }}
    >
      {icon && iconPosition === 'left' && <IconifyIcon icon={icon} size={fs} color={ic} inline />}
      {text}
      {icon && iconPosition === 'right' && <IconifyIcon icon={icon} size={fs} color={ic} inline />}
    </div>
  );
};
