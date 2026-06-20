import React from 'react';
import { interpolate, useCurrentFrame, Easing } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface StyleTickerProps extends UniversalProps {
  text?: string;
  speed?: number;
  /** Carácter(es) que separan cada repetición / ítem. */
  separator?: string;
  /** Color del separador (vacío = color del texto). */
  separatorColor?: string;
  fontWeight?: number;
  /** Bucle continuo sin fin. false = recorre una vez y se detiene. */
  loop?: boolean;
  /** Dirección del desplazamiento. */
  direction?: 'left' | 'right';
}

export const StyleTicker: React.FC<StyleTickerProps> = ({
  x = 540,
  y = 1800,
  text = 'BTC $45,230 • ETH $3,120 • SOL $98 • AAPL $178 • TSLA $245',
  speed = 2,
  separator = ' • ',
  separatorColor,
  color = '#E2E8F0',
  bgColor = 'rgba(15, 23, 42, 0.8)',
  fontSize = 28,
  fontWeight = 600,
  loop = true,
  direction = 'left',
  opacity: opacityProp = 1,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  // Ancho aproximado de una copia (monospace ≈ 0.6em por carácter).
  const approxCharW = fontSize * 0.6;
  const copyW = Math.max(1, (text.length + separator.length) * approxCharW);
  // Copias suficientes para cubrir pantalla + 1 copia (loop sin huecos).
  const copies = Math.max(3, Math.ceil((c.width + copyW) / copyW) + 1);

  // Desplazamiento: loop = módulo (sin fin); si no, recorre una vez y se detiene.
  const travel = adjustedFrame * speed;
  let offset: number;
  if (loop) {
    const m = travel % copyW;
    offset = direction === 'left' ? -m : m - copyW;
  } else {
    const total = copyW * copies - c.width;
    const once = interpolate(adjustedFrame, [0, total / speed], [0, total], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.linear });
    offset = direction === 'left' ? -once : once;
  }

  const fadeIn = interpolate(adjustedFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sepColor = separatorColor || color;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        transform: 'translate(-50%, -50%)',
        opacity: fadeIn * opacityProp,
        zIndex: 50,
        maxWidth: `${c.vw(100)}px`,
        overflow: 'hidden',
        backgroundColor: bgColor,
        padding: `${fontSize * 0.5}px ${fontSize}px`,
        borderRadius: `${fontSize * 0.4}px`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', whiteSpace: 'nowrap', transform: `translateX(${offset}px)`, fontFamily: 'JetBrains Mono, monospace', fontWeight, fontSize: `${fontSize}px` }}>
        {Array.from({ length: copies }).map((_, i) => (
          <React.Fragment key={i}>
            <span style={{ color }}>{text}</span>
            <span style={{ color: sepColor }}>{separator}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
