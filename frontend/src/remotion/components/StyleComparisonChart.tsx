import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from './types';
import { useCanvas } from '../utils/canvas';

interface StyleComparisonChartProps extends UniversalProps {
  beforeValue?: number;
  afterValue?: number;
  beforeLabel?: string;
  afterLabel?: string;
  beforeColor?: string;
  afterColor?: string;
  showTitle?: boolean;
  title?: string;
  maxValue?: number;
  barWidth?: number;
  style?: Record<string, unknown>;
}

export const StyleComparisonChart: React.FC<StyleComparisonChartProps> = ({
  x = 540,
  y = 960,
  beforeValue = 34,
  afterValue = 89,
  beforeLabel = 'Before',
  afterLabel = 'After',
  beforeColor = '#ef4444',
  afterColor = '#4361ee',
  showTitle = false,
  title = 'Performance Comparison',
  maxValue = 100,
  barWidth,
  opacity: opacityProp = 1,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // --- Animation timing ---
  // Card fade-in: frames 0-15
  const cardOpacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Before bar + value: frames 10-40
  const beforeCountValue = Math.round(
    interpolate(adjustedFrame, [10, 40], [0, beforeValue], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    })
  );
  const beforeBarHeight = interpolate(adjustedFrame, [10, 40], [0, (beforeValue / maxValue) * c.vmin(28)], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // After bar + value: frames 20-50 (starts 10 frames later)
  const afterCountValue = Math.round(
    interpolate(adjustedFrame, [20, 50], [0, afterValue], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    })
  );
  const afterBarHeight = interpolate(adjustedFrame, [20, 50], [0, (afterValue / maxValue) * c.vmin(28)], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Divider line: frames 0-20
  const dividerOpacity = interpolate(adjustedFrame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dividerHeight = interpolate(adjustedFrame, [0, 20], [0, c.vmin(30)], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Title: frames 20-30
  const titleOpacity = interpolate(adjustedFrame, [20, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // --- Layout sizing via useCanvas ---
  const cardWidth = c.vw(56);
  const cardPadding = c.vmin(4);
  const barW = barWidth ?? c.vmin(12);
  const gap = c.vmin(3);
  const valueFontSize = c.vmin(5);
  const labelFontSize = c.vmin(2.4);
  const titleFontSize = c.vmin(3);
  const dividerWidth = c.vmin(0.2);
  const borderRadius = c.vmin(1.6);
  const maxBarH = c.vmin(28);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        opacity: opacityProp * cardOpacity,
        zIndex: 50,
      }}
    >
      {/* Glassmorphic card container */}
      <div
        style={{
          width: `${cardWidth}px`,
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: `${borderRadius}px`,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          padding: `${cardPadding}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Title */}
        {showTitle && (
          <div
            style={{
              fontSize: `${titleFontSize}px`,
              fontWeight: 700,
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: `${c.vmin(3)}px`,
              opacity: titleOpacity,
              fontFamily: 'Inter Tight, sans-serif',
            }}
          >
            {title}
          </div>
        )}

        {/* Bars container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            height: `${maxBarH + c.vmin(8)}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {/* Before side */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
            }}
          >
            {/* Value */}
            <div
              style={{
                fontSize: `${valueFontSize}px`,
                fontWeight: 800,
                color: beforeColor,
                marginBottom: `${c.vmin(1.5)}px`,
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'Inter Tight, sans-serif',
              }}
            >
              {beforeCountValue}%
            </div>
            {/* Bar */}
            <div
              style={{
                width: `${barW}px`,
                height: `${beforeBarHeight}px`,
                backgroundColor: beforeColor,
                borderRadius: `${c.vmin(0.8)}px ${c.vmin(0.8)}px 0 0`,
                boxShadow: `0 0 ${c.vmin(2)}px ${beforeColor}4D`,
              }}
            />
            {/* Label */}
            <div
              style={{
                fontSize: `${labelFontSize}px`,
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.8)',
                marginTop: `${c.vmin(1.5)}px`,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {beforeLabel}
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: `${dividerWidth}px`,
              height: `${dividerHeight}px`,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              opacity: dividerOpacity,
              alignSelf: 'center',
              margin: `0 ${gap / 2}px`,
              borderRadius: `${dividerWidth}px`,
            }}
          />

          {/* After side */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
            }}
          >
            {/* Value */}
            <div
              style={{
                fontSize: `${valueFontSize}px`,
                fontWeight: 800,
                color: afterColor,
                marginBottom: `${c.vmin(1.5)}px`,
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'Inter Tight, sans-serif',
              }}
            >
              {afterCountValue}%
            </div>
            {/* Bar */}
            <div
              style={{
                width: `${barW}px`,
                height: `${afterBarHeight}px`,
                backgroundColor: afterColor,
                borderRadius: `${c.vmin(0.8)}px ${c.vmin(0.8)}px 0 0`,
                boxShadow: `0 0 ${c.vmin(2)}px ${afterColor}4D`,
              }}
            />
            {/* Label */}
            <div
              style={{
                fontSize: `${labelFontSize}px`,
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.8)',
                marginTop: `${c.vmin(1.5)}px`,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {afterLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
