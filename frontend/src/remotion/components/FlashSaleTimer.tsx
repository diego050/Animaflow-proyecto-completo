import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

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
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const scale = spring({ frame: adjustedFrame, fps, config: { damping: 10, mass: 1.2 } });

  const totalStartingSeconds = hours * 3600 + minutes * 60 + seconds;
  const elapsedSeconds = adjustedFrame / fps;
  const remainingSeconds = Math.max(0, totalStartingSeconds - elapsedSeconds);

  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = Math.floor(remainingSeconds % 60);
  const ms = Math.floor((remainingSeconds % 1) * 100);

  const tickPulse = spring({ frame: adjustedFrame % fps, fps, config: { damping: 10, stiffness: 200 } });
  const pad = (num: number) => num.toString().padStart(2, '0');

  // Relativo al lienzo (antes px: fontSize 80, block minWidth 100, padding 40).
  const digitFont = c.vmin(11);

  const Block = ({ val, label }: { val: number; label: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#1e293b', padding: `${c.vmin(3)}px`, borderRadius: `${c.vmin(2)}px`, minWidth: `${c.vmin(15)}px`, display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: `${digitFont}px`, fontWeight: 900, color: textColor, fontVariantNumeric: 'tabular-nums' }}>{pad(val)}</span>
      </div>
      <span style={{ fontSize: `${c.vmin(2.6)}px`, color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginTop: `${c.vmin(1.4)}px`, fontWeight: 'bold' }}>{label}</span>
    </div>
  );

  const colon = <div style={{ fontSize: `${digitFont}px`, fontWeight: 900, color: textColor, lineHeight: `${c.vmin(17)}px` }}>:</div>;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${scale + tickPulse * 0.05})`, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: bgColor, padding: `${c.vmin(5)}px`, borderRadius: `${c.vmin(3.6)}px`, border: `${c.vmin(0.6)}px solid ${color}`, boxShadow: `0 0 50px ${color}80`, fontFamily: 'Inter, sans-serif', zIndex: 60 }}>
      <div style={{ fontSize: `${c.vmin(4.4)}px`, fontWeight: 900, color, textTransform: 'uppercase', letterSpacing: '4px', marginBottom: `${c.vmin(4)}px` }}>
        ⚡ Flash Sale Ends In
      </div>

      <div style={{ display: 'flex', gap: `${c.vmin(2.6)}px`, alignItems: 'flex-start' }}>
        <Block val={h} label="Hours" />
        {colon}
        <Block val={m} label="Minutes" />
        {colon}
        <Block val={s} label="Seconds" />

        {/* MS */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: `${c.vmin(1.4)}px` }}>
          <div style={{ backgroundColor: color, padding: `${c.vmin(3)}px ${c.vmin(1.4)}px`, borderRadius: `${c.vmin(2)}px`, minWidth: `${c.vmin(9)}px`, display: 'flex', justifyContent: 'center' }}>
            <span style={{ fontSize: `${c.vmin(6)}px`, fontWeight: 900, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>{pad(ms)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
