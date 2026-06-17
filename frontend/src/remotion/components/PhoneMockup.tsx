import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';
import { SPRING, elevation } from '../utils/tokens';
import { IconifyIcon } from './IconifyIcon';

export interface PhoneMockupProps extends UniversalProps {
  /** Texto principal (compat: si no hay `title`, se usa éste). */
  text?: string;
  title?: string;
  subtitle?: string;
  /** Ícono grande dentro de la pantalla (opcional). */
  icon?: string;
  /** Color de fondo de la pantalla (interior). */
  screenColor?: string;
  accentColor?: string;
}

/**
 * PhoneMockup — maqueta de celular ATÓMICA con interior editable (ícono + título +
 * subtítulo + color de pantalla). A futuro admite imagen de captura. Responsive
 * (useCanvas), entrada slide-up con spring, determinista.
 */
export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  text = '',
  title,
  subtitle = '',
  icon = '',
  screenColor = '#f8fafc',
  accentColor = '#00FFAB',
  x = 540,
  y = 960,
  textColor = '#1e293b',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps, height } = useVideoConfig();

  const progress = spring({ frame: adjustedFrame, fps, config: SPRING.soft });
  // Entra desde abajo hacia su posición.
  const currentY = height + c.vmin(40) - progress * (height + c.vmin(40) - y);

  const w = c.vmin(42);
  const h = c.vmin(80);
  const bezel = c.vmin(1.4);
  const heading = title ?? text;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${currentY}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${w}px`,
        height: `${h}px`,
        backgroundColor: screenColor,
        borderRadius: `${c.vmin(5)}px`,
        border: `${bezel}px solid #0f172a`,
        boxShadow: elevation(3, c.vmin),
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      {/* Dynamic Island */}
      <div
        style={{
          position: 'absolute',
          top: `${c.vmin(1.2)}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${c.vmin(13)}px`,
          height: `${c.vmin(3.2)}px`,
          backgroundColor: '#0f172a',
          borderRadius: '999px',
          zIndex: 2,
        }}
      />

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
        {icon ? <IconifyIcon inline icon={icon} size={c.vmin(13)} color={accentColor} /> : null}
        {heading ? (
          <span style={{ fontSize: `${c.vmin(5)}px`, fontWeight: 700, color: textColor, fontFamily: 'Inter Tight, system-ui, sans-serif', textAlign: 'center', lineHeight: 1.15 }}>
            {heading}
          </span>
        ) : null}
        {subtitle ? (
          <span style={{ fontSize: `${c.vmin(3)}px`, fontWeight: 500, color: '#64748b', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
};
