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
  /** Modelo del dispositivo (define proporciones + notch). */
  model?: 'iphone' | 'android' | 'tablet' | 'custom';
  /** Color de fondo de la pantalla (interior). */
  screenColor?: string;
  /** Color del ícono interior. */
  accentColor?: string;
  /** Color del subtítulo. */
  subtitleColor?: string;
  /** Color del marco (bezel). */
  bezelColor?: string;
  /** Grosor del marco (px). */
  bezelWidth?: number;
  /** Radio de las esquinas (px, solo model 'custom' o para sobrescribir). */
  cornerRadius?: number;
  /** Muestra el notch / dynamic island. */
  showNotch?: boolean;
  /** Sombra del dispositivo. */
  shadow?: boolean;
}

const MODELS = {
  iphone: { wPct: 42, hPct: 80, radPct: 5, notch: 'island' as const },
  android: { wPct: 42, hPct: 82, radPct: 3.5, notch: 'punch' as const },
  tablet: { wPct: 62, hPct: 82, radPct: 3, notch: 'none' as const },
  custom: { wPct: 42, hPct: 80, radPct: 5, notch: 'island' as const },
};

/**
 * PhoneMockup — maqueta de dispositivo ATÓMICA: modelo (iphone/android/tablet/
 * custom), interior editable (ícono + título + subtítulo + color), marco/sombra/
 * notch configurables. Responsive (useCanvas), entrada slide-up, determinista.
 */
export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  text = '',
  title,
  subtitle = '',
  icon = '',
  model = 'iphone',
  screenColor = '#f8fafc',
  accentColor = '#00FFAB',
  subtitleColor = '#64748b',
  bezelColor = '#0f172a',
  bezelWidth,
  cornerRadius,
  showNotch = true,
  shadow = true,
  x = 540,
  y = 960,
  width,
  height,
  textColor = '#1e293b',
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);
  const { fps, height: canvasH } = useVideoConfig();

  const preset = MODELS[model] ?? MODELS.iphone;

  const progress = spring({ frame: adjustedFrame, fps, config: SPRING.soft });
  // Entra desde abajo hacia su posición.
  const currentY = canvasH + c.vmin(40) - progress * (canvasH + c.vmin(40) - y);

  // Dimensiones: custom usa width/height; los presets derivan del lienzo.
  const w = (model === 'custom' && width && width > 0) ? width : c.vmin(preset.wPct);
  const h = (model === 'custom' && height && height > 0) ? height : c.vmin(preset.hPct);
  const bezel = bezelWidth && bezelWidth > 0 ? bezelWidth : c.vmin(1.4);
  const rad = cornerRadius && cornerRadius > 0 ? cornerRadius : c.vmin(preset.radPct);
  const notch = showNotch ? preset.notch : 'none';
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
        borderRadius: `${rad}px`,
        border: `${bezel}px solid ${bezelColor}`,
        boxShadow: shadow ? elevation(3, c.vmin) : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      {/* Notch: 'island' (pill) o 'punch' (hole) o 'none' */}
      {notch === 'island' && (
        <div style={{ position: 'absolute', top: `${c.vmin(1.2)}px`, left: '50%', transform: 'translateX(-50%)', width: `${c.vmin(13)}px`, height: `${c.vmin(3.2)}px`, backgroundColor: bezelColor, borderRadius: '999px', zIndex: 2 }} />
      )}
      {notch === 'punch' && (
        <div style={{ position: 'absolute', top: `${c.vmin(1.6)}px`, left: '50%', transform: 'translateX(-50%)', width: `${c.vmin(3)}px`, height: `${c.vmin(3)}px`, backgroundColor: bezelColor, borderRadius: '50%', zIndex: 2 }} />
      )}

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
          <span style={{ fontSize: `${c.vmin(5)}px`, fontWeight: 700, color: textColor, fontFamily: 'Inter Tight, system-ui, sans-serif', textAlign: 'center', lineHeight: 1.15, overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }}>
            {heading}
          </span>
        ) : null}
        {subtitle ? (
          <span style={{ fontSize: `${c.vmin(3)}px`, fontWeight: 500, color: subtitleColor, fontFamily: 'Inter, sans-serif', textAlign: 'center', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }}>
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
};
