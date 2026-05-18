import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-surface flex bg-grid-dots relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-mint/5 blur-[100px] pointer-events-none" />

      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 xl:p-16 relative">
        <div className="absolute inset-0 opacity-[0.03]">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={`h-${i}`} className="absolute w-full border-t border-on-surface" style={{ top: `${i * 5}%` }} />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={`v-${i}`} className="absolute h-full border-l border-on-surface" style={{ left: `${i * 5}%` }} />
          ))}
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-panel border border-border-tech flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="2" width="28" height="28" rx="4" stroke="#b5c8df" strokeWidth="2" />
              <circle cx="16" cy="16" r="4" fill="#00FFAB" />
              <line x1="2" y1="16" x2="12" y2="16" stroke="#b5c8df" strokeWidth="1.5" />
              <line x1="20" y1="16" x2="30" y2="16" stroke="#b5c8df" strokeWidth="1.5" />
            </svg>
          </div>
          <span className="font-display text-xl font-bold text-on-surface tracking-tight">AnimaFlow</span>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint/10 border border-mint/20">
            <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
            <span className="text-mint text-xs font-mono font-medium tracking-wide uppercase">Pipeline Activo</span>
          </div>
          <h2 className="font-display text-4xl xl:text-5xl font-bold text-on-surface leading-[1.1] tracking-tight">
            Texto a video.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-mint">Frame a frame.</span>
          </h2>
          <p className="text-on-surface-variant text-base leading-relaxed max-w-md">
            Convierte guiones en proyectos de video editables con sincronizacion frame-accurate, generacion inteligente de animaciones y exportacion profesional.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {['TTS + Timestamps', 'LLM Correction', 'spec.json', 'Remotion 30fps'].map((tag) => (
              <span key={tag} className="px-3 py-1.5 rounded-md bg-surface-high/50 border border-border-tech text-on-surface-variant text-xs font-mono">{tag}</span>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-8">
          <div>
            <p className="font-mono text-2xl font-bold text-mint">30fps</p>
            <p className="text-on-surface-variant text-xs mt-1">Frame Accuracy</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-primary">~7s</p>
            <p className="text-on-surface-variant text-xs mt-1">Chunk Size</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-secondary">2</p>
            <p className="text-on-surface-variant text-xs mt-1">Export Formats</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 sm:p-8 relative">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-panel border border-border-tech flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <rect x="2" y="2" width="28" height="28" rx="4" stroke="#b5c8df" strokeWidth="2" />
                <circle cx="16" cy="16" r="4" fill="#00FFAB" />
                <line x1="2" y1="16" x2="12" y2="16" stroke="#b5c8df" strokeWidth="1.5" />
                <line x1="20" y1="16" x2="30" y2="16" stroke="#b5c8df" strokeWidth="1.5" />
              </svg>
            </div>
            <span className="font-display text-xl font-bold text-on-surface tracking-tight">AnimaFlow</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
