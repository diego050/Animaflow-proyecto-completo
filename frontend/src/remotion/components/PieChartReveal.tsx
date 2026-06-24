import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface PieChartRevealProps extends UniversalProps {
  values?: string; // Comma separated
  colors?: string; // Comma separated hex
  labels?: string; // Comma separated
}

export const PieChartReveal: React.FC<PieChartRevealProps> = ({
  values = '40,35,25',
  colors = '#3b82f6,#10b981,#f59e0b',
  labels = 'Product A,Product B,Product C',
  bgColor = '#0f172a',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const valArr = values.split(',').map(Number);
  const colorArr = colors.split(',');
  const labelArr = labels.split(',');
  const total = valArr.reduce((a, b) => a + b, 0);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const sweepProgress = interpolate(adjustedFrame, [10, 50], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

  let cumulativePercent = 0;
  // Relativo al lienzo (antes px: chart 400, fontSize 28, gap 50).
  const chart = c.vmin(42);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, display: 'flex', gap: `${c.vmin(5)}px`, alignItems: 'center', fontFamily: 'Inter, sans-serif', zIndex: 40 }}>
      {/* Chart */}
      <div style={{ width: chart, height: chart, borderRadius: '50%', backgroundColor: bgColor, position: 'relative', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', flexShrink: 0 }}>
        {valArr.map((val, idx) => {
          const percent = val / total;
          const startAngle = cumulativePercent * 360;
          cumulativePercent += percent;
          const visiblePercent = Math.min(percent, Math.max(0, sweepProgress - startAngle / 360));
          if (visiblePercent <= 0) return null;

          return (
            <div key={idx} style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              background: `conic-gradient(from ${startAngle}deg, ${colorArr[idx]} ${visiblePercent * 360}deg, transparent ${visiblePercent * 360}deg)`,
              borderRadius: '50%',
            }} />
          );
        })}
        {/* Inner hole for donut style */}
        <div style={{ position: 'absolute', top: '25%', left: '25%', width: '50%', height: '50%', backgroundColor: bgColor, borderRadius: '50%', boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.5)' }} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${c.vmin(3)}px` }}>
        {labelArr.map((label, idx) => {
          const itemSpring = spring({ frame: Math.max(0, adjustedFrame - 30 - idx * 5), fps, config: { damping: 12 } });
          const percent = Math.round((valArr[idx] / total) * 100);

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(2)}px`, transform: `translateX(${interpolate(itemSpring, [0, 1], [c.vmin(7), 0])}px)`, opacity: itemSpring }}>
              <div style={{ width: c.vmin(4), height: c.vmin(4), borderRadius: `${c.vmin(1)}px`, backgroundColor: colorArr[idx], flexShrink: 0 }} />
              <div style={{ fontSize: `${c.vmin(3.6)}px`, color: textColor, fontWeight: 'bold' }}>{label}</div>
              <div style={{ fontSize: `${c.vmin(3.6)}px`, color: '#94a3b8', marginLeft: 'auto', paddingLeft: `${c.vmin(3)}px` }}>{percent}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
