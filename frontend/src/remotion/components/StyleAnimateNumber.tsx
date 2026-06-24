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
  fontWeight?: number;
  letterSpacing?: number;
  /** Texto opcional debajo del número (ej. "usuarios activos"). */
  caption?: string;
  captionColor?: string;
  captionSize?: number;
  /** Legacy: objeto de estilo (los props planos tienen prioridad). */
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
  color = '#FFFFFF',
  fontSize = 96,
  fontWeight = 700,
  letterSpacing = -1,
  caption = '',
  captionColor = '#94A3B8',
  captionSize = 0,
  opacity: opacityProp = 1,
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

  const entryOpacity = interpolate(adjustedFrame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const displayText = useMemo(() => formatNumber(animatedValue, format, decimals, prefix, suffix), [animatedValue, format, decimals, prefix, suffix]);

  // Props planos tienen prioridad; `style` queda como fallback legacy.
  const finalColor = color ?? (style?.color as string) ?? '#FFFFFF';
  const finalFontFamily = (style?.fontFamily as string) ?? 'Inter Tight, sans-serif';
  const capSize = captionSize && captionSize > 0 ? captionSize : fontSize * 0.28;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: `${fontSize * 0.12}px`,
        zIndex: 50,
        opacity: entryOpacity * opacityProp,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: finalFontFamily,
          fontWeight,
          fontSize: `${fontSize}px`,
          color: finalColor,
          letterSpacing: `${letterSpacing}px`,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {displayText}
      </div>
      {caption ? (
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: `${capSize}px`, color: captionColor }}>
          {caption}
        </div>
      ) : null}
    </div>
  );
};
