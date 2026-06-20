import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface MessageBubbleProps extends UniversalProps {
  messages?: string; // Semicolon separated. Prefix with R: for receiver, S: for sender
  senderColor?: string;
  receiverColor?: string;
  /** Color del texto en las burbujas del emisor (S:). */
  senderTextColor?: string;
  /** Color del texto en las burbujas del receptor (R:). */
  receiverTextColor?: string;
  /** Ancho del hilo de chat (px). */
  width?: number;
  /** Frames entre la aparición de cada mensaje. */
  stagger?: number;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  messages = 'R:Hey, did you see the new feature?;S:Yeah! It looks amazing. 🚀',
  senderColor = '#22c55e',
  receiverColor = '#334155',
  senderTextColor = '#ffffff',
  receiverTextColor = '#ffffff',
  width = 600,
  stagger = 45,
  x = 540,
  y = 540,
  fontSize = 24,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const msgs = messages.split(';').map(m => m.trim()).filter(Boolean);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', width: `${width}px`, display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif', zIndex: 40 }}>
      {msgs.map((msg, idx) => {
        const isSender = msg.startsWith('S:');
        const text = msg.replace(/^[RS]:/, '').trim();
        const msgDelay = idx * stagger;

        const scale = spring({ frame: Math.max(0, adjustedFrame - msgDelay), fps, config: { damping: 12 } });
        const translateY = interpolate(scale, [0, 1], [50, 0]);

        if (adjustedFrame < msgDelay) return null;

        return (
          <div key={idx} style={{
            alignSelf: isSender ? 'flex-end' : 'flex-start',
            backgroundColor: isSender ? senderColor : receiverColor,
            color: isSender ? senderTextColor : receiverTextColor,
            padding: '15px 25px',
            borderRadius: '24px',
            borderBottomRightRadius: isSender ? '4px' : '24px',
            borderBottomLeftRadius: !isSender ? '4px' : '24px',
            fontSize: `${fontSize}px`,
            maxWidth: '80%',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
            transform: `scale(${scale}) translateY(${translateY}px)`,
            transformOrigin: isSender ? 'bottom right' : 'bottom left',
          }}>
            {text}
          </div>
        );
      })}
    </div>
  );
};
