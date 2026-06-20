import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { IconifyIcon } from './IconifyIcon';
import { useCanvas } from '../utils/canvas';

interface StyleChipProps extends UniversalProps {
  text?: string;
  icon?: string;
  deletable?: boolean;
  variant?: 'filled' | 'outlined' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  iconColor?: string;
  /** Color de la X de borrar. */
  closeColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  /** Ancho máximo (px). >0 permite salto de línea. */
  width?: number;
  /** Entrada propia. false / disableEntry = la controla el wrapper. */
  animateIn?: boolean;
  style?: Record<string, unknown>;
}

const variantMap = {
  filled: { bg: '#334155', color: '#E2E8F0', borderColor: 'transparent', borderWidth: 0 },
  outlined: { bg: 'transparent', color: '#E2E8F0', borderColor: '#475569', borderWidth: 1 },
  soft: { bg: 'rgba(51, 65, 85, 0.4)', color: '#E2E8F0', borderColor: 'rgba(71, 85, 105, 0.3)', borderWidth: 1 },
};

export const StyleChip: React.FC<StyleChipProps> = ({
  x = 540,
  y = 400,
  text = 'Chip',
  icon,
  deletable = false,
  variant = 'filled',
  size = 'md',
  bgColor,
  textColor,
  iconColor,
  closeColor,
  fontSize,
  borderWidth,
  borderColor,
  borderRadius,
  width = 0,
  animateIn = true,
  disableEntry = false,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const sizeMap = {
    sm: { padding: `${c.vmin(0.75)}px ${c.vmin(1.7)}px`, fontSize: c.vmin(2.2) },
    md: { padding: `${c.vmin(0.95)}px ${c.vmin(2.2)}px`, fontSize: c.vmin(2.8) },
    lg: { padding: `${c.vmin(1.3)}px ${c.vmin(2.8)}px`, fontSize: c.vmin(3.3) },
  };
  const s = sizeMap[size];
  const v = variantMap[variant];

  const showEntry = animateIn && !disableEntry;
  const scale = showEntry ? interpolate(adjustedFrame, [0, 12], [0.7, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.2)) }) : 1;
  const opacity = showEntry ? interpolate(adjustedFrame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;

  const bg = bgColor || v.bg;
  const fg = textColor || v.color;
  const ic = iconColor || fg;
  const close = closeColor || fg;
  const fs = fontSize && fontSize > 0 ? fontSize : s.fontSize;
  const bWidth = borderWidth && borderWidth > 0 ? borderWidth : v.borderWidth;
  const bColor = borderColor || v.borderColor;
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
        border: bWidth > 0 ? `${bWidth}px solid ${bColor}` : 'none',
        boxShadow: `0 ${c.vmin(0.2)}px ${c.vmin(0.8)}px rgba(0,0,0,0.15)`,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        fontSize: `${fs}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${c.vmin(0.6)}px`,
        zIndex: 50,
        opacity,
        maxWidth: hasMax ? `${width}px` : undefined,
        whiteSpace: hasMax ? 'normal' : 'nowrap',
        wordBreak: 'break-word',
        textAlign: 'center',
      }}
    >
      {icon && <IconifyIcon icon={icon} size={fs} color={ic} inline />}
      {text}
      {deletable && (
        <span style={{ marginLeft: c.vmin(0.4), opacity: 0.7, fontSize: fs * 0.85, color: close, lineHeight: 1 }}>✕</span>
      )}
    </div>
  );
};
