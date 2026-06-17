import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';
import { radius as tokenRadius, TEXT_HALO } from '../utils/tokens';
import { IconifyIcon } from './IconifyIcon';

type RaceItem = { label: string; value: number; color?: string; icon?: string };

interface HorizontalBarRaceProps extends UniversalProps {
  /** Ítems: lista de {label, value, color?, icon?} (atómico) o string "Name:val,...". */
  items?: RaceItem[] | string;
  /** Colores (solo para el formato string legacy). */
  colors?: string;
}

const DEFAULT_COLORS = ['#00FFAB', '#FF8C00', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'];

function parseItems(items: RaceItem[] | string, colors?: string): RaceItem[] {
  if (Array.isArray(items)) return items;
  const colorArr = (colors ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  return String(items)
    .split(',')
    .map((it, i) => {
      const [label, val] = it.split(':');
      return { label: (label ?? '').trim(), value: Number(val) || 0, color: colorArr[i] };
    })
    .filter((it) => it.label);
}

export const HorizontalBarRace: React.FC<HorizontalBarRaceProps> = ({
  items = [
    { label: 'JavaScript', value: 100, color: '#f7df1e' },
    { label: 'Python', value: 90, color: '#3776ab' },
    { label: 'TypeScript', value: 85, color: '#3178c6' },
    { label: 'Go', value: 70, color: '#00add8' },
    { label: 'Rust', value: 60, color: '#dea584' },
  ],
  colors,
  textColor = '#ffffff',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const parsed = parseItems(items, colors).slice().sort((a, b) => b.value - a.value); // ranking
  const maxVal = Math.max(...parsed.map((i) => i.value), 1);

  const labelFont = c.vmin(3);
  const barH = c.vmin(5.5);
  const iconSize = c.vmin(4);

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)', width: `${c.vw(86)}px`, display: 'flex', flexDirection: 'column', gap: `${c.vmin(2.4)}px`, fontFamily: 'Inter, sans-serif', zIndex: 40 }}>
      {parsed.map((item, idx) => {
        const drawSpring = spring({ frame: Math.max(0, adjustedFrame - idx * 5), fps, config: { damping: 14 } });
        const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: `${c.vmin(2)}px` }}>
            <div style={{ width: c.vmin(22), display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: `${c.vmin(1)}px`, fontSize: `${labelFont}px`, fontWeight: 700, color: textColor, textShadow: TEXT_HALO }}>
              {item.icon ? <IconifyIcon inline icon={item.icon} size={iconSize} color={color} /> : null}
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            </div>
            <div style={{ position: 'relative', flex: 1, height: `${barH}px`, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: `0 ${tokenRadius('pill', c.vmin)}px ${tokenRadius('pill', c.vmin)}px 0`, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${(item.value / maxVal) * 100 * drawSpring}%`, backgroundColor: color, borderRadius: `0 ${tokenRadius('pill', c.vmin)}px ${tokenRadius('pill', c.vmin)}px 0` }} />
            </div>
            <div style={{ width: c.vmin(9), fontSize: `${labelFont}px`, fontWeight: 900, color, opacity: drawSpring }}>
              {Math.round(item.value * drawSpring)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
