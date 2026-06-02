import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface StyleDividerProps extends UniversalProps {
  orientation?: 'horizontal' | 'vertical';
  color?: string;
  thickness?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted' | 'gradient';
  width?: number;
  height?: number;
  style?: Record<string, unknown>;
}

export const StyleDivider: React.FC<StyleDividerProps> = ({
  x = 540,
  y = 960,
  orientation = 'horizontal',
  color = '#334155',
  thickness = 1,
  lineStyle = 'solid',
  width = 400,
  height = 200,
  style: layerStyle,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance: grow from center
  const isHorizontal = orientation === 'horizontal';
  const scale = interpolate(adjustedFrame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Style overrides
  const customColor = (layerStyle?.borderColor as string) ?? color;
  const customThickness = (layerStyle?.borderWidth as number) ?? thickness;
  const customOpacity = layerStyle?.opacity !== undefined ? (layerStyle.opacity as number) * opacity : opacity;
  const customWidth = layerStyle?.width ? `${layerStyle.width}px` : `${width}px`;
  const customHeight = layerStyle?.height ? `${layerStyle.height}px` : `${height}px`;

  const dashArray = lineStyle === 'dashed' ? '8 4' : lineStyle === 'dotted' ? '2 4' : undefined;

  if (isHorizontal) {
    return (
      <div
        style={{
          position: 'absolute',
          top: `${y}px`,
          left: `${x}px`,
          transform: `translate(-50%, -50%) scaleX(${scale})`,
          opacity: customOpacity,
          zIndex: 50,
          width: customWidth,
          height: customHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {lineStyle === 'gradient' ? (
          <div
            style={{
              width: '100%',
              height: `${customThickness}px`,
              background: `linear-gradient(90deg, transparent, ${customColor}, transparent)`,
              borderRadius: 999,
            }}
          />
        ) : (
          <svg width="100%" height={customThickness}>
            <line
              x1="0"
              y1={customThickness / 2}
              x2="100%"
              y2={customThickness / 2}
              stroke={customColor}
              strokeWidth={customThickness}
              strokeDasharray={dashArray}
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    );
  }

  // Vertical
  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) scaleY(${scale})`,
        opacity: customOpacity,
        zIndex: 50,
        width: customWidth,
        height: customHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {lineStyle === 'gradient' ? (
        <div
          style={{
            width: `${customThickness}px`,
            height: '100%',
            background: `linear-gradient(180deg, transparent, ${customColor}, transparent)`,
            borderRadius: 999,
          }}
        />
      ) : (
        <svg width={customThickness} height="100%">
          <line
            x1={customThickness / 2}
            y1="0"
            x2={customThickness / 2}
            y2="100%"
            stroke={customColor}
            strokeWidth={customThickness}
            strokeDasharray={dashArray}
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
};
