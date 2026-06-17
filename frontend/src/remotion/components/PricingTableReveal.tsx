import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { UniversalProps } from "./types";
import { useCanvas } from '../utils/canvas';

interface PricingTableRevealProps extends UniversalProps {
  tier1?: string;
  tier2?: string;
  tier3?: string;
  price1?: string;
  price2?: string;
  price3?: string;
  highlightColor?: string;
}

export const PricingTableReveal: React.FC<PricingTableRevealProps> = ({
  tier1 = 'Starter',
  tier2 = 'Pro',
  tier3 = 'Enterprise',
  price1 = '$0',
  price2 = '$29',
  price3 = '$99',
  highlightColor = '#3b82f6',
  bgColor = '#1e293b',
  textColor = '#ffffff',
  x = 540,
  y = 540,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useCanvas();
  const adjustedFrame = Math.max(0, frame - delay);

  const scale1 = spring({ frame: adjustedFrame, fps, config: { damping: 14 } });
  const scale3 = spring({ frame: Math.max(0, adjustedFrame - 10), fps, config: { damping: 14 } });
  const scale2 = spring({ frame: Math.max(0, adjustedFrame - 20), fps, config: { damping: 12, mass: 1.2 } });

  // Relativo al lienzo (antes px: width 250, fontSize 14-64, padding 40/20).
  const Card = ({ tier, price, scale, isHighlight }: { tier: string; price: string; scale: number; isHighlight?: boolean }) => (
    <div style={{ transform: `scale(${scale})`, width: `${c.vw(29)}px`, backgroundColor: isHighlight ? highlightColor : bgColor, color: isHighlight ? '#ffffff' : textColor, padding: `${c.vmin(5)}px ${c.vmin(2.6)}px`, borderRadius: `${c.vmin(2.4)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: isHighlight ? `0 20px 40px ${highlightColor}80` : '0 10px 20px rgba(0,0,0,0.2)', border: isHighlight ? 'none' : '1px solid #334155', zIndex: isHighlight ? 10 : 1, position: 'relative' }}>
      {isHighlight && (
        <div style={{ position: 'absolute', top: `${-c.vmin(2.4)}px`, backgroundColor: '#ffffff', color: highlightColor, padding: `${c.vmin(1)}px ${c.vmin(2.4)}px`, borderRadius: '999px', fontSize: `${c.vmin(2.4)}px`, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Most Popular
        </div>
      )}

      <div style={{ fontSize: `${c.vmin(3.6)}px`, fontWeight: 'bold', marginBottom: `${c.vmin(2.6)}px`, opacity: 0.9 }}>{tier}</div>
      <div style={{ fontSize: `${c.vmin(8)}px`, fontWeight: 900, marginBottom: `${c.vmin(1.4)}px` }}>{price}</div>
      <div style={{ fontSize: `${c.vmin(2.6)}px`, opacity: 0.7, marginBottom: `${c.vmin(4)}px` }}>/ month</div>

      <div style={{ width: '85%', height: `${c.vmin(6.5)}px`, backgroundColor: isHighlight ? '#ffffff' : '#334155', color: isHighlight ? highlightColor : '#ffffff', borderRadius: `${c.vmin(1.4)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: `${c.vmin(3)}px` }}>
        Get Started
      </div>
    </div>
  );

  return (
    <div style={{ position: 'absolute', top: `${y}px`, left: `${x}px`, transform: `translate(-50%, -50%)`, display: 'flex', gap: `${c.vmin(2.6)}px`, alignItems: 'center', fontFamily: 'Inter, sans-serif', zIndex: 50 }}>
      <Card tier={tier1} price={price1} scale={scale1} />
      <Card tier={tier2} price={price2} scale={scale2} isHighlight />
      <Card tier={tier3} price={price3} scale={scale3} />
    </div>
  );
};
