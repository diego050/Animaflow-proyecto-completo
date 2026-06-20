import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { IconifyIcon } from './IconifyIcon';
import { useCanvas } from '../utils/canvas';

interface ScrollItem {
  content: string;
  icon?: string;
  subtitle?: string;
}

interface StyleFakeScrollProps extends UniversalProps {
  items?: ScrollItem[];
  speed?: number;
  itemHeight?: number;
  visibleItems?: number;
  showScrollbar?: boolean;
  /** Colores. */
  borderColor?: string;
  borderWidth?: number;
  titleColor?: string;
  subtitleColor?: string;
  iconBgColor?: string;
  iconColor?: string;
  scrollbarColor?: string;
  /** Tamaños de texto (px). */
  titleSize?: number;
  subtitleSize?: number;
  /** Ancho del contenedor (px). */
  width?: number;
  /** Radio de esquinas (px). */
  borderRadius?: number;
  style?: Record<string, unknown>;
}

export const StyleFakeScroll: React.FC<StyleFakeScrollProps> = ({
  x = 540,
  y = 960,
  items = [
    { content: 'María García', subtitle: '⭐⭐⭐⭐⭐ Increíble producto!', icon: 'mdi:account' },
    { content: 'Carlos López', subtitle: 'Muy recomendado, 10/10', icon: 'mdi:account-tie' },
    { content: 'Ana Martínez', subtitle: 'Excelente servicio al cliente', icon: 'mdi:account-star' },
    { content: 'Pedro Sánchez', subtitle: 'Lo uso todos los días', icon: 'mdi:account' },
    { content: 'Laura Torres', subtitle: 'Mejor que la competencia', icon: 'mdi:account-check' },
  ],
  speed = 1,
  itemHeight,
  visibleItems = 3,
  showScrollbar = true,
  bgColor = 'rgba(30, 41, 59, 0.6)',
  borderColor = '#334155',
  borderWidth = 1,
  titleColor = '#FFFFFF',
  subtitleColor = '#94A3B8',
  iconBgColor = '#334155',
  iconColor = '#94A3B8',
  scrollbarColor = '#64748B',
  titleSize,
  subtitleSize,
  width,
  borderRadius,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const ih = itemHeight && itemHeight > 0 ? itemHeight : c.vmin(11);
  const containerHeight = ih * visibleItems;
  const totalHeight = ih * items.length;
  const scrollProgress = interpolate(adjustedFrame, [0, totalHeight / speed], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.linear });
  const offsetY = -scrollProgress * (totalHeight - containerHeight);
  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cardW = width && width > 0 ? width : c.vw(74);
  const radius = borderRadius && borderRadius > 0 ? borderRadius : c.vmin(2);
  const iconBox = c.vmin(8);
  const tSize = titleSize && titleSize > 0 ? titleSize : c.vmin(3);
  const sSize = subtitleSize && subtitleSize > 0 ? subtitleSize : c.vmin(2.6);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${cardW}px`,
        height: `${containerHeight}px`,
        backgroundColor: bgColor,
        borderRadius: `${radius}px`,
        border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : 'none',
        overflow: 'hidden',
        opacity,
        zIndex: 50,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', transform: `translateY(${offsetY}px)` }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              height: `${ih}px`,
              padding: `${c.vmin(2)}px ${c.vmin(2.6)}px`,
              display: 'flex',
              alignItems: 'center',
              gap: `${c.vmin(2)}px`,
              borderBottom: i < items.length - 1 ? `1px solid ${borderColor}55` : 'none',
              boxSizing: 'border-box',
            }}
          >
            {item.icon && (
              <div style={{ width: iconBox, height: iconBox, borderRadius: '50%', backgroundColor: iconBgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconifyIcon inline icon={item.icon} size={c.vmin(4.5)} color={iconColor} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Inter Tight, sans-serif', fontWeight: 700, fontSize: `${tSize}px`, color: titleColor, marginBottom: c.vmin(0.4) }}>{item.content}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: `${sSize}px`, color: subtitleColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</div>
            </div>
          </div>
        ))}
      </div>

      {showScrollbar && (
        <div style={{ position: 'absolute', right: c.vmin(0.8), top: c.vmin(1.4), bottom: c.vmin(1.4), width: c.vmin(0.6), backgroundColor: `${scrollbarColor}55`, borderRadius: 999 }}>
          <div
            style={{
              width: '100%',
              height: `${Math.max(20, (containerHeight / totalHeight) * 100)}%`,
              backgroundColor: scrollbarColor,
              borderRadius: 999,
              transform: `translateY(${scrollProgress * (100 - (containerHeight / totalHeight) * 100)}%)`,
            }}
          />
        </div>
      )}
    </div>
  );
};
