import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface CalendarDatePopProps extends UniversalProps {
  targetDate?: number;
  month?: string;
  circleColor?: string;
}

export const CalendarDatePop: React.FC<CalendarDatePopProps> = ({
  targetDate = 15, month = 'November', x = 540, y = 960,
  circleColor = '#ef4444', bgColor = '#ffffff', textColor = '#334155', delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const circleDrawProgress = spring({ frame: Math.max(0, adjustedFrame - 45), fps, config: { damping: 12, mass: 1, stiffness: 60 } });

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div style={{
      position: 'absolute', top: `${y}px`, left: `${x}px`,
      transform: `translate(-50%, -50%) scale(${entrance})`,
      width: `${c.vw(82)}px`, backgroundColor: bgColor, borderRadius: `${c.vmin(3.6)}px`, padding: `${c.vmin(5)}px`,
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)', fontFamily: 'Inter, sans-serif', zIndex: 50,
    }}>
      <h3 style={{ margin: `0 0 ${c.vmin(4)}px 0`, fontSize: `${c.vmin(5)}px`, color: textColor, textAlign: 'center' }}>{month}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: `${c.vmin(1.4)}px`, marginBottom: `${c.vmin(2)}px` }}>
        {weekDays.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 'bold', fontSize: `${c.vmin(3)}px` }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: `${c.vmin(2)}px` }}>
        <div /><div />
        {days.map((day) => {
          const isTarget = day === targetDate;
          return (
            <div key={day} style={{ position: 'relative', height: `${c.vmin(8)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${c.vmin(3.6)}px`, fontWeight: isTarget ? 'bold' : 'normal', color: isTarget ? circleColor : textColor }}>
              {day}
              {isTarget && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
                  <svg width="100%" height="100%" viewBox="0 0 60 60" style={{ overflow: 'visible' }}>
                    <circle cx="30" cy="30" r="30" fill="none" stroke={circleColor} strokeWidth="4" strokeLinecap="round"
                      style={{ transformOrigin: 'center', transform: 'scale(1.2) rotate(-90deg)', strokeDasharray: 190, strokeDashoffset: 190 - circleDrawProgress * 190 }} />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
