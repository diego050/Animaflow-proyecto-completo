import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface StyleAnimateNumberProps extends UniversalProps {
  value?: number;
  from?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  format?: 'number' | 'currency' | 'percentage' | 'compact';
  duration?: number;
  style?: Record<string, unknown>;
}

function formatNumber(val: number, format: string, decimals: number, prefix: string, suffix: string): string {
  let formatted: string;
  if (format === 'currency') {
    formatted = val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${prefix}$${formatted}${suffix}`;
  }
  if (format === 'percentage') {
    formatted = val.toFixed(decimals);
    return `${prefix}${formatted}%${suffix}`;
  }
  if (format === 'compact') {
    if (val >= 1000000) return `${prefix}${(val / 1000000).toFixed(1)}M${suffix}`;
    if (val >= 1000) return `${prefix}${(val / 1000).toFixed(1)}K${suffix}`;
    formatted = val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return `${prefix}${formatted}${suffix}`;
  }
  formatted = val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${prefix}${formatted}${suffix}`;
}

export const StyleAnimateNumber: React.FC<StyleAnimateNumberProps> = ({
  x = 540,
  y = 400,
  value = 100,
  from = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  format = 'number',
  duration = 60,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const animatedValue = interpolate(adjustedFrame, [0, duration], [from, value], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(adjustedFrame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const displayText = useMemo(() => formatNumber(animatedValue, format, decimals, prefix, suffix), [animatedValue, format, decimals, prefix, suffix]);

  const customFontSize = (style?.fontSize as number) ?? 48;
  const customFontWeight = (style?.fontWeight as number) ?? 700;
  const customColor = (style?.color as string) ?? '#FFFFFF';
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;
  const customLetterSpacing = style?.letterSpacing ? `${style.letterSpacing}px` : '-1px';
  const customFontFamily = (style?.fontFamily as string) ?? 'Inter Tight, sans-serif';

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
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {displayText}
    </div>
  );
};
