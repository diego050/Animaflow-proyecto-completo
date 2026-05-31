import React from 'react';
import { Img } from 'remotion';
import type { UniversalProps } from './types';
import { AnimatedWrapper } from '../AnimatedWrapper';
import type { EntryType, ExitType } from '../AnimatedWrapper';

interface IconifyIconProps extends UniversalProps {
  icon: string;        // "mdi:heart" o "material-symbols:coffee"
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
}

export const IconifyIcon: React.FC<IconifyIconProps> = ({
  icon,
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
}) => {
  // Construir URL de Iconify API
  // El ícono viene en formato "prefix:name" (ej: "mdi:heart")
  const [prefix, name] = icon.includes(':') ? icon.split(':') : ['mdi', icon];
  const encodedColor = encodeURIComponent(color);
  const url = `https://api.iconify.design/${prefix}/${name}.svg?color=${encodedColor}`;

  const element = (
    <div
      style={{
        position: 'absolute',
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        width: `${size * scale}px`,
        height: `${size * scale}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        opacity,
        zIndex: 10,
      }}
    >
      <Img
        src={url}
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
