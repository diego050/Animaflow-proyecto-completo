import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface RadarSpiderChartProps extends UniversalProps {
  values?: string; // Comma separated 0-100
  fillColor?: string;
  labels?: string;
}

export const RadarSpiderChart: React.FC<RadarSpiderChartProps> = ({
  values = '80,95,60,85,70',
  fillColor = 'rgba(59, 130, 246, 0.5)',
  color = '#3b82f6', // Stroke color
  labels = 'Speed,Power,Agility,Stamina,Focus',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const valArr = values.split(',').map(Number);
  const labelArr = labels.split(',');
  const sides = valArr.length;
  
  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  const radius = 250;
  const cx = 300;
  const cy = 300;

  // Background web
  const webLevels = [0.2, 0.4, 0.6, 0.8, 1];
  
  // Calculate points
  const getPoint = (val: number, index: number, total: number, maxR: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    return `${cx + Math.cos(angle) * maxR * (val / 100)},${cy + Math.sin(angle) * maxR * (val / 100)}`;
  };

  const dataPoints = valArr.map((v, i) => getPoint(v * entrance, i, sides, radius)).join(' ');

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, zIndex: 40, fontFamily: 'Inter, sans-serif' }}>
      <svg width={cx * 2} height={cy * 2} viewBox={`0 0 ${cx * 2} ${cy * 2}`}>
        
        {/* Web rings */}
        {webLevels.map((level, i) => {
          const pts = Array.from({ length: sides }).map((_, j) => getPoint(100 * level, j, sides, radius)).join(' ');
          return <polygon key={`web-${i}`} points={pts} fill="none" stroke="#334155" strokeWidth="2" />;
        })}
        
        {/* Spokes */}
        {Array.from({ length: sides }).map((_, i) => (
          <line key={`spoke-${i}`} x1={cx} y1={cy} x2={cx + Math.cos((Math.PI * 2 * i) / sides - Math.PI / 2) * radius} y2={cy + Math.sin((Math.PI * 2 * i) / sides - Math.PI / 2) * radius} stroke="#334155" strokeWidth="2" />
        ))}

        {/* Data polygon */}
        <polygon points={dataPoints} fill={fillColor} stroke={color} strokeWidth="4" strokeLinejoin="round" />
        
        {/* Data points dots */}
        {valArr.map((v, i) => {
          const pt = getPoint(v * entrance, i, sides, radius).split(',');
          return <circle key={`dot-${i}`} cx={pt[0]} cy={pt[1]} r="6" fill="#ffffff" stroke={color} strokeWidth="3" />;
        })}
      </svg>
      
      {/* Labels */}
      {labelArr.map((label, i) => {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (radius + 40);
        const ly = cy + Math.sin(angle) * (radius + 40);
        return (
          <div key={`label-${i}`} style={{ position: 'absolute', left: `${lx}px`, top: `${ly}px`, transform: 'translate(-50%, -50%)', color: textColor, fontWeight: 'bold', fontSize: '20px', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
            {label}
          </div>
        );
      })}
    </div>
  );
};
