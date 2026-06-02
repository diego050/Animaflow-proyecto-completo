import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface StyleProgressBarProps extends UniversalProps {
  value?: number;
  max?: number;
  variant?: 'linear' | 'circular';
  color?: string;
  bgColor?: string;
  height?: number;
  showLabel?: boolean;
  labelPosition?: 'top' | 'bottom' | 'inside';
  size?: number; // for circular
  strokeWidth?: number; // for circular
  style?: Record<string, unknown>;
}

export const StyleProgressBar: React.FC<StyleProgressBarProps> = ({
  x = 540,
  y = 960,
  value = 73,
  max = 100,
  variant = 'linear',
  color = '#00FFAB',
  bgColor = '#334155',
  height = 8,
  showLabel = true,
  labelPosition = 'top',
  size = 120,
  strokeWidth = 8,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // Animate from 0 to target value over 60 frames
  const animatedValue = interpolate(adjustedFrame, [0, 60], [0, value], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const progress = Math.min(animatedValue / max, 1);
  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Style overrides
  const customColor = (style?.color as string) ?? color;
  const customBgColor = (style?.backgroundColor as string) ?? bgColor;
  const customBorderRadius = (style?.borderRadius as number) ?? 999;
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;
  const customHeight = style?.height ? `${style.height}px` : `${height}px`;

  const percentage = Math.round(progress * 100);

  if (variant === 'circular') {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    return (
      <div
        style={{
          position: 'absolute',
          top: `${y}px`,
          left: `${x}px`,
          transform: 'translate(-50%, -50%)',
          opacity: customOpacity,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {showLabel && labelPosition === 'top' && (
          <div style={{ fontFamily: 'Inter Tight, sans-serif', fontWeight: 700, fontSize: 24, color: '#FFFFFF' }}>
            {percentage}%
          </div>
        )}
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={customBgColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={customColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.1s ease' }}
          />
        </svg>
        {showLabel && labelPosition === 'bottom' && (
          <div style={{ fontFamily: 'Inter Tight, sans-serif', fontWeight: 700, fontSize: 16, color: '#94A3B8' }}>
            {percentage}%
          </div>
        )}
      </div>
    );
  }

  // Linear variant
  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: '80%',
        maxWidth: 400,
        opacity: customOpacity,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      {showLabel && labelPosition === 'top' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14, color: '#94A3B8' }}>
            Progress
          </span>
          <span style={{ fontFamily: 'Inter Tight, sans-serif', fontWeight: 700, fontSize: 14, color: '#FFFFFF' }}>
            {percentage}%
          </span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: customHeight,
          backgroundColor: customBgColor,
          borderRadius: `${customBorderRadius}px`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            backgroundColor: customColor,
            borderRadius: `${customBorderRadius}px`,
            transition: 'width 0.1s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: showLabel && labelPosition === 'inside' ? 'center' : 'flex-start',
          }}
        >
          {showLabel && labelPosition === 'inside' && (
            <span style={{ fontFamily: 'Inter Tight, sans-serif', fontWeight: 700, fontSize: 12, color: '#0F172A', paddingLeft: 8 }}>
              {percentage}%
            </span>
          )}
        </div>
      </div>
      {showLabel && labelPosition === 'bottom' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 12, color: '#64748B' }}>
            0
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 12, color: '#64748B' }}>
            {max}
          </span>
        </div>
      )}
    </div>
  );
};
