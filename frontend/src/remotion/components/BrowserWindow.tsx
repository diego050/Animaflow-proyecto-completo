import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';
import { SPRING, elevation, radius } from '../utils/tokens';
import { IconifyIcon } from './IconifyIcon';

export interface BrowserWindowProps extends UniversalProps {
  /** Texto principal (compat: si no hay `title`, se usa éste). */
  text?: string;
  title?: string;
  subtitle?: string;
  /** Ícono grande dentro de la pantalla (opcional). */
  icon?: string;
  /** Texto de la barra de direcciones. */
  url?: string;
  /** Color de fondo de la pantalla (interior). */
  screenColor?: string;
  accentColor?: string;
  width?: number;
  height?: number;
}

/**
 * BrowserWindow — ventana de navegador ATÓMICA: barra con dots + URL y un interior
 * editable (ícono + título + subtítulo). A futuro admite imagen vía `url` de captura.
 * Responsive (useCanvas), entrada con spring, determinista.
 */
export const BrowserWindow: React.FC<BrowserWindowProps> = ({
  text = '',
  title,
  subtitle = '',
  icon = '',
  url = 'miweb.com',
  screenColor = '#ffffff',
  accentColor = '#00FFAB',
  textColor = '#0f172a',
  width,
  height,
  x = 540,
  y = 960,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps } = useVideoConfig();

  const scale = spring({ frame: adjustedFrame, fps, config: SPRING.pop });

  const w = width ?? c.vw(84);
  const h = height ?? c.vmin(54);
  const barH = c.vmin(6);
  const dot = c.vmin(1.5);
  const heading = title ?? text;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        width: `${w}px`,
        height: `${h}px`,
        backgroundColor: screenColor,
        borderRadius: `${radius('lg', c.vmin)}px`,
        boxShadow: elevation(3, c.vmin),
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      {/* Barra superior */}
      <div
        style={{
          height: `${barH}px`,
          backgroundColor: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: `${c.vmin(2)}px`,
          padding: `0 ${c.vmin(2.4)}px`,
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: `${c.vmin(1)}px` }}>
          <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <div style={{ width: dot, height: dot, borderRadius: '50%', backgroundColor: '#10b981' }} />
        </div>
        <div
          style={{
            flex: 1,
            height: `${barH * 0.6}px`,
            backgroundColor: '#ffffff',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${c.vmin(2)}px`,
            fontFamily: 'Inter, sans-serif',
            fontSize: `${c.vmin(2.4)}px`,
            color: '#64748b',
          }}
        >
          {url}
        </div>
      </div>

      {/* Interior editable */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${c.vmin(2.4)}px`,
          padding: `${c.vmin(5)}px`,
        }}
      >
        {icon ? <IconifyIcon inline icon={icon} size={c.vmin(15)} color={accentColor} /> : null}
        {heading ? (
          <span style={{ fontSize: `${c.vmin(6)}px`, fontWeight: 800, color: textColor, fontFamily: 'Inter Tight, system-ui, sans-serif', textAlign: 'center', lineHeight: 1.1 }}>
            {heading}
          </span>
        ) : null}
        {subtitle ? (
          <span style={{ fontSize: `${c.vmin(3.2)}px`, fontWeight: 500, color: '#64748b', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
};
