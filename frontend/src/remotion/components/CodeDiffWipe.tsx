/**
 * CodeDiffWipe — A code editor that wipes from a "before" version to an "after"
 * version, with a vertical handle sweeping across the boundary (refactor /
 * migration / before-after code reveal). Complements CodeBlockHighlight /
 * TerminalHacker (which don't do diffs).
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas() — no hardcoded structural px.
 * Deterministic: wipe driven by useCurrentFrame().
 */
import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import { elevation, radius } from '../utils/tokens';
import type { UniversalProps } from './types';

interface CodeDiffWipeProps extends UniversalProps {
  before?: string;
  after?: string;
  language?: string;
  background?: string;
  accent?: string;
  /** Frame the wipe starts. */
  transitionStart?: number;
  /** Frames the wipe takes. */
  transitionDuration?: number;
  showHandle?: boolean;
  speed?: number;
  fontSize?: number;
  style?: Record<string, unknown>;
}

const DEFAULT_BEFORE = `function sum(a, b) {
  return a + b
}`;
const DEFAULT_AFTER = `function sum(...nums: number[]) {
  return nums.reduce((a, b) => a + b, 0)
}`;

export const CodeDiffWipe: React.FC<CodeDiffWipeProps> = ({
  x = 0,
  y = 0,
  before = DEFAULT_BEFORE,
  after = DEFAULT_AFTER,
  language = 'tsx',
  background = '#0a0a0a',
  accent = '#0ea5e9',
  transitionStart = 20,
  transitionDuration = 60,
  showHandle = true,
  speed = 1,
  fontSize,
  textColor = '#e2e8f0',
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const fs = fontSize && fontSize > 0 ? fontSize : c.vmin(3);
  const dot = c.vmin(1.5);
  const pad = c.vmin(3.5);

  const dur = Math.max(1, transitionDuration / Math.max(0.05, speed));
  const progress = interpolate(frame, [transitionStart, transitionStart + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const maxLines = Math.max(beforeLines.length, afterLines.length);

  const codeArea: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    padding: `${pad}px`,
    fontSize: `${fs}px`,
    lineHeight: 1.6,
    fontFamily: 'ui-monospace, Menlo, monospace',
    whiteSpace: 'pre',
    margin: 0,
  };

  const renderLines = (lines: string[], removed: boolean) =>
    lines.map((line, i) => (
      <div
        key={i}
        style={{
          color: removed ? '#fca5a5' : '#86efac',
          background: removed ? 'rgba(248,113,113,0.08)' : 'rgba(34,197,94,0.10)',
        }}
      >
        <span style={{ opacity: 0.6, marginRight: '1ch', color: textColor }}>{removed ? '-' : '+'}</span>
        {line || ' '}
      </div>
    ));

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${c.vw(86)}px`,
        backgroundColor: background,
        borderRadius: `${radius('lg', c.vmin)}px`,
        overflow: 'hidden',
        boxShadow: elevation(3, c.vmin),
        zIndex: 45,
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${c.vmin(2)}px ${pad}px`,
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', gap: `${c.vmin(1)}px` }}>
          <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#eab308' }} />
          <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#22c55e' }} />
        </div>
        <div style={{ color: '#94a3b8', fontSize: `${c.vmin(2.4)}px`, fontWeight: 'bold' }}>{language}</div>
      </div>

      {/* Code area: before underneath, after clipped on top */}
      <div style={{ position: 'relative', minHeight: `${fs * 1.6 * maxLines + pad * 2}px` }}>
        <pre style={codeArea}>{renderLines(beforeLines, true)}</pre>
        <pre style={{ ...codeArea, clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}>
          {renderLines(afterLines, false)}
        </pre>
        {showHandle && progress > 0 && progress < 1 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${progress * 100}%`,
              width: `${c.vmin(0.5)}px`,
              backgroundColor: accent,
              boxShadow: `0 0 ${c.vmin(2)}px ${accent}`,
            }}
          />
        )}
      </div>
    </div>
  );
};
