import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { IconifyIcon } from './IconifyIcon';

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
    { content: 'Mar\u00eda Garc\u00eda', subtitle: '\u2b50\u2b50\u2b50\u2b50\u2b50 Incre\u00edble producto!', icon: 'mdi:account' },
    { content: 'Carlos L\u00f3pez', subtitle: 'Muy recomendado, 10/10', icon: 'mdi:account-tie' },
    { content: 'Ana Mart\u00ednez', subtitle: 'Excelente servicio al cliente', icon: 'mdi:account-star' },
    { content: 'Pedro S\u00e1nchez', subtitle: 'Lo uso todos los d\u00edas', icon: 'mdi:account' },
    { content: 'Laura Torres', subtitle: 'Mejor que la competencia', icon: 'mdi:account-check' },
  ],
  speed = 1,
  itemHeight = 80,
  visibleItems = 3,
  showScrollbar = true,
  style,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const containerHeight = itemHeight * visibleItems;
  const totalHeight = itemHeight * items.length;
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
  const customBorderRadius = (style?.borderRadius as number) ?? 12;
  const customBorderWidth = style?.borderWidth ? `${style.borderWidth}px` : '1px';
  const customBorderColor = (style?.borderColor as string) ?? '#334155';
  const customBorderStyle = (style?.borderStyle as string) ?? 'solid';
  const customWidth = (style?.width as number) ?? 360;
  const customOpacity = style?.opacity !== undefined ? (style.opacity as number) * opacity : opacity;

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
              height: `${itemHeight}px`,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: i < items.length - 1 ? '1px solid rgba(51, 65, 85, 0.3)' : 'none',
            }}
          >
            {item.icon && (
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconifyIcon icon={item.icon} size={20} color="#94A3B8" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Inter Tight, sans-serif', fontWeight: 700, fontSize: 14, color: '#FFFFFF', marginBottom: 2 }}>{item.content}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</div>
            </div>
          </div>
        ))}
      </div>

      {showScrollbar && (
        <div style={{ position: 'absolute', right: 4, top: 8, bottom: 8, width: 3, backgroundColor: 'rgba(51, 65, 85, 0.3)', borderRadius: 2 }}>
          <div
            style={{
              width: '100%',
              height: `${Math.max(20, (containerHeight / totalHeight) * 100)}%`,
              backgroundColor: '#64748B',
              borderRadius: 2,
              transform: `translateY(${scrollProgress * (100 - (containerHeight / totalHeight) * 100)}%)`,
              transition: 'transform 0.1s linear',
            }}
          />
        </div>
      )}
    </div>
  );
};
