import React from 'react';
import { Img, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import type { UniversalProps } from './types';

export interface WordTiming {
  word: string;
  start: number; // segundos, relativo al inicio de la escena
  end: number;
}

export interface KeywordPopProps extends UniversalProps {
  /** Ícono Iconify, ej: "mdi:fire". */
  icon?: string;
  /** Palabra del guion en la que debe aparecer. Si no se da o no se encuentra,
   *  aparece al inicio de la escena. */
  triggerWord?: string;
  size?: number;
  color?: string;
  /** Brillo/halo detrás del ícono (0 = sin glow). */
  glow?: number;
  wordTimestamps?: WordTiming[];
}

/** Normaliza una palabra para comparar (minúsculas, sin signos). */
function norm(w: string): string {
  return (w || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * KeywordPop — un ícono que permanece OCULTO hasta que se pronuncia su
 * `triggerWord`, y entonces aparece con un "pop" (escala + fade) sincronizado al
 * audio vía `wordTimestamps`. Realiza la idea de "encender algo en una palabra".
 *
 * Determinista. Self-animado: NO debe envolverse en una entrada por defecto del
 * pipeline (ver SELF_ANIMATED en el backend). Si no encuentra la palabra, aparece
 * al inicio de la escena como fallback.
 */
export const KeywordPop: React.FC<KeywordPopProps> = ({
  icon = 'mdi:fire', // default seguro: evita crash si llega undefined
  triggerWord,
  x = 540,
  y = 960,
  size = 160,
  color = '#ffffff',
  glow = 0,
  wordTimestamps,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Frame en el que se pronuncia la palabra clave (0 = inicio de escena si no se halla).
  let triggerFrame = 0;
  if (triggerWord && wordTimestamps && wordTimestamps.length > 0) {
    const target = norm(triggerWord);
    const hit = wordTimestamps.find((w) => {
      const ww = norm(w.word);
      return ww === target || (target.length >= 3 && (ww.includes(target) || target.includes(ww)));
    });
    if (hit) triggerFrame = Math.round(hit.start * fps);
  }

  const local = frame - triggerFrame;
  if (local < 0) return null; // aún no se pronuncia → oculto

  // Pop: escala con resorte + fade lineal corto.
  const appear = spring({
    frame: local,
    fps,
    config: { damping: 11, stiffness: 140, mass: 0.6 },
  });
  const scale = 0.4 + 0.6 * appear; // 0.4 → ~1 con leve overshoot
  const opacity = interpolate(local, [0, 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const safeIcon = icon || 'mdi:fire';
  const [prefix, name] = safeIcon.includes(':') ? safeIcon.split(':') : ['mdi', safeIcon];
  const url = `https://api.iconify.design/${prefix}/${name}.svg?color=${encodeURIComponent(color)}`;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        filter: glow > 0 ? `drop-shadow(0 0 ${glow}px ${color})` : undefined,
        zIndex: 20,
      }}
    >
      <Img
        src={url}
        onError={() => {}}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
};
