import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';
import { SPRING, TEXT_HALO, radius } from '../utils/tokens';
import { IconifyIcon } from './IconifyIcon';

type ChecklistItem = { text?: string; icon?: string } | string;

interface AnimatedChecklistProps extends UniversalProps {
  /** Ítems: texto o {text, icon}. Si no hay icon, se usa `checkIcon`. */
  items?: ChecklistItem[];
  /** Ícono por defecto de cada ítem. */
  checkIcon?: string;
  accentColor?: string;
  textColor?: string;
  /** Estilo de la lista. */
  variant?: 'card' | 'minimal' | 'numbered';
  /** Color de fondo de cada fila (variant 'card'). */
  cardColor?: string;
  fontSize?: number;
  /** Segundos entre la aparición de cada ítem. */
  stagger?: number;
  width?: number;
}

/**
 * AnimatedChecklist — lista que revela ítems punto por punto, cada uno con un
 * ícono/check. Ideal para "3 razones", "pasos", "tips". El ícono es un acento por
 * fila, no el protagonista. Determinista (stagger por `frame`), responsive.
 */
export const AnimatedChecklist: React.FC<AnimatedChecklistProps> = ({
  items = [
    { text: 'Primer punto' },
    { text: 'Segundo punto' },
    { text: 'Tercer punto' },
  ],
  checkIcon = 'mdi:check-circle',
  accentColor = '#00FFAB',
  textColor = '#ffffff',
  variant = 'card',
  cardColor = 'rgba(255,255,255,0.06)',
  fontSize,
  stagger = 0.35,
  width,
  x,
  y,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: cw, height: ch } = useVideoConfig();
  const c = useCanvas();
  const f = Math.max(0, frame - delay);

  const norm = (Array.isArray(items) && items.length > 0 ? items : ['—']).map((it) =>
    typeof it === 'string' ? { text: it } : it,
  );

  const staggerFrames = Math.max(1, Math.round(stagger * fps));
  const iconSize = c.vmin(5.5);
  const resolvedWidth = width ?? c.vw(78);
  const fs = fontSize && fontSize > 0 ? fontSize : c.vmin(4.2);

  // Posición ABSOLUTA (contrato de coordenadas). Por defecto, centro.
  const posX = typeof x === 'number' ? x : cw / 2;
  const posY = typeof y === 'number' ? y : ch / 2;

  const isCard = variant === 'card';
  const isNumbered = variant === 'numbered';

  return (
    <div
      style={{
        position: 'absolute',
        top: `${posY}px`,
        left: `${posX}px`,
        transform: 'translate(-50%, -50%)',
        width: `${resolvedWidth}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: `${c.vmin(3)}px`,
        zIndex: 40,
      }}
    >
      {norm.map((item, i) => {
        const start = i * staggerFrames;
        const local = f - start;
        const appear = interpolate(local, [0, 10], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });
        const iconPop = spring({ frame: Math.max(0, local), fps, config: SPRING.pop });

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: `${c.vmin(2.4)}px`,
              opacity: appear,
              transform: `translateX(${(1 - appear) * c.vmin(5)}px)`,
              backgroundColor: isCard ? cardColor : 'transparent',
              borderRadius: isCard ? `${radius('md', c.vmin)}px` : 0,
              padding: isCard ? `${c.vmin(2.4)}px ${c.vmin(3.2)}px` : `${c.vmin(0.8)}px 0`,
            }}
          >
            <div style={{ transform: `scale(${iconPop})`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isNumbered ? (
                <div style={{ width: iconSize, height: iconSize, borderRadius: '50%', backgroundColor: accentColor, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: `${iconSize * 0.55}px`, fontFamily: 'Inter, sans-serif' }}>
                  {i + 1}
                </div>
              ) : (
                <IconifyIcon inline icon={item.icon || checkIcon} size={iconSize} color={accentColor} />
              )}
            </div>
            <div
              style={{
                fontFamily: 'Inter Tight, Inter, sans-serif',
                fontWeight: 700,
                fontSize: `${fs}px`,
                color: textColor,
                textShadow: TEXT_HALO,
                lineHeight: 1.2,
              }}
            >
              {item.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};
