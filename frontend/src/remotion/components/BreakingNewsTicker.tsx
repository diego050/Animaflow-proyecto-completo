import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";

interface BreakingNewsTickerProps extends UniversalProps {
  text?: string;
  speed?: number;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
  barHeight?: number;
  /** Ancho de la barra (px). Por defecto = ancho del lienzo (barra completa). */
  barWidth?: number;
}

export const BreakingNewsTicker: React.FC<BreakingNewsTickerProps> = ({
  text = 'LATEST UPDATES: Market hits record highs as tech stocks surge /// LIVE: Global conference begins in Geneva /// BREAKING: New AI model shatters previous benchmarks',
  bgColor = '#ef4444',
  textColor = '#ffffff',
  speed = 10,
  fontSize = 32,
  badgeText = 'BREAKING',
  badgeBg = '#000000',
  badgeColor = '#ffffff',
  barHeight = 70,
  barWidth,
  x,
  y,
  delay = 0,
  disableEntry = false,
}) => {
  const frame = useCurrentFrame();
  const { width: canvasWidth, height: canvasHeight } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  // Posición/tamaño: por defecto barra completa pegada abajo, pero ahora x/y la
  // mueven a cualquier sitio (p.ej. arriba) y barWidth/barHeight la redimensionan.
  const barW = barWidth && barWidth > 0 ? barWidth : canvasWidth;
  const posX = x ?? canvasWidth / 2;
  const posY = y ?? canvasHeight - barHeight / 2;

  // Marquee scroll effect (relativo al ancho de la barra)
  const scrollX = (adjustedFrame * speed) % 3000;

  // Entrance from bottom (entrada PROPIA). Si hay un entry externo (wrapper),
  // se desactiva para no animar dos entradas a la vez → arranca en su sitio.
  const translateY = disableEntry
    ? 0
    : interpolate(adjustedFrame, [0, 15], [100, 0], { extrapolateRight: 'clamp' });

  return (
    <div style={{ position: 'absolute', top: `${posY}px`, left: `${posX}px`, width: `${barW}px`, height: `${barHeight}px`, backgroundColor: bgColor, display: 'flex', alignItems: 'center', fontFamily: 'Inter, sans-serif', transform: `translate(-50%, -50%) translateY(${translateY}%)`, zIndex: 70, overflow: 'hidden' }}>

      {/* Badge (texto configurable; ya no fijo "BREAKING") */}
      {badgeText !== '' && (
        <div style={{ height: '100%', padding: '0 30px', backgroundColor: badgeBg, color: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${fontSize}px`, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', zIndex: 2, boxShadow: '10px 0 20px rgba(0,0,0,0.5)' }}>
          {badgeText}
        </div>
      )}
      
      {/* Ticker Text */}
      <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: `${barW - scrollX}px`, fontSize: `${fontSize}px`, fontWeight: 600, color: textColor, letterSpacing: '1px' }}>
          {text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {text}
        </div>
      </div>
    </div>
  );
};
