import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";

interface RadarAxis {
  label: string;
  value: number;
}

interface StyleRadarChartProps extends UniversalProps {
  data?: RadarAxis[];
  maxValue?: number;
  showLabels?: boolean;
  showGrid?: boolean;
  showValues?: boolean;
  fillColor?: string;
  lineColor?: string;
  size?: number;
  style?: Record<string, unknown>;
}

export const StyleRadarChart: React.FC<StyleRadarChartProps> = ({
  x = 540,
  y = 960,
  data = [
    { label: 'Velocidad', value: 85 },
    { label: 'Calidad', value: 72 },
    { label: 'Costo', value: 60 },
    { label: 'Escalabilidad', value: 90 },
    { label: 'Seguridad', value: 78 },
    { label: 'UX', value: 65 },
  ],
  maxValue = 100,
  showLabels = true,
  showGrid = true,
  showValues = false,
  fillColor = 'rgba(0, 255, 171, 0.15)',
  lineColor = '#00FFAB',
  size = 240,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const chartOpacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const center = size / 2;
  const radius = size / 2 - 30;
  const angleStep = (2 * Math.PI) / data.length;

  // Animate data points appearing
  const points = data.map((axis, i) => {
    const pointDelay = i * 5;
    const pointFrame = Math.max(0, adjustedFrame - pointDelay);
    const pointProgress = interpolate(pointFrame, [0, 15], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });

    const angle = i * angleStep - Math.PI / 2;
    const valueRadius = (axis.value / maxValue) * radius * pointProgress;
    return {
      px: center + valueRadius * Math.cos(angle),
      py: center + valueRadius * Math.sin(angle),
      labelX: center + (radius + 20) * Math.cos(angle),
      labelY: center + (radius + 20) * Math.sin(angle),
      label: axis.label,
      value: axis.value,
      progress: pointProgress,
    };
  });

  const polygonPoints = points.map(p => `${p.px},${p.py}`).join(' ');

  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * chartOpacity : chartOpacity;
  const customLineColor = (style?.color as string) ?? lineColor;
  const customFillColor = (style?.backgroundColor as string) ?? fillColor;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        opacity: customOpacity,
        zIndex: 50,
        width: size,
        height: size,
      }}
    >
      <svg width={size} height={size}>
        {/* Grid circles */}
        {showGrid && [0.25, 0.5, 0.75, 1].map((pct, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius * pct}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Axis lines */}
        {showGrid && points.map((p, i) => (
          <line
            key={`axis-${i}`}
            x1={center}
            y1={center}
            x2={center + radius * Math.cos(i * angleStep - Math.PI / 2)}
            y2={center + radius * Math.sin(i * angleStep - Math.PI / 2)}
            stroke="#334155"
            strokeWidth="1"
          />
        ))}

        {/* Filled area */}
        <polygon
          points={polygonPoints}
          fill={customFillColor}
          stroke={customLineColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={`point-${i}`}>
            <circle cx={p.px} cy={p.py} r="4" fill={customLineColor} opacity={p.progress} />
            <circle cx={p.px} cy={p.py} r="2" fill="#0F172A" opacity={p.progress} />
          </g>
        ))}

        {/* Labels */}
        {showLabels && points.map((p, i) => {
          const textAnchor = Math.abs(p.labelX - center) < 5 ? 'middle' : p.labelX > center ? 'start' : 'end';
          const dy = Math.abs(p.labelY - center) < 5 ? '0.3em' : p.labelY > center ? '1em' : '-0.5em';
          return (
            <text
              key={`label-${i}`}
              x={p.labelX}
              y={p.labelY}
              dy={dy}
              textAnchor={textAnchor}
              fontFamily="Inter, sans-serif"
              fontSize="11"
              fill="#94A3B8"
              opacity={p.progress}
            >
              {p.label}
              {showValues && ` ${p.value}`}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
