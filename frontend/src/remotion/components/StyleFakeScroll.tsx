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
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // Relativo al lienzo (antes px: itemHeight 80, width 360, fontSize 14/12, icon 40).
  const ih = itemHeight ?? c.vmin(11);
  const containerHeight = ih * visibleItems;
  const totalHeight = ih * items.length;
  const scrollProgress = interpolate(adjustedFrame, [0, totalHeight / speed], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.linear,
  });

  const offsetY = -scrollProgress * (totalHeight - containerHeight);

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const customBg = (style?.backgroundColor as string) ?? 'rgba(30, 41, 59, 0.6)';
  const customBorderRadius = (style?.borderRadius as number) ?? c.vmin(2);
  const customBorderWidth = style?.borderWidth ? `${style.borderWidth}px` : '1px';
  const customBorderColor = (style?.borderColor as string) ?? '#334155';
  const customBorderStyle = (style?.borderStyle as string) ?? 'solid';
  const customWidth = (style?.width as number) ?? c.vw(74);
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;

  const iconBox = c.vmin(8);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        width: `${customWidth}px`,
        height: `${containerHeight}px`,
        backgroundColor: customBg,
        borderRadius: `${customBorderRadius}px`,
        borderWidth: customBorderWidth,
        borderColor: customBorderColor,
        borderStyle: customBorderStyle,
        overflow: 'hidden',
        opacity: customOpacity,
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
              borderBottom: i < items.length - 1 ? '1px solid rgba(51, 65, 85, 0.3)' : 'none',
            }}
          >
            {item.icon && (
              <div style={{ width: iconBox, height: iconBox, borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconifyIcon inline icon={item.icon} size={c.vmin(4.5)} color="#94A3B8" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Inter Tight, sans-serif', fontWeight: 700, fontSize: c.vmin(3), color: '#FFFFFF', marginBottom: c.vmin(0.4) }}>{item.content}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: c.vmin(2.6), color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</div>
            </div>
          </div>
        ))}
      </div>

      {showScrollbar && (
        <div style={{ position: 'absolute', right: c.vmin(0.8), top: c.vmin(1.4), bottom: c.vmin(1.4), width: c.vmin(0.6), backgroundColor: 'rgba(51, 65, 85, 0.3)', borderRadius: 999 }}>
          <div
            style={{
              width: '100%',
              height: `${Math.max(20, (containerHeight / totalHeight) * 100)}%`,
              backgroundColor: '#64748B',
              borderRadius: 999,
              transform: `translateY(${scrollProgress * (100 - (containerHeight / totalHeight) * 100)}%)`,
            }}
          />
        </div>
      )}
    </div>
  );
};
