/**
 * ChatGpt — ChatGPT-style chat landing: centered greeting and a pill input with
 * a prompt being typed (AI chat / assistant / ChatGPT UI mockup).
 *
 * Coordinate contract: x/y = absolute canvas coords (solver-resolved center of the element); centered via translate(-50%,-50%).
 * All sizing via useCanvas(). Typing driven by useCurrentFrame() (deterministic).
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { useCanvas } from '../utils/canvas';
import { elevation, radius } from '../utils/tokens';
import type { UniversalProps } from './types';

interface ChatGptProps extends UniversalProps {
  greeting?: string;
  placeholder?: string;
  prompt?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  mutedColor?: string;
  speed?: number;
  style?: Record<string, unknown>;
}

export const ChatGpt: React.FC<ChatGptProps> = ({
  x = 540,
  y = 960,
  greeting = "What's on your mind today?",
  placeholder = 'Ask anything',
  prompt = 'Make a sunset over a calm ocean',
  accentColor = '#2F6FED',
  bgColor = '#212121',
  textColor = '#ececec',
  mutedColor = '#9b9b9b',
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

  const inputBg = '#303030';

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
        padding: `${c.vmin(8)}px ${c.vmin(6)}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: `${c.vmin(6)}px`,
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      {/* OpenAI-style mark */}
      <div style={{ width: `${c.vmin(8)}px`, height: `${c.vmin(8)}px`, borderRadius: '50%', border: `${c.vmin(0.9)}px solid ${textColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: `${c.vmin(3.2)}px`, height: `${c.vmin(3.2)}px`, borderRadius: '50%', backgroundColor: textColor }} />
      </div>

      {/* Greeting */}
      <div style={{ color: textColor, fontSize: `${c.vmin(4.6)}px`, fontWeight: 500, textAlign: 'center' }}>{greeting}</div>

      {/* Pill input */}
      <div
        style={{
          width: '100%',
          backgroundColor: inputBg,
          borderRadius: `${c.vmin(6)}px`,
          padding: `${c.vmin(3.2)}px ${c.vmin(4)}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: `${c.vmin(3)}px`,
        }}
      >
        <span style={{ fontSize: `${c.vmin(2.7)}px`, color: hasInput ? textColor : mutedColor, lineHeight: 1.3, flex: 1 }}>
          {hasInput ? typed : placeholder}
          {typing && cursorOn ? <span style={{ color: accentColor }}>|</span> : null}
        </span>
        <span style={{ width: `${c.vmin(5)}px`, height: `${c.vmin(5)}px`, borderRadius: '50%', backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: `${c.vmin(3)}px`, flexShrink: 0 }}>↑</span>
      </div>
    </div>
  );
};
