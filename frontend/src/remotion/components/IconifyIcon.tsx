import React from 'react';
import { Img, useCurrentFrame } from 'remotion';
import type { UniversalProps } from './types';
import { AnimatedWrapper } from '../AnimatedWrapper';
import type { EntryType, ExitType } from '../AnimatedWrapper';
import { idleBreathe } from '../utils/tokens';

interface IconifyIconProps extends UniversalProps {
  icon?: string;       // "mdi:heart" o "material-symbols:coffee"
  size?: number;       // default: 120
  color?: string;      // default: "#ffffff"
  entry?: EntryType;
  exit?: ExitType;
  entryDelay?: number;
  entryDuration?: number;
  exitDuration?: number;
  opacity?: number;
  rotation?: number;
  scale?: number;
  /** Modo inline: se renderiza dentro del flujo (sin position:absolute) para
   *  usarlo DENTRO de otros componentes (badges, botones) sin que se escape. */
  inline?: boolean;
}

export const IconifyIcon: React.FC<IconifyIconProps> = ({
  icon = 'mdi:star',   // default seguro: evita crash si llega undefined
  size = 120,
  color = '#ffffff',
  x = 0,
  y = 0,
  entry = null,
  exit = null,
  entryDelay = 0,
  entryDuration = 30,
  exitDuration = 30,
  opacity = 1,
  rotation = 0,
  scale = 1,
  inline = false,
}) => {
  // Construir URL de Iconify API
  // El ícono viene en formato "prefix:name" (ej: "mdi:heart")
  const safeIcon = icon || 'mdi:star';
  const [prefix, name] = safeIcon.includes(':') ? safeIcon.split(':') : ['mdi', safeIcon];
  const encodedColor = encodeURIComponent(color);
  const url = `https://api.iconify.design/${prefix}/${name}.svg?color=${encodedColor}`;

  // v7: size puede llegar como string ("120") desde el LLM → coercer a número
  // para que size * scale no produzca NaN/concatenación.
  const numericSize = Number(size) || 120;

  // v8 (Fase 4): "respiración" idle sutil. useCurrentFrame() se llama SIEMPRE
  // (regla de hooks); en modo inline no se usa.
  const frame = useCurrentFrame();
  const idle = idleBreathe(frame).scale;

  // Modo inline: img sencillo dentro del flujo (para badges/botones). Sin
  // position:absolute, sin wrapper de animación, sin idle (no aplica).
  if (inline) {
    return (
      <Img
        src={url}
        onError={() => {}}
        style={{
          width: `${numericSize}px`,
          height: `${numericSize}px`,
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          flexShrink: 0,
        }}
      />
    );
  }

  const element = (
    <div
      style={{
        position: 'absolute',
        // x/y = CENTRO absoluto (layoutSolver); translate(-50%) centra.
        left: `${x}px`,
        top: `${y}px`,
        width: `${numericSize * scale}px`,
        height: `${numericSize * scale}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${idle})`,
        opacity,
        zIndex: 10,
      }}
    >
      <Img
        src={url}
        // v7: onError evita que un ícono inaccesible (API pública caída o
        // nombre inexistente) tumbe el render COMPLETO del video. Sin handler,
        // el <Img> de Remotion lanza y aborta el render. TODO (Fase B):
        // self-hostear los SVG desde el VPS para no depender de api.iconify.design.
        onError={() => {}}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );

  return (
    <AnimatedWrapper
      entry={entry}
      exit={exit}
      delay={entryDelay}
      entryDuration={entryDuration}
      exitDuration={exitDuration}
    >
      {element}
    </AnimatedWrapper>
  );
};
