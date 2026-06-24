import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

export const SearchEngineTyping: React.FC<{
  text?: string;
  width?: number;
  height?: number;
  typeSpeed?: number;
} & UniversalProps> = ({
  text = 'cómo crear videos con IA',
  width,
  height,
  typeSpeed = 2,
  x = 540,
  y = 960,
  delay = 0,
  color,
  bgColor,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // Guarda: si llega text vacío/undefined (p.ej. sin default en manifest), no
  // reventar con .substring sobre undefined (era la causa del ⚠️ en el preview).
  const safeText = text ?? '';
  // typeSpeed = frames por carácter (menor = más rápido).
  const framesPerChar = Math.max(1, typeSpeed);
  const charsToShow = Math.floor(adjustedFrame / framesPerChar);
  const displayedText = safeText.substring(0, charsToShow);
  const isFinished = charsToShow >= safeText.length;

  const rippleFrame = adjustedFrame - safeText.length * framesPerChar - 10;
  const showRipple = rippleFrame > 0 && rippleFrame < 15;
  const rippleScale = showRipple ? 1 + rippleFrame * 0.02 : 1;
  const rippleOpacity = showRipple ? 1 - rippleFrame / 15 : 0;

  // Alto y ancho INDEPENDIENTES, con mínimos sanos. La fuente, el icono y el
  // padding derivan del alto, así la barra se redimensiona como una pieza y el
  // anillo (la "luz azul") siempre cuadra exactamente con la barra.
  const barH = Math.max(height ?? c.vmin(13), c.vmin(6));
  const w = Math.max(width ?? c.vw(86), barH * 2.2);
  const fontPx = barH * 0.42;
  const iconPx = barH * 0.5;
  const padX = barH * 0.45;

  return (
    <div
      style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', zIndex: 10 }}
    >
      {/* Ripple ring (mismo tamaño exacto que la barra) */}
      {isFinished && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${w}px`,
            height: `${barH}px`,
            borderRadius: '999px',
            border: `${Math.max(2, barH * 0.05)}px solid ${color || '#38bdf8'}`,
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Main Search Bar (altura fija = barH; texto en una línea) */}
      <div
        style={{
          width: `${w}px`,
          height: `${barH}px`,
          backgroundColor: bgColor || '#ffffff',
          borderRadius: '999px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${padX}px`,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Search Icon */}
        <svg style={{ flexShrink: 0 }} width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="none" stroke={color || "#94a3b8"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>

        {/* Text */}
        <div
          style={{
            marginLeft: `${padX * 0.6}px`,
            fontSize: `${fontPx}px`,
            color: textColor || '#1e293b',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            lineHeight: 1,
          }}
        >
          {displayedText}
          <span style={{ opacity: Math.floor(adjustedFrame / 15) % 2 === 0 ? 1 : 0, color: textColor || '#000' }}>|</span>
        </div>
      </div>
    </div>
  );
};
