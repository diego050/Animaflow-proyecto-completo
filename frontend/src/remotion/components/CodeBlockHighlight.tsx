import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface CodeBlockHighlightProps extends UniversalProps {
  code?: string;
  language?: string;
  highlightLine?: number;
  accentColor?: string;
}

export const CodeBlockHighlight: React.FC<CodeBlockHighlightProps> = ({
  code = 'function calculateROI(investment, return) {\n  const profit = return - investment;\n  return (profit / investment) * 100;\n}',
  language = 'javascript',
  highlightLine = 2, // 1-indexed
  color = '#e2e8f0', // Text color
  bgColor = '#0f172a',
  accentColor = '#38bdf8', // Highlight color
  x = 540,
  y = 540,
  fontSize = 24,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  
  // Highlight animation
  const highlightProgress = spring({ frame: Math.max(0, adjustedFrame - 45), fps, config: { damping: 12 } });

  const lines = code.split('\n');

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, width: '800px', backgroundColor: bgColor, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', fontFamily: 'monospace', zIndex: 45 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 25px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#eab308' }} />
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
        </div>
        <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>{language}</div>
      </div>

      {/* Code Area */}
      <div style={{ position: 'relative', padding: '30px 0', fontSize: `${fontSize}px`, lineHeight: '1.6' }}>
        {lines.map((line, idx) => {
          const isHighlighted = idx + 1 === highlightLine;
          return (
            <div key={idx} style={{ position: 'relative', padding: '0 30px', display: 'flex', zIndex: isHighlighted ? 10 : 1 }}>
              {isHighlighted && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: `${highlightProgress * 100}%`, height: '100%', backgroundColor: `${accentColor}33`, borderLeft: `4px solid ${accentColor}`, zIndex: -1 }} />
              )}
              <div style={{ width: '40px', color: '#475569', textAlign: 'right', marginRight: '20px', userSelect: 'none' }}>{idx + 1}</div>
              <div style={{ color: isHighlighted ? '#ffffff' : color, fontWeight: isHighlighted ? 'bold' : 'normal' }}>
                {line.replace(/ /g, '\u00a0')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
