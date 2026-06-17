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
  stagger = 0.35,
  width,
  x = 0,
  y = 0,
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

  return (
    <div
      style={{
        position: 'absolute',
        top: `${ch / 2 + Number(y)}px`,
        left: `${cw / 2 + Number(x)}px`,
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
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: `${radius('md', c.vmin)}px`,
              padding: `${c.vmin(2.4)}px ${c.vmin(3.2)}px`,
            }}
          >
            <div style={{ transform: `scale(${iconPop})`, flexShrink: 0, display: 'flex' }}>
              <IconifyIcon inline icon={item.icon || checkIcon} size={iconSize} color={accentColor} />
            </div>
            <div
              style={{
                fontFamily: 'Inter Tight, Inter, sans-serif',
                fontWeight: 700,
                fontSize: `${c.vmin(4.2)}px`,
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
