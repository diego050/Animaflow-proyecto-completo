import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';
import { SPRING, elevation, radius } from '../utils/tokens';

interface BrandOutroProps extends UniversalProps {
  /** URL del logo (imagen). Opcional. */
  url?: string;
  /** Nombre de la marca. */
  brand?: string;
  /** Handle / @usuario o dominio. */
  handle?: string;
  /** Llamado a la acción (ej: "Síguenos"). */
  cta?: string;
  brandColor?: string;
  accentColor?: string;
  cardColor?: string;
}

/**
 * BrandOutro — tarjeta de cierre: logo + marca + handle + CTA.
 *
 * Pensado para la última escena. Soporta logo-imagen y/o texto. Determinista,
 * responsive (useCanvas), centrado por contrato de coordenadas.
 */
export const BrandOutro: React.FC<BrandOutroProps> = ({
  url = '',
  brand = 'Tu Marca',
  handle = '@tumarca',
  cta = 'Síguenos',
  brandColor = '#0f172a',
  accentColor = '#00FFAB',
  cardColor = '#ffffff',
  x = 0,
  y = 0,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const c = useCanvas();
  const f = Math.max(0, frame - delay * fps);

  const cardScale = spring({ frame: f, fps, config: SPRING.soft });
  const logoT = interpolate(f, [6, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ctaScale = spring({ frame: Math.max(0, f - 14), fps, config: SPRING.bouncy });

  const logoSize = c.vmin(18);

  return (
    <div
      style={{
        position: 'absolute',
        top: `${height / 2 + Number(y)}px`,
        left: `${width / 2 + Number(x)}px`,
        transform: `translate(-50%, -50%) scale(${cardScale})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: `${c.vmin(2.4)}px`,
        padding: `${c.vmin(6)}px ${c.vmin(7)}px`,
        backgroundColor: cardColor,
        borderRadius: `${radius('lg', c.vmin)}px`,
        boxShadow: elevation(3, c.vmin),
        zIndex: 50,
      }}
    >
      {url ? (
        <Img
          src={url}
          style={{
            width: `${logoSize}px`,
            height: `${logoSize}px`,
            objectFit: 'contain',
            opacity: logoT,
            transform: `translateY(${(1 - logoT) * c.vmin(2)}px)`,
          }}
        />
      ) : null}

      {brand ? (
        <div
          style={{
            fontFamily: 'Inter Tight, Inter, sans-serif',
            fontWeight: 900,
            fontSize: `${c.vmin(6.5)}px`,
            color: brandColor,
            letterSpacing: '-0.02em',
            textAlign: 'center',
          }}
        >
          {brand}
        </div>
      ) : null}

      {handle ? (
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: `${c.vmin(3.4)}px`,
            color: accentColor,
            textAlign: 'center',
          }}
        >
          {handle}
        </div>
      ) : null}

      {cta ? (
        <div
          style={{
            transform: `scale(${ctaScale})`,
            marginTop: `${c.vmin(1.5)}px`,
            padding: `${c.vmin(2)}px ${c.vmin(5)}px`,
            backgroundColor: accentColor,
            color: brandColor,
            borderRadius: `${radius('pill', c.vmin)}px`,
            fontFamily: 'Inter Tight, Inter, sans-serif',
            fontWeight: 800,
            fontSize: `${c.vmin(3.6)}px`,
            boxShadow: elevation(2, c.vmin),
          }}
        >
          {cta}
        </div>
      ) : null}
    </div>
  );
};
