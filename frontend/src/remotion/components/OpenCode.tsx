/**
 * OpenCode — OpenCode TUI mockup: a logo, a large query input being typed, and a
 * status bar showing agent / model / provider (AI coding agent / terminal UI /
 * CLI mockup).
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas(). Typing driven by useCurrentFrame() (deterministic).
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import { elevation, radius } from '../utils/tokens';
import type { UniversalProps } from './types';

interface OpenCodeProps extends UniversalProps {
  placeholder?: string;
  query?: string;
  agentName?: string;
  modelName?: string;
  provider?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  mutedColor?: string;
  speed?: number;
  style?: Record<string, unknown>;
}

export const OpenCode: React.FC<OpenCodeProps> = ({
  x = 0,
  y = 0,
  placeholder = 'Ask anything... ',
  query = 'What is the tech stack of this project?',
  agentName = 'Build',
  modelName = 'Kimi K2.5',
  provider = 'Moonshot AI',
  accentColor = '#2B7FFF',
  bgColor = '#0d0d0f',
  textColor = '#e6e6e6',
  mutedColor = '#7d7d85',
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const f = frame * Math.max(0.05, speed);

  const charsShown = Math.max(0, Math.floor((f - 28) / 1.4));
  const typed = query.slice(0, charsShown);
  const typing = charsShown < query.length;
  const cursorOn = Math.floor(f / 15) % 2 === 0;
  const hasInput = typed.length > 0;

  const fs = c.vmin(2.7);
  const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${c.height / 2 + y}px`,
        left: `${c.width / 2 + x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${c.vw(86)}px`,
        backgroundColor: bgColor,
        borderRadius: `${radius('lg', c.vmin)}px`,
        boxShadow: elevation(3, c.vmin),
        overflow: 'hidden',
        fontFamily: mono,
        zIndex: 40,
        ...style,
      }}
    >
      <div style={{ padding: `${c.vmin(4)}px` }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(1.6)}px`, marginBottom: `${c.vmin(4)}px` }}>
          <span style={{ width: `${c.vmin(2.4)}px`, height: `${c.vmin(2.4)}px`, borderRadius: `${c.vmin(0.6)}px`, backgroundColor: accentColor }} />
          <span style={{ color: textColor, fontSize: `${c.vmin(3)}px`, fontWeight: 700, letterSpacing: '0.04em' }}>opencode</span>
        </div>

        {/* Query input */}
        <div style={{ border: `1px solid rgba(255,255,255,0.12)`, borderRadius: `${radius('md', c.vmin)}px`, padding: `${c.vmin(3)}px ${c.vmin(3.2)}px`, minHeight: `${c.vmin(14)}px`, display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ color: accentColor, marginRight: `${c.vmin(1.6)}px`, fontSize: `${fs}px` }}>&gt;</span>
          <span style={{ flex: 1, color: hasInput ? textColor : mutedColor, fontSize: `${fs}px`, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {hasInput ? typed : placeholder}
            {typing && cursorOn ? <span style={{ color: accentColor }}>▋</span> : null}
          </span>
        </div>

        {/* Status bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(2)}px`, marginTop: `${c.vmin(3)}px`, fontSize: `${c.vmin(2.2)}px`, color: mutedColor }}>
          <span style={{ color: accentColor, fontWeight: 700, border: `1px solid ${accentColor}`, borderRadius: `${c.vmin(0.8)}px`, padding: `${c.vmin(0.4)}px ${c.vmin(1.4)}px` }}>{agentName}</span>
          <span>{modelName}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span>{provider}</span>
        </div>
      </div>
    </div>
  );
};
