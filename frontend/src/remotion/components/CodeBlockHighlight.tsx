import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';
import { elevation, radius } from '../utils/tokens';

interface CodeBlockHighlightProps extends UniversalProps {
  code?: string;
  language?: string;
  highlightLine?: number;
  accentColor?: string;
  /** Color de la barra superior. */
  headerColor?: string;
  /** Escribe el código carácter por carácter y el resaltado SIGUE la línea actual. */
  typing?: boolean;
}

export const CodeBlockHighlight: React.FC<CodeBlockHighlightProps> = ({
  code = 'function calculateROI(investment, ret) {\n  const profit = ret - investment;\n  return (profit / investment) * 100;\n}',
  language = 'javascript',
  highlightLine = 2, // 1-indexed
  color = '#e2e8f0', // Text color
  bgColor = '#0f172a',
  accentColor = '#38bdf8', // Highlight color
  headerColor = '#1e293b',
  typing = false,
  x = 540,
  y = 540,
  fontSize,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const entrance = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const highlightProgress = spring({ frame: Math.max(0, adjustedFrame - 45), fps, config: { damping: 12 } });

  const allLines = code.split('\n');

  // -- Modo typing: revela el código y el resaltado sigue la línea que se escribe.
  let lines = allLines;
  let activeLine = highlightLine; // 1-indexed
  let cursor = false;
  if (typing) {
    const reserved = 12;
    const window = Math.max(1, durationInFrames - reserved - Math.round(delay * fps));
    const progress = Math.min(1, adjustedFrame / window);
    const charsToShow = Math.ceil(progress * code.length);
    const shown = code.substring(0, charsToShow);
    lines = shown.split('\n');
    activeLine = lines.length; // la última línea escrita (1-indexed)
    cursor = Math.floor(adjustedFrame / 15) % 2 === 0 && progress < 1;
  }

  const fs = fontSize && fontSize > 0 ? fontSize : c.vmin(3);
  const dot = c.vmin(1.5);
  const sidePad = c.vmin(3.5);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%) scale(${entrance})`, width: `${c.vw(86)}px`, backgroundColor: bgColor, borderRadius: `${radius('lg', c.vmin)}px`, overflow: 'hidden', boxShadow: elevation(3, c.vmin), fontFamily: 'ui-monospace, Menlo, monospace', zIndex: 45 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${c.vmin(2)}px ${sidePad}px`, backgroundColor: headerColor, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', gap: `${c.vmin(1)}px` }}>
          <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#eab308' }} />
          <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#22c55e' }} />
        </div>
        <div style={{ color: '#94a3b8', fontSize: `${c.vmin(2.4)}px`, fontWeight: 'bold' }}>{language}</div>
      </div>

      {/* Code Area */}
      <div style={{ position: 'relative', padding: `${c.vmin(3.5)}px 0`, fontSize: `${fs}px`, lineHeight: 1.6, minHeight: `${c.vmin(3) * 1.6 * allLines.length}px` }}>
        {lines.map((line, idx) => {
          const isHighlighted = idx + 1 === activeLine;
          // En typing el resaltado cubre toda la línea; si no, crece con el spring.
          const hlWidth = typing ? 100 : highlightProgress * 100;
          const isLast = idx === lines.length - 1;
          return (
            <div key={idx} style={{ position: 'relative', padding: `0 ${sidePad}px`, display: 'flex', zIndex: isHighlighted ? 10 : 1 }}>
              {isHighlighted && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: `${hlWidth}%`, height: '100%', backgroundColor: `${accentColor}33`, borderLeft: `${c.vmin(0.6)}px solid ${accentColor}`, zIndex: -1 }} />
              )}
              <div style={{ width: `${c.vmin(7)}px`, color: '#475569', textAlign: 'right', marginRight: `${c.vmin(2.6)}px`, userSelect: 'none' }}>{idx + 1}</div>
              <div style={{ color: isHighlighted ? '#ffffff' : color, fontWeight: isHighlighted ? 'bold' : 'normal', whiteSpace: 'pre-wrap' }}>
                {line}
                {cursor && isLast ? <span style={{ color: accentColor }}>|</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
