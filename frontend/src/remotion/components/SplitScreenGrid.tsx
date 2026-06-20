import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';
import { IconifyIcon } from './IconifyIcon';

type Panel = {
  color?: string;
  text?: string;
  icon?: string;
  textColor?: string;
  shape?: 'rect' | 'circle';
  span?: number; // nº de columnas que ocupa
};

interface SplitScreenGridProps extends UniversalProps {
  /** Paneles de la rejilla (la cantidad define el grid junto con `columns`). */
  panels?: Panel[];
  /** Columnas de la rejilla. */
  columns?: number;
  /** Frame en el que arranca la animación. */
  splitFrame?: number;
  /** Frames entre la aparición de cada panel (0 = todos a la vez = "split" clásico). */
  stagger?: number;
  /** Animación de entrada de cada panel. */
  entry?: 'split' | 'scale' | 'fade' | 'slide';
  /** Separación entre paneles (px). */
  gap?: number;
  /** Radio de las esquinas de cada panel (px). */
  cornerRadius?: number;
  /** Sombra en los paneles. */
  shadow?: boolean;
  /** Cubrir toda la pantalla. false = caja con width/height en x/y. */
  cover?: boolean;
  /** Color del fondo / gap. */
  gapColor?: string;
}

const DEFAULT_PANELS: Panel[] = [
  { color: '#ef4444', text: 'Uno' },
  { color: '#3b82f6', text: 'Dos' },
  { color: '#10b981', text: 'Tres' },
  { color: '#f59e0b', text: 'Cuatro' },
];

export const SplitScreenGrid: React.FC<SplitScreenGridProps> = ({
  panels,
  columns = 2,
  splitFrame = 60,
  stagger = 0,
  entry = 'split',
  gap = 8,
  cornerRadius,
  shadow = true,
  cover = true,
  gapColor = '#0f172a',
  x = 540,
  y = 540,
  width,
  height,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { width: cw, height: ch, fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const list = Array.isArray(panels) && panels.length > 0 ? panels : DEFAULT_PANELS;
  const cols = Math.max(1, columns);
  const rows = Math.ceil(list.length / cols);
  const rad = cornerRadius && cornerRadius > 0 ? cornerRadius : c.vmin(3);

  // Dimensiones del contenedor.
  const boxW = cover ? cw : (width && width > 0 ? width : c.vw(80));
  const boxH = cover ? ch : (height && height > 0 ? height : c.vh(60));

  const container: React.CSSProperties = cover
    ? { top: 0, left: 0, transform: 'none' }
    : { top: `${y}px`, left: `${x}px`, transform: 'translate(-50%, -50%)' };

  return (
    <div
      style={{
        position: 'absolute',
        width: `${boxW}px`,
        height: `${boxH}px`,
        backgroundColor: gapColor,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: `${gap}px`,
        padding: `${gap}px`,
        boxSizing: 'border-box',
        zIndex: 10,
        ...container,
      }}
    >
      {list.map((panel, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const centerCol = (cols - 1) / 2;
        const centerRow = (rows - 1) / 2;
        const dx = col - centerCol;
        const dy = row - centerRow;

        // Progreso individual (con stagger opcional).
        const p = spring({
          frame: Math.max(0, adjustedFrame - splitFrame - i * stagger),
          fps,
          config: { damping: 15, mass: 1.2, stiffness: 120 },
        });

        // Transform según tipo de entrada.
        let transform = '';
        let opacity = 1;
        if (entry === 'split') {
          transform = `translate(${-dx * 100 * (1 - p)}%, ${-dy * 100 * (1 - p)}%) scale(${0.2 + 0.8 * p})`;
        } else if (entry === 'scale') {
          transform = `scale(${p})`;
          opacity = p;
        } else if (entry === 'slide') {
          transform = `translateY(${(1 - p) * c.vmin(8)}px)`;
          opacity = p;
        } else { // fade
          opacity = p;
        }

        const shape = panel.shape ?? 'rect';
        return (
          <div
            key={i}
            style={{
              gridColumn: panel.span && panel.span > 1 ? `span ${Math.min(panel.span, cols)}` : undefined,
              backgroundColor: panel.color ?? '#334155',
              transform,
              opacity,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: `${c.vmin(2)}px`,
              color: panel.textColor ?? '#ffffff',
              fontSize: `${c.vmin(5)}px`,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: `${c.vmin(3)}px`,
              boxShadow: shadow && p > 0.1 ? '0 10px 30px rgba(0,0,0,0.5)' : 'none',
              borderRadius: shape === 'circle' ? '50%' : `${p > 0.1 ? rad : 0}px`,
              aspectRatio: shape === 'circle' ? '1 / 1' : undefined,
              overflow: 'hidden',
            }}
          >
            {panel.icon ? <IconifyIcon inline icon={panel.icon} size={c.vmin(10)} color={panel.textColor ?? '#ffffff'} /> : null}
            {panel.text ? <span>{panel.text}</span> : null}
          </div>
        );
      })}
    </div>
  );
};
