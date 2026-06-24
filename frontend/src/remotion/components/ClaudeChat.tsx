/**
 * ClaudeChat — Claude.ai-style chat landing: centered greeting, an input box
 * with a prompt being typed, and a model selector chip (AI chat / assistant /
 * Claude UI mockup). Use to demo prompting an AI assistant.
 *
 * Coordinate contract: x/y = absolute canvas coords (solver-resolved center of the element); centered via translate(-50%,-50%).
 * All sizing via useCanvas(). Typing driven by useCurrentFrame() (deterministic).
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import { elevation, radius } from '../utils/tokens';
import type { UniversalProps } from './types';

interface ClaudeChatProps extends UniversalProps {
  greeting?: string;
  placeholder?: string;
  prompt?: string;
  modelName?: string;
  modelTier?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  mutedColor?: string;
  speed?: number;
  style?: Record<string, unknown>;
}

export const ClaudeChat: React.FC<ClaudeChatProps> = ({
  x = 540,
  y = 960,
  greeting = 'Back at it, Dima',
  placeholder = 'Try: draft an email · summarize a doc · plan your week',
  prompt = 'Draft a launch tweet for our new release',
  modelName = 'Opus 4.8',
  modelTier = 'Max',
  accentColor = '#D97757',
  bgColor = '#1f1e1d',
  textColor = '#f5f4ef',
  mutedColor = '#8a8780',
  speed = 1,
  style,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const f = frame * Math.max(0.05, speed);

  const charsShown = Math.max(0, Math.floor((f - 24) / 1.4));
  const typed = prompt.slice(0, charsShown);
  const typing = charsShown < prompt.length;
  const cursorOn = Math.floor(f / 15) % 2 === 0;
  const hasInput = typed.length > 0;

  const fs = c.vmin(2.7);
  const inputBg = '#2b2a28';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${c.vw(84)}px`,
        backgroundColor: bgColor,
        borderRadius: `${radius('lg', c.vmin)}px`,
        boxShadow: elevation(3, c.vmin),
        padding: `${c.vmin(7)}px ${c.vmin(6)}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: `${c.vmin(5)}px`,
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Claude mark */}
      <div style={{ color: accentColor, fontSize: `${c.vmin(7)}px`, lineHeight: 1 }}>✻</div>

      {/* Greeting */}
      <div style={{ color: textColor, fontSize: `${c.vmin(5)}px`, fontWeight: 500, textAlign: 'center' }}>{greeting}</div>

      {/* Input box */}
      <div
        style={{
          width: '100%',
          backgroundColor: inputBg,
          borderRadius: `${radius('md', c.vmin)}px`,
          border: `1px solid rgba(255,255,255,0.08)`,
          padding: `${c.vmin(3)}px ${c.vmin(3.5)}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: `${c.vmin(3)}px`,
          minHeight: `${c.vmin(16)}px`,
        }}
      >
        <div style={{ fontSize: `${fs}px`, color: hasInput ? textColor : mutedColor, lineHeight: 1.4 }}>
          {hasInput ? typed : placeholder}
          {typing && cursorOn ? <span style={{ color: accentColor }}>|</span> : null}
        </div>
        {/* Bottom row: model chip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: `${c.vmin(1.4)}px`, marginTop: 'auto' }}>
          <span style={{ width: `${c.vmin(1.4)}px`, height: `${c.vmin(1.4)}px`, borderRadius: '50%', backgroundColor: accentColor }} />
          <span style={{ color: mutedColor, fontSize: `${c.vmin(2.2)}px` }}>{modelName}</span>
          {modelTier ? (
            <span style={{ color: accentColor, fontSize: `${c.vmin(2)}px`, fontWeight: 600, border: `1px solid ${accentColor}`, borderRadius: '999px', padding: `${c.vmin(0.4)}px ${c.vmin(1.4)}px` }}>{modelTier}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
