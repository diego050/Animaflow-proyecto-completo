import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface StockCandlestickProps extends UniversalProps {
  data?: string; // Comma separated High,Low,Open,Close;H,L,O,C...
  upColor?: string;
  downColor?: string;
}

export const StockCandlestick: React.FC<StockCandlestickProps> = ({
  data = '120,90,100,110;130,105,110,125;140,110,125,115;120,80,115,90;110,70,90,105',
  upColor = '#22c55e',
  downColor = '#ef4444',
  bgColor = '#0f172a',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const candles = data.split(';').map(c => {
    const [h, l, o, c_val] = c.split(',').map(Number);
    return { h, l, o, c: c_val };
  });

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  // Chart dimensions
  const width = 800;
  const height = 400;
  const maxH = Math.max(...candles.map(c => c.h));
  const minL = Math.min(...candles.map(c => c.l));
  const range = maxH - minL;
  
  const stepX = width / candles.length;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, width: `${width}px`, height: `${height}px`, backgroundColor: bgColor, borderRadius: '16px', padding: '40px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', gap: '10px', zIndex: 40 }}>
      {candles.map((candle, idx) => {
        const isUp = candle.c >= candle.o;
        const color = isUp ? upColor : downColor;
        
        const normH = ((candle.h - minL) / range) * height;
        const normL = ((candle.l - minL) / range) * height;
        const normO = ((candle.o - minL) / range) * height;
        const normC = ((candle.c - minL) / range) * height;
        
        const top = Math.max(normO, normC);
        const bottom = Math.min(normO, normC);
        const bodyHeight = Math.max(top - bottom, 2); // At least 2px
        
        // Animation stagger
        const candleDraw = spring({ frame: Math.max(0, adjustedFrame - (idx * 5)), fps, config: { damping: 12 } });

        return (
          <div key={idx} style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}>
            {/* Wick */}
            <div style={{ position: 'absolute', bottom: `${normL}px`, width: '4px', height: `${(normH - normL) * candleDraw}px`, backgroundColor: color, borderRadius: '2px' }} />
            
            {/* Body */}
            <div style={{ position: 'absolute', bottom: `${bottom}px`, width: '80%', height: `${bodyHeight * candleDraw}px`, backgroundColor: color, borderRadius: '4px' }} />
          </div>
        );
      })}
    </div>
  );
};
