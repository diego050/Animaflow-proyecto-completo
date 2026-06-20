import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';
import { SPRING, TEXT_HALO, elevation } from '../utils/tokens';

interface LogoRevealProps extends UniversalProps {
  /** URL del logo (imagen). Opcional: si no hay, se usa solo el texto de marca. */
  url?: string;
  /** Nombre/handle de la marca. */
  brand?: string;
  /** Lema opcional bajo la marca. */
  tagline?: string;
  brandColor?: string;
  taglineColor?: string;
  /** Barrido de brillo sobre el logo/marca. */
  shine?: boolean;
}

/**
 * LogoReveal — intro de marca: logo (imagen) + nombre + lema con reveal elegante.
 *
 * Soporta AMBOS: logo-imagen (`url`) y/o texto de marca (`brand`). Determinista,
 * responsive (useCanvas), centrado por contrato de coordenadas.
 */
export const LogoReveal: React.FC<LogoRevealProps> = ({
  url = '',
  brand = 'Tu Marca',
  tagline = '',
  brandColor = '#ffffff',
  taglineColor = '#94a3b8',
  shine = true,
  x,
  y,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const c = useCanvas();
  const f = Math.max(0, frame - delay * fps);

  // Posición ABSOLUTA (contrato de coordenadas). Por defecto, centro del lienzo.
  const posX = typeof x === 'number' ? x : width / 2;
  const posY = typeof y === 'number' ? y : height / 2;

  // Logo: spring pop-in. Marca: fade/slide tras el logo. Lema: después.
  const logoScale = spring({ frame: f, fps, config: SPRING.pop });
  const brandT = interpolate(f, [8, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const taglineT = interpolate(f, [18, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Barrido de brillo (una pasada).
  const shineX = interpolate(f, [10, 40], [-120, 120], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const shineOpacity = interpolate(f, [10, 25, 40], [0, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const logoSize = c.vmin(26);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${posY}px`,
        left: `${posX}px`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: `${c.vmin(3)}px`,
        zIndex: 50,
      }}
    >
      {url ? (
        <div style={{ position: 'relative', transform: `scale(${logoScale})`, overflow: 'hidden', borderRadius: `${c.vmin(4)}px` }}>
          <Img
            src={url}
            style={{ width: `${logoSize}px`, height: `${logoSize}px`, objectFit: 'contain', filter: `drop-shadow(${elevation(2, c.vmin)})` }}
          />
          {shine && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: `${shineX}%`,
                width: '40%',
                height: '100%',
                background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.85), transparent)',
                opacity: shineOpacity,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      ) : null}

      {brand ? (
        <div
          style={{
            transform: `translateY(${(1 - brandT) * c.vmin(3)}px) scale(${url ? 1 : logoScale})`,
            opacity: brandT,
            fontFamily: 'Inter Tight, Inter, sans-serif',
            fontWeight: 900,
            fontSize: `${c.vmin(url ? 7 : 11)}px`,
            color: brandColor,
            letterSpacing: '-0.02em',
            textShadow: TEXT_HALO,
            textAlign: 'center',
          }}
        >
          {brand}
        </div>
      ) : null}

      {tagline ? (
        <div
          style={{
            opacity: taglineT,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: `${c.vmin(3.4)}px`,
            color: taglineColor,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            textShadow: TEXT_HALO,
            textAlign: 'center',
          }}
        >
          {tagline}
        </div>
      ) : null}
    </div>
  );
};
