import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

type SwipeDir = 'left' | 'right' | 'up' | 'down';

interface SwipeCardItem {
  name?: string;
  subtitle?: string;
  stampText?: string;
  stampColor?: string;
  direction?: SwipeDir;
}

interface TinderSwipeCardProps extends UniversalProps {
  name?: string;
  subtitle?: string;
  swipeFrame?: number;
  stampColor?: string;
  stampText?: string;
  /** Dirección del swipe (carta única). */
  direction?: SwipeDir;
  /** Pila de cartas que se pasan en secuencia (cada una con su dirección). */
  cards?: SwipeCardItem[];
  /** Frames entre el swipe de cada carta de la pila. */
  interval?: number;
}

export const TinderSwipeCard: React.FC<TinderSwipeCardProps> = ({
  name = 'SaaS Startup', subtitle = 'Looking for growth',
  swipeFrame = 90, x = 540, y = 960,
  bgColor = '#ffffff', stampColor = '#22c55e', stampText = 'MATCH!',
  direction = 'right', cards, interval = 45, delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // Pila: usa `cards` si viene; si no, una sola carta desde las props sueltas.
  const stack: SwipeCardItem[] = Array.isArray(cards) && cards.length > 0
    ? cards
    : [{ name, subtitle, stampText, stampColor, direction }];

  const entranceScale = spring({ frame: adjustedFrame, fps, config: { damping: 12 } });

  const dirOffset = (d: SwipeDir, p: number) => {
    switch (d) {
      case 'left': return { tx: interpolate(p, [0, 1], [0, -c.vw(120)]), ty: 0, rot: interpolate(p, [0, 1], [0, -25]) };
      case 'up': return { tx: 0, ty: interpolate(p, [0, 1], [0, -c.vh(120)]), rot: interpolate(p, [0, 1], [0, -8]) };
      case 'down': return { tx: 0, ty: interpolate(p, [0, 1], [0, c.vh(120)]), rot: interpolate(p, [0, 1], [0, 8]) };
      case 'right':
      default: return { tx: interpolate(p, [0, 1], [0, c.vw(120)]), ty: 0, rot: interpolate(p, [0, 1], [0, 25]) };
    }
  };

  // Progreso de swipe de cada carta.
  const progresses = stack.map((_, i) =>
    spring({ frame: Math.max(0, adjustedFrame - (swipeFrame + i * interval)), fps, config: { damping: 12, mass: 1, stiffness: 100 } }),
  );

  return (
    <>
      {stack.map((card, i) => {
        const p = progresses[i];
        const dir = card.direction || direction;
        const { tx, ty, rot } = dirOffset(dir, p);
        // Profundidad en la pila = cartas delante de ésta aún no despachadas.
        let depth = 0;
        for (let j = 0; j < i; j++) if (progresses[j] < 0.5) depth++;
        const stackY = depth * c.vmin(2.5);
        const stackScale = 1 - depth * 0.04;
        const sc = card.stampColor || stampColor;
        const matchScale = spring({ frame: Math.max(0, adjustedFrame - (swipeFrame + i * interval) + 10), fps, config: { damping: 10, stiffness: 200 } });
        // z: la primera de la pila arriba.
        const z = 50 + (stack.length - i);

        return (
          <div key={i} style={{
            position: 'absolute', top: `${y}px`, left: `${x}px`,
            transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty + stackY}px)) scale(${entranceScale * stackScale}) rotate(${rot}deg)`,
            width: `${c.vw(82)}px`, height: `${c.vmin(78)}px`, backgroundColor: bgColor, borderRadius: `${c.vmin(4.5)}px`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', justifyContent: 'flex-end', padding: `${c.vmin(5)}px`,
            fontFamily: 'Inter, sans-serif', zIndex: z, overflow: 'hidden', boxSizing: 'border-box',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#e2e8f0', zIndex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: `${c.vmin(4.4)}px` }}>[Image]</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', zIndex: 1 }} />
            <div style={{ zIndex: 2, width: '100%' }}>
              <h2 style={{ margin: `0 0 ${c.vmin(1.4)}px 0`, fontSize: `${c.vmin(7)}px`, fontWeight: '800', color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.3)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{card.name}</h2>
              <p style={{ margin: 0, fontSize: `${c.vmin(3.8)}px`, color: '#cbd5e1', textShadow: '0 2px 10px rgba(0,0,0,0.3)', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{card.subtitle}</p>
            </div>
            {card.stampText !== '' && (
              <div style={{
                position: 'absolute', top: `${c.vmin(14)}px`, left: `${c.vmin(7)}px`,
                border: `${c.vmin(1.2)}px solid ${sc}`, color: sc,
                fontSize: `${c.vmin(8.5)}px`, fontWeight: '900', padding: `${c.vmin(1.4)}px ${c.vmin(4)}px`, borderRadius: `${c.vmin(3)}px`,
                transform: `rotate(-15deg) scale(${matchScale})`, opacity: matchScale,
                zIndex: 5, textTransform: 'uppercase', letterSpacing: '2px', boxShadow: `0 0 20px ${sc}66`,
              }}>{card.stampText ?? stampText}</div>
            )}
          </div>
        );
      })}
    </>
  );
};
