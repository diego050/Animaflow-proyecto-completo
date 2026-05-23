import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface FlashSaleTimerProps extends UniversalProps {
  hours?: number;
  minutes?: number;
  seconds?: number;
}

export const FlashSaleTimer: React.FC<FlashSaleTimerProps> = ({
  hours = 0,
  minutes = 15,
  seconds = 30,
  color = '#ef4444', // Red for urgency
  bgColor = '#000000',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Entrance
  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 10, mass: 1.2 } });

  // Time logic
  const totalStartingSeconds = hours * 3600 + minutes * 60 + seconds;
  const elapsedSeconds = adjustedFrame / fps;
  const remainingSeconds = Math.max(0, totalStartingSeconds - elapsedSeconds);
  
  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = Math.floor(remainingSeconds % 60);
  const ms = Math.floor((remainingSeconds % 1) * 100);

  // Pulse effect every second to increase anxiety
  const tickPulse = spring({ frame: adjustedFrame % fps, fps, config: { damping: 10, stiffness: 200 } });
  
  const pad = (num: number) => num.toString().padStart(2, '0');

  const Block = ({ val, label }: { val: number, label: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', minWidth: '100px', display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: '80px', fontWeight: 900, color: textColor, fontVariantNumeric: 'tabular-nums' }}>{pad(val)}</span>
      </div>
      <span style={{ fontSize: '16px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '10px', fontWeight: 'bold' }}>{label}</span>
    </div>
  );

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${scale + (tickPulse * 0.05)})`, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: bgColor, padding: '40px', borderRadius: '24px', border: `4px solid ${color}`, boxShadow: `0 0 50px ${color}80`, fontFamily: 'Inter, sans-serif', zIndex: 60 }}>
      
      <div style={{ fontSize: '32px', fontWeight: 900, color: color, textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '30px' }}>
        ⚡ Flash Sale Ends In
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <Block val={h} label="Hours" />
        <div style={{ fontSize: '80px', fontWeight: 900, color: textColor, lineHeight: '120px' }}>:</div>
        <Block val={m} label="Minutes" />
        <div style={{ fontSize: '80px', fontWeight: 900, color: textColor, lineHeight: '120px' }}>:</div>
        <Block val={s} label="Seconds" />
        
        {/* MS */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: '10px' }}>
          <div style={{ backgroundColor: color, padding: '20px 10px', borderRadius: '12px', minWidth: '60px', display: 'flex', justifyContent: 'center' }}>
            <span style={{ fontSize: '40px', fontWeight: 900, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>{pad(ms)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
