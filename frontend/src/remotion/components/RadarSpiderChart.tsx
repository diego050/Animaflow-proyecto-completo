import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';
import { TEXT_HALO } from '../utils/tokens';

type RadarAxis = { label: string; value: number };

interface RadarSpiderChartProps extends UniversalProps {
  /** Ejes: lista de {label, value 0-100} (atómico) o strings legacy. */
  data?: RadarAxis[];
  values?: string; // legacy
  labels?: string; // legacy
  fillColor?: string;
  /** Forma de la rejilla de fondo. */
  gridShape?: 'polygon' | 'circle';
}

function resolveAxes(data?: RadarAxis[], values?: string, labels?: string): RadarAxis[] {
  if (Array.isArray(data) && data.length > 0) return data;
  const vals = (values ?? '').split(',').map((v) => Number(v) || 0);
  const labs = (labels ?? '').split(',').map((l) => l.trim());
  return vals.map((v, i) => ({ label: labs[i] ?? `#${i + 1}`, value: v }));
}

export const RadarSpiderChart: React.FC<RadarSpiderChartProps> = ({
  data,
  values = '80,95,60,85,70',
  labels = 'Speed,Power,Agility,Stamina,Focus',
  fillColor = 'rgba(0, 255, 171, 0.35)',
  color = '#00FFAB',
  textColor = '#ffffff',
  gridShape = 'polygon',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const axes = resolveAxes(data, values, labels);
  const sides = Math.max(3, axes.length);
  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });

  // Responsive (antes px fijos: radius 250, cx/cy 300, fontSize 20).
  const box = c.vmin(60);
  const cx = box / 2;
  const cy = box / 2;
  const radius = box / 2 - c.vmin(9); // deja espacio para etiquetas
  const stroke = c.vmin(0.8);
  const dotR = c.vmin(1.2);
  const labelFont = c.vmin(2.8);
  const webLevels = [0.2, 0.4, 0.6, 0.8, 1];

  const getPoint = (val: number, index: number, total: number, maxR: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    return `${cx + Math.cos(angle) * maxR * (val / 100)},${cy + Math.sin(angle) * maxR * (val / 100)}`;
  };

  const dataPoints = axes.map((a, i) => getPoint(a.value * entrance, i, sides, radius)).join(' ');

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, width: `${box}px`, height: `${box}px`, zIndex: 40, fontFamily: 'Inter, sans-serif' }}>
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} style={{ position: 'absolute', inset: 0 }}>
        {/* Rejilla de fondo: polígono o círculo */}
        {webLevels.map((level, i) =>
          gridShape === 'circle' ? (
            <circle key={`web-${i}`} cx={cx} cy={cy} r={radius * level} fill="none" stroke="#334155" strokeWidth={stroke * 0.6} />
          ) : (
            <polygon
              key={`web-${i}`}
              points={Array.from({ length: sides }).map((_, j) => getPoint(100 * level, j, sides, radius)).join(' ')}
              fill="none"
              stroke="#334155"
              strokeWidth={stroke * 0.6}
            />
          ),
        )}

        {/* Radios */}
        {Array.from({ length: sides }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
          return (
            <line key={`spoke-${i}`} x1={cx} y1={cy} x2={cx + Math.cos(angle) * radius} y2={cy + Math.sin(angle) * radius} stroke="#334155" strokeWidth={stroke * 0.6} />
          );
        })}

        {/* Polígono de datos */}
        <polygon points={dataPoints} fill={fillColor} stroke={color} strokeWidth={stroke} strokeLinejoin="round" />

        {/* Puntos */}
        {axes.map((a, i) => {
          const pt = getPoint(a.value * entrance, i, sides, radius).split(',');
          return <circle key={`dot-${i}`} cx={pt[0]} cy={pt[1]} r={dotR} fill="#ffffff" stroke={color} strokeWidth={stroke * 0.6} />;
        })}
      </svg>

      {/* Etiquetas */}
      {axes.map((a, i) => {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (radius + c.vmin(5));
        const ly = cy + Math.sin(angle) * (radius + c.vmin(5));
        return (
          <div key={`label-${i}`} style={{ position: 'absolute', left: `${lx}px`, top: `${ly}px`, transform: 'translate(-50%, -50%)', color: textColor, fontWeight: 700, fontSize: `${labelFont}px`, textShadow: TEXT_HALO, whiteSpace: 'nowrap' }}>
            {a.label}
          </div>
        );
      })}
    </div>
  );
};
