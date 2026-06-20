import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface FlashSaleTimerProps extends UniversalProps {
  hours?: number;
  minutes?: number;
  seconds?: number;
  /** Título de arriba. */
  title?: string;
  /** Etiquetas bajo cada bloque. */
  hoursLabel?: string;
  minutesLabel?: string;
  secondsLabel?: string;
  /** Color de los bloques de dígitos. */
  blockColor?: string;
  /** Color de las etiquetas. */
  labelColor?: string;
  /** Mostrar el bloque de milisegundos. */
  showMs?: boolean;
  /** Rebote en cada segundo. */
  bounce?: boolean;
  /** Tamaño (multiplicador, 1 = normal). */
  size?: number;
}

export const FlashSaleTimer: React.FC<FlashSaleTimerProps> = ({
  hours = 0,
  minutes = 15,
  seconds = 30,
  title = '⚡ Flash Sale Ends In',
  hoursLabel = 'Hours',
  minutesLabel = 'Minutes',
  secondsLabel = 'Seconds',
  color = '#ef4444',
  bgColor = '#000000',
  textColor = '#ffffff',
  blockColor = '#1e293b',
  labelColor = '#64748b',
  showMs = true,
  bounce = true,
  size = 1,
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
  const remainingSeconds = Math.max(0, totalStartingSeconds - adjustedFrame / fps);
  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = Math.floor(remainingSeconds % 60);
  const ms = Math.floor((remainingSeconds % 1) * 100);

  const tickPulse = bounce ? spring({ frame: adjustedFrame % fps, fps, config: { damping: 10, stiffness: 200 } }) : 0;
  const pad = (num: number) => num.toString().padStart(2, '0');

  // Tamaños reducidos para que NO se pase de la pantalla (antes vmin 11/15).
  const digitFont = c.vmin(8) * size;
  const blockMin = c.vmin(11) * size;

  const Block = ({ val, label }: { val: number; label: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ backgroundColor: blockColor, padding: `${c.vmin(2.4) * size}px`, borderRadius: `${c.vmin(2)}px`, minWidth: `${blockMin}px`, display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: `${digitFont}px`, fontWeight: 900, color: textColor, fontVariantNumeric: 'tabular-nums' }}>{pad(val)}</span>
      </div>
      {label ? <span style={{ fontSize: `${c.vmin(2.4)}px`, color: labelColor, textTransform: 'uppercase', letterSpacing: '2px', marginTop: `${c.vmin(1.4)}px`, fontWeight: 'bold' }}>{label}</span> : null}
    </div>
  );

  const colon = <div style={{ fontSize: `${digitFont}px`, fontWeight: 900, color: textColor, lineHeight: `${blockMin}px` }}>:</div>;

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${scale + tickPulse * 0.05})`, display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: bgColor, padding: `${c.vmin(4)}px`, borderRadius: `${c.vmin(3.6)}px`, border: `${c.vmin(0.6)}px solid ${color}`, boxShadow: `0 0 50px ${color}80`, fontFamily: 'Inter, sans-serif', maxWidth: `${c.vw(96)}px`, boxSizing: 'border-box', zIndex: 60 }}>
      {title ? (
        <div style={{ fontSize: `${c.vmin(4) * size}px`, fontWeight: 900, color, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: `${c.vmin(3.5)}px`, textAlign: 'center' }}>
          {title}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: `${c.vmin(2)}px`, alignItems: 'flex-start' }}>
        <Block val={h} label={hoursLabel} />
        {colon}
        <Block val={m} label={minutesLabel} />
        {colon}
        <Block val={s} label={secondsLabel} />

        {showMs && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: `${c.vmin(1.4)}px` }}>
            <div style={{ backgroundColor: color, padding: `${c.vmin(2.4) * size}px ${c.vmin(1.4)}px`, borderRadius: `${c.vmin(2)}px`, minWidth: `${c.vmin(7) * size}px`, display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontSize: `${c.vmin(5) * size}px`, fontWeight: 900, color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}>{pad(ms)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
