/**
 * ClaudeCode — Claude Code CLI mockup: a terminal with a welcome box (title,
 * user, model, cwd) and a prompt being typed into the input line (AI coding
 * agent / terminal assistant / CLI mockup).
 *
 * Coordinate contract: x/y = offset from canvas center.
 * All sizing via useCanvas(). Typing driven by useCurrentFrame() (deterministic).
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import { elevation, radius } from '../utils/tokens';
import type { UniversalProps } from './types';

interface ClaudeCodeProps extends UniversalProps {
  title?: string;
  userName?: string;
  model?: string;
  cwd?: string;
  placeholder?: string;
  prompt?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  mutedColor?: string;
  speed?: number;
  style?: Record<string, unknown>;
}

export const ClaudeCode: React.FC<ClaudeCodeProps> = ({
  x = 0,
  y = 0,
  title = 'Claude Code v2.0.0',
  userName = 'Remocn',
  model = 'Opus 4.8 • Max 20x',
  cwd = '/users/remocn/code/apps',
  placeholder = 'Try "edit <filepath> to ..."',
  prompt = 'edit src/theme.ts to add a dark mode toggle',
  accentColor = '#D97757',
  bgColor = '#1a1a18',
  textColor = '#e8e6e1',
  mutedColor = '#8a8780',
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const f = frame * Math.max(0.05, speed);

  const charsShown = Math.max(0, Math.floor((f - 30) / 1.4));
  const typed = prompt.slice(0, charsShown);
  const typing = charsShown < prompt.length;
  const cursorOn = Math.floor(f / 15) % 2 === 0;
  const hasInput = typed.length > 0;

  const fs = c.vmin(2.6);
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(1)}px`, padding: `${c.vmin(2)}px ${c.vmin(3)}px`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <div style={{ width: `${c.vmin(1.5)}px`, height: `${c.vmin(1.5)}px`, borderRadius: '50%', backgroundColor: '#ef4444' }} />
        <div style={{ width: `${c.vmin(1.5)}px`, height: `${c.vmin(1.5)}px`, borderRadius: '50%', backgroundColor: '#eab308' }} />
        <div style={{ width: `${c.vmin(1.5)}px`, height: `${c.vmin(1.5)}px`, borderRadius: '50%', backgroundColor: '#22c55e' }} />
        <span style={{ flex: 1, textAlign: 'center', color: mutedColor, fontSize: `${c.vmin(2.2)}px`, marginRight: `${c.vmin(5)}px` }}>{title}</span>
      </div>

      <div style={{ padding: `${c.vmin(3.5)}px` }}>
        {/* Welcome box */}
        <div style={{ border: `1px solid ${accentColor}`, borderRadius: `${radius('md', c.vmin)}px`, padding: `${c.vmin(3)}px`, marginBottom: `${c.vmin(3.5)}px` }}>
          <div style={{ color: accentColor, fontSize: `${fs}px`, marginBottom: `${c.vmin(1.6)}px` }}>✻ Welcome back, {userName}</div>
          <div style={{ color: mutedColor, fontSize: `${fs * 0.92}px`, lineHeight: 1.7 }}>
            <div>model: <span style={{ color: textColor }}>{model}</span></div>
            <div>cwd: <span style={{ color: textColor }}>{cwd}</span></div>
          </div>
        </div>

        {/* Prompt input line */}
        <div style={{ display: 'flex', alignItems: 'flex-start', border: `1px solid rgba(255,255,255,0.12)`, borderRadius: `${radius('md', c.vmin)}px`, padding: `${c.vmin(2.4)}px ${c.vmin(3)}px` }}>
          <span style={{ color: accentColor, marginRight: `${c.vmin(1.6)}px`, fontSize: `${fs}px` }}>&gt;</span>
          <span style={{ flex: 1, color: hasInput ? textColor : mutedColor, fontSize: `${fs}px`, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {hasInput ? typed : placeholder}
            {typing && cursorOn ? <span style={{ color: accentColor }}>▋</span> : null}
          </span>
        </div>
      </div>
    </div>
  );
};
