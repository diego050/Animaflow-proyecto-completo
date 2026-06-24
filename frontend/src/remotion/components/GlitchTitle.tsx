import React from 'react';
import { useCurrentFrame, useVideoConfig, random, interpolate } from 'remotion';
import type { UniversalProps } from "./types";

export interface GlitchTitleProps extends UniversalProps {
  text: string;
  /** Color del canal A del glitch. */
  glitchColor1?: string;
  /** Color del canal B del glitch. */
  glitchColor2?: string;
  /** Cuánto se desplazan los canales al glitchear (px). */
  glitchIntensity?: number;
  /** Frecuencia del glitch (0 = nunca, 1 = casi siempre). */
  glitchAmount?: number;
  /** Ancho máximo antes de hacer salto de línea (px). */
  width?: number;
}

export const GlitchTitle: React.FC<GlitchTitleProps> = ({
  text,
  color = '#ffffff',
  glitchColor1 = '#ff0000',
  glitchColor2 = '#00ffff',
  glitchIntensity = 10,
  glitchAmount = 0.2,
  x = 540,
  y = 960,
  fontSize = 80,
  width = 900,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  useVideoConfig();

  const r1 = random(`glitch1-${adjustedFrame}`);
  const r2 = random(`glitch2-${adjustedFrame}`);

  // glitchAmount 0..1 → umbral (más alto = glitchea más seguido).
  const threshold = 1 - Math.min(1, Math.max(0, glitchAmount));
  const isGlitching = r1 > threshold && adjustedFrame > 0;

  const amp = glitchIntensity;
  const offset1 = isGlitching ? interpolate(r2, [0, 1], [-amp, amp]) : 0;
  const offset2 = isGlitching ? interpolate(random(`glitch3-${adjustedFrame}`), [0, 1], [-amp, amp]) : 0;

  const clipPath1 = isGlitching ? `inset(${interpolate(r1, [0.8, 1], [0, 80])}% 0 ${interpolate(r2, [0, 1], [0, 20])}% 0)` : 'none';
  const clipPath2 = isGlitching ? `inset(${interpolate(r2, [0, 1], [0, 40])}% 0 ${interpolate(r1, [0.8, 1], [0, 60])}% 0)` : 'none';

  const layer: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    fontWeight: 900,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.1,
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${width}px`,
        textAlign: 'center',
        zIndex: 10,
      }}
    >
      <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
        <span style={{ ...layer, color, position: 'relative', zIndex: 2 }}>{text}</span>

        <span style={{ ...layer, color: glitchColor1, position: 'absolute', top: 0, left: `${offset1}px`, opacity: isGlitching ? 0.8 : 0, clipPath: clipPath1, zIndex: 1, mixBlendMode: 'screen' }}>{text}</span>

        <span style={{ ...layer, color: glitchColor2, position: 'absolute', top: 0, left: `${offset2}px`, opacity: isGlitching ? 0.8 : 0, clipPath: clipPath2, zIndex: 1, mixBlendMode: 'screen' }}>{text}</span>
      </div>
    </div>
  );
};
