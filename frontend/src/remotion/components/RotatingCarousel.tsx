import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';
import { SPRING, TEXT_HALO, elevation, radius } from '../utils/tokens';
import { IconifyIcon } from './IconifyIcon';

type CarouselItem = { icon?: string; label?: string } | string;

interface RotatingCarouselProps extends UniversalProps {
  /** Ítems del carrusel: {icon, label} o texto. */
  items?: CarouselItem[];
  /** Segundos que dura cada slide. */
  interval?: number;
  iconColor?: string;
  labelColor?: string;
  cardColor?: string;
  width?: number;
}

/**
 * RotatingCarousel — carrusel que auto-avanza entre ítems (cada uno con un ícono
 * y/o etiqueta). El ícono aquí es PARTE del componente (un acento por slide), no el
 * protagonista centrado. Útil cuando quieres mostrar varias facetas de un concepto
 * (ej. "café" → varios slides con íconos de café) en vez de un único ícono gigante.
 *
 * Determinista (avance por `frame`), responsive (useCanvas), centrado por contrato.
 */
export const RotatingCarousel: React.FC<RotatingCarouselProps> = ({
  items = [
    { icon: 'mdi:coffee', label: 'Espresso' },
    { icon: 'mdi:coffee-outline', label: 'Latte' },
    { icon: 'mdi:cup', label: 'Cappuccino' },
  ],
  interval = 1.6,
  iconColor = '#ffffff',
  labelColor = '#ffffff',
  cardColor = 'rgba(255,255,255,0.06)',
  width,
  x = 0,
  y = 0,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: cw, height: ch } = useVideoConfig();
  const c = useCanvas();
  const f = Math.max(0, frame - delay);

  // Normalizar ítems.
  const norm = (Array.isArray(items) && items.length > 0 ? items : ['—']).map((it) =>
    typeof it === 'string' ? { label: it } : it,
  );

  const intervalFrames = Math.max(1, Math.round(interval * fps));
  const n = norm.length;
  const elapsedSlides = Math.floor(f / intervalFrames);
  const current = elapsedSlides % n;
  const within = f - elapsedSlides * intervalFrames; // frames dentro del slide actual

  // Entrada/salida de cada slide: entra (slide-up + fade) y sale (fade + up).
  const enterT = interpolate(within, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const exitT = interpolate(within, [intervalFrames - 8, intervalFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const slideOpacity = enterT * (1 - exitT);
  const slideY = (1 - enterT) * c.vmin(4) - exitT * c.vmin(4);

  const item = norm[current];
  const iconSize = c.vmin(16);
  const cardScale = spring({ frame: f, fps, config: SPRING.gentle });
  const resolvedWidth = width ?? c.vw(70);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${ch / 2 + Number(y)}px`,
        left: `${cw / 2 + Number(x)}px`,
        transform: `translate(-50%, -50%) scale(${cardScale})`,
        width: `${resolvedWidth}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: `${c.vmin(3)}px`,
        padding: `${c.vmin(6)}px`,
        backgroundColor: cardColor,
        borderRadius: `${radius('lg', c.vmin)}px`,
        boxShadow: elevation(2, c.vmin),
        zIndex: 40,
      }}
    >
      {/* Slide actual */}
      <div
        style={{
          opacity: slideOpacity,
          transform: `translateY(${slideY}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: `${c.vmin(2.5)}px`,
          minHeight: `${iconSize + c.vmin(8)}px`,
          justifyContent: 'center',
        }}
      >
        {item.icon ? (
          <IconifyIcon inline icon={item.icon} size={iconSize} color={iconColor} />
        ) : null}
        {item.label ? (
          <div
            style={{
              fontFamily: 'Inter Tight, Inter, sans-serif',
              fontWeight: 800,
              fontSize: `${c.vmin(5)}px`,
              color: labelColor,
              textAlign: 'center',
              textShadow: TEXT_HALO,
            }}
          >
            {item.label}
          </div>
        ) : null}
      </div>

      {/* Indicadores (dots) */}
      <div style={{ display: 'flex', gap: `${c.vmin(1.4)}px` }}>
        {norm.map((_, i) => (
          <div
            key={i}
            style={{
              width: `${c.vmin(i === current ? 2.4 : 1.4)}px`,
              height: `${c.vmin(1.4)}px`,
              borderRadius: '999px',
              backgroundColor: i === current ? iconColor : 'rgba(255,255,255,0.3)',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  );
};
