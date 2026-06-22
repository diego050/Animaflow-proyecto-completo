import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface VersusScreenProps extends UniversalProps {
  nameA?: string;
  nameB?: string;
  colorA?: string;
  colorB?: string;
  /** Texto del badge central. */
  vsText?: string;
  /** Color del texto VS. */
  vsColor?: string;
  /** Color de fondo del badge. */
  badgeColor?: string;
  /** Color del borde del badge. */
  borderColor?: string;
  /** Forma de la división. */
  divider?: 'straight' | 'diagonal' | 'curved';
  /** Intensidad de la curva (solo divider 'curved'). */
  curveAmount?: number;
  /** Mostrar el badge VS. */
  showVs?: boolean;
  /** Cubrir toda la pantalla. false = caja con width/height en x/y. */
  cover?: boolean;
}

export const VersusScreen: React.FC<VersusScreenProps> = ({
  nameA = 'REACT',
  nameB = 'VUE',
  colorA = '#61dafb',
  colorB = '#42b883',
  textColor = '#ffffff',
  vsText = 'VS',
  vsColor = '#ffffff',
  badgeColor = '#1e293b',
  borderColor = '#ffffff',
  divider = 'diagonal',
  curveAmount = 14,
  showVs = true,
  cover = true,
  fontSize,
  x = 540,
  y = 960,
  width,
  height,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: cw, height: ch } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const splitA = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const splitB = spring({ frame: Math.max(0, adjustedFrame - 5), fps, config: { damping: 14 } });
  const vsScale = spring({ frame: Math.max(0, adjustedFrame - 15), fps, config: { damping: 12, mass: 1.5 } });

  // Boundary x% en función de y%, según el tipo de división.
  const targetX = (yPct: number): number => {
    if (divider === 'straight') return 50;
    if (divider === 'curved') return 50 + curveAmount * Math.sin((yPct / 100) * Math.PI);
    return 60 - (yPct / 100) * 20; // diagonal: 60% arriba → 40% abajo
  };
  const ys = [0, 25, 50, 75, 100];
  const clipA = `polygon(0% 0%, ${ys.map((yy) => `${targetX(yy) * splitA}% ${yy}%`).join(', ')}, 0% 100%)`;
  const clipB = `polygon(${ys.map((yy) => `${100 - (100 - targetX(yy)) * splitB}% ${yy}%`).reverse().join(', ')}, 100% 100%, 100% 0%)`;

  const fs = fontSize && fontSize > 0 ? fontSize : c.vmin(15);
  const slide = c.vmin(14);
  const vsBadge = c.vmin(22);

  const container: React.CSSProperties = cover
    ? { top: 0, left: 0, width: `${cw}px`, height: `${ch}px` }
    : { top: `${y}px`, left: `${x}px`, width: `${width && width > 0 ? width : c.vw(80)}px`, height: `${height && height > 0 ? height : c.vh(60)}px`, transform: 'translate(-50%, -50%)' };

  return (
    <div style={{ position: 'absolute', ...container, fontFamily: 'Inter, sans-serif', zIndex: 10, overflow: 'hidden', borderRadius: cover ? 0 : `${c.vmin(2)}px` }}>
      {/* Side A */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: colorA, clipPath: clipA, display: 'flex', alignItems: 'center', paddingLeft: '12%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: `${fs}px`, fontWeight: 900, color: textColor, textShadow: '0 10px 30px rgba(0,0,0,0.3)', transform: `translateX(${interpolate(splitA, [0, 1], [-slide, 0])}px)` }}>
          {nameA}
        </div>
      </div>

      {/* Side B */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: colorB, clipPath: clipB, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '12%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: `${fs}px`, fontWeight: 900, color: textColor, textShadow: '0 10px 30px rgba(0,0,0,0.3)', transform: `translateX(${interpolate(splitB, [0, 1], [slide, 0])}px)` }}>
          {nameB}
        </div>
      </div>

      {/* Central VS Badge */}
      {showVs && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) scale(${vsScale})`, width: vsBadge, height: vsBadge, borderRadius: '50%', backgroundColor: badgeColor, border: `${c.vmin(1.2)}px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 3 }}>
          <div style={{ fontSize: `${c.vmin(9)}px`, fontWeight: 900, color: vsColor, fontStyle: 'italic' }}>{vsText}</div>
        </div>
      )}
    </div>
  );
};
