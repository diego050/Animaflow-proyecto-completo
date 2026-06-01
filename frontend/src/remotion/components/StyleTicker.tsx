import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface StyleTickerProps extends UniversalProps {
  text?: string;
  speed?: number;
  separator?: string;
  style?: Record<string, unknown>;
}

export const StyleTicker: React.FC<StyleTickerProps> = ({
  x = 540,
  y = 1800,
  text = 'BTC $45,230 \u2022 ETH $3,120 \u2022 SOL $98 \u2022 AAPL $178 \u2022 TSLA $245',
  speed = 2,
  separator = ' \u2022 ',
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const tickerWidth = 2000;
  const offset = interpolate(adjustedFrame, [0, tickerWidth / speed], [0, -tickerWidth], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.linear,
  });

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const repeatedText = `${text}${separator}${text}${separator}${text}`;

  const customFontSize = style?.fontSize ?? 16;
  const customFontWeight = style?.fontWeight ?? 600;
  const customColor = style?.color ?? '#E2E8F0';
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;
  const customBg = style?.backgroundColor ?? 'rgba(15, 23, 42, 0.8)';
  const customPadding = style?.padding ? `${style.padding}px` : '12px 24px';
  const customBorderRadius = style?.borderRadius ?? 8;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translateX(${offset}px)`,
        opacity: customOpacity,
        zIndex: 50,
        whiteSpace: 'nowrap',
        backgroundColor: customBg,
        padding: customPadding,
        borderRadius: `${customBorderRadius}px`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: customFontWeight, fontSize: `${customFontSize}px`, color: customColor }}>
        {repeatedText}
      </span>
    </div>
  );
};
