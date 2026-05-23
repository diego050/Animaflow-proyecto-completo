import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { UniversalProps } from './types';

interface TerminalHackerProps extends UniversalProps {
  lines?: string; // Comma separated lines
  cursorColor?: string;
  speed?: number;
}

export const TerminalHacker: React.FC<TerminalHackerProps> = ({
  lines = 'npm install animaflow,> Installing dependencies...,> Building project...,> Success! Server running on port 3000',
  textColor = '#22c55e',
  bgColor = '#0f172a',
  cursorColor = '#22c55e',
  speed = 2,
  fontSize = 24,
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const linesArray = lines.split(',').map(l => l.trim());

  // Cursor blink logic
  const cursorBlink = Math.floor(frame / 15) % 2 === 0;

  return (
    <div style={{
      position: 'absolute', top: `${y}px`, left: `${x}px`,
      transform: 'translate(-50%, -50%)',
      width: '800px', backgroundColor: bgColor, borderRadius: '12px',
      overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      fontFamily: 'monospace', zIndex: 40,
    }}>
      {/* Mac window header */}
      <div style={{ height: '40px', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '8px' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#eab308' }} />
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
      </div>
      <div style={{ padding: '30px', color: textColor, fontSize: `${fontSize}px`, lineHeight: '1.6', minHeight: '300px' }}>
        {linesArray.map((line, lineIndex) => {
          const lineStartFrame = lineIndex * 40; // 40 frames delay between lines
          if (adjustedFrame < lineStartFrame) return null;
          
          const relativeFrame = adjustedFrame - lineStartFrame;
          const charsToShow = Math.floor(relativeFrame / speed);
          const isTyping = charsToShow < line.length;
          const visibleText = line.substring(0, charsToShow);

          return (
            <div key={lineIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#38bdf8', marginRight: '15px' }}>~</span>
              <span>{visibleText}</span>
              {isTyping && cursorBlink && (
                <div style={{ width: '12px', height: `${fontSize}px`, backgroundColor: cursorColor, marginLeft: '5px' }} />
              )}
            </div>
          );
        })}
        {/* Trailing cursor on last line */}
        {adjustedFrame >= linesArray.length * 40 && cursorBlink && (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <span style={{ color: '#38bdf8', marginRight: '15px' }}>~</span>
            <div style={{ width: '12px', height: `${fontSize}px`, backgroundColor: cursorColor, marginLeft: '5px' }} />
          </div>
        )}
      </div>
    </div>
  );
};
