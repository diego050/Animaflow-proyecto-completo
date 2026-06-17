import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';
import { elevation, radius } from '../utils/tokens';

interface TerminalHackerProps extends UniversalProps {
  /** Líneas a "tipear". Acepta lista (atómico) o string separado por coma. */
  lines?: string[] | string;
  /** Título de la ventana (cabecera). */
  title?: string;
  cursorColor?: string;
  /** Color del símbolo de prompt (~). */
  promptColor?: string;
  speed?: number;
  fontSize?: number;
}

export const TerminalHacker: React.FC<TerminalHackerProps> = ({
  lines = [
    'npm install animaflow',
    '> Installing dependencies...',
    '> Building project...',
    '> Success! Server running on port 3000',
  ],
  title = 'bash — animaflow',
  textColor = '#22c55e',
  bgColor = '#0f172a',
  cursorColor = '#22c55e',
  promptColor = '#38bdf8',
  speed = 2,
  fontSize,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const linesArray = (Array.isArray(lines) ? lines : String(lines).split(','))
    .map((l) => String(l).trim())
    .filter((l) => l.length > 0);

  // Responsive (antes px fijos: width 800, fontSize 24, header 40, padding 30).
  const fs = fontSize ?? c.vmin(3);
  const headerH = c.vmin(5.5);
  const dot = c.vmin(1.5);
  const promptGap = c.vmin(2);

  const cursorBlink = Math.floor(frame / 15) % 2 === 0;

  return (
    <div style={{
      position: 'absolute', top: `${y}px`, left: `${x}px`,
      transform: 'translate(-50%, -50%)',
      width: `${c.vw(86)}px`, backgroundColor: bgColor, borderRadius: `${radius('lg', c.vmin)}px`,
      overflow: 'hidden', boxShadow: elevation(3, c.vmin),
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', zIndex: 40,
    }}>
      {/* Cabecera estilo mac */}
      <div style={{ height: `${headerH}px`, backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', padding: `0 ${c.vmin(2.4)}px`, gap: `${c.vmin(1)}px` }}>
        <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#ef4444' }} />
        <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#eab308' }} />
        <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#22c55e' }} />
        {title ? (
          <span style={{ flex: 1, textAlign: 'center', color: '#94a3b8', fontSize: `${c.vmin(2.3)}px`, marginRight: `${c.vmin(6)}px` }}>
            {title}
          </span>
        ) : null}
      </div>

      <div style={{ padding: `${c.vmin(3.5)}px`, color: textColor, fontSize: `${fs}px`, lineHeight: 1.6, minHeight: `${c.vmin(38)}px` }}>
        {linesArray.map((line, lineIndex) => {
          const lineStartFrame = lineIndex * 40;
          if (adjustedFrame < lineStartFrame) return null;

          const relativeFrame = adjustedFrame - lineStartFrame;
          const charsToShow = Math.floor(relativeFrame / speed);
          const isTyping = charsToShow < line.length;
          const visibleText = line.substring(0, charsToShow);

          return (
            <div key={lineIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: `${c.vmin(1.4)}px` }}>
              <span style={{ color: promptColor, marginRight: `${promptGap}px` }}>~</span>
              <span>{visibleText}</span>
              {isTyping && cursorBlink && (
                <div style={{ width: `${c.vmin(1.4)}px`, height: `${fs}px`, backgroundColor: cursorColor, marginLeft: `${c.vmin(0.6)}px` }} />
              )}
            </div>
          );
        })}
        {/* Cursor final */}
        {adjustedFrame >= linesArray.length * 40 && cursorBlink && (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: `${c.vmin(1.4)}px` }}>
            <span style={{ color: promptColor, marginRight: `${promptGap}px` }}>~</span>
            <div style={{ width: `${c.vmin(1.4)}px`, height: `${fs}px`, backgroundColor: cursorColor, marginLeft: `${c.vmin(0.6)}px` }} />
          </div>
        )}
      </div>
    </div>
  );
};
