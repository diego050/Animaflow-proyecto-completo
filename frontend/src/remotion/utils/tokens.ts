/**
 * tokens.ts — Design & Motion tokens (Fase 4).
 *
 * Fuente única del "lenguaje visual" para que los componentes compartan
 * sombras, radios, tiempos y físicas de animación coherentes (en vez de
 * inventar valores sueltos en cada archivo). Reemplaza hex/px/springs mágicos.
 *
 * Determinista: solo constantes y helpers puros (sin estado, sin random).
 * Tamaños espaciales → usar junto a `useCanvas()` (vmin/vw) para responsividad.
 */

// ── Físicas de resorte (para remotion-animated / spring) ─────────────────────
// Cada preset es un par {damping, stiffness} tuneado. Un buen motion-graphics
// vive de springs con un leve overshoot y asentamiento, no de easing lineal.
export const SPRING = {
  /** Entrada suave, sin rebote — para texto/bloques grandes. */
  soft: { damping: 18, stiffness: 90, mass: 1 },
  /** Pop con leve overshoot — para badges, iconos, acentos. */
  pop: { damping: 12, stiffness: 140, mass: 1 },
  /** Rebote marcado — para CTAs/elementos juguetones. */
  bouncy: { damping: 9, stiffness: 170, mass: 1 },
  /** Entrada lenta y elegante — para fondos/cards grandes. */
  gentle: { damping: 22, stiffness: 60, mass: 1.1 },
} as const;

export type SpringPreset = keyof typeof SPRING;

// ── Duraciones (en FRAMES @30fps — el renderer usa frames) ───────────────────
export const DURATION = {
  fast: 8,
  base: 15,
  slow: 24,
} as const;

// ── Elevación / sombras (profundidad) ────────────────────────────────────────
// Escalan con el lienzo: pasar `vmin` desde useCanvas() para resolución-independencia.
export function elevation(level: 1 | 2 | 3, vmin: (p: number) => number): string {
  switch (level) {
    case 1:
      return `0 ${vmin(0.4)}px ${vmin(1.2)}px rgba(0,0,0,0.25)`;
    case 2:
      return `0 ${vmin(0.9)}px ${vmin(2.6)}px rgba(0,0,0,0.32)`;
    case 3:
      return `0 ${vmin(1.6)}px ${vmin(4.5)}px rgba(0,0,0,0.42)`;
  }
}

// ── Halo de texto (separa el texto de cualquier fondo) ───────────────────────
export const TEXT_HALO = '0 0 6px rgba(0,0,0,0.9), 0 3px 14px rgba(0,0,0,0.7)';

// ── Radios (fracción de vmin) ────────────────────────────────────────────────
export function radius(size: 'sm' | 'md' | 'lg' | 'pill', vmin: (p: number) => number): number {
  switch (size) {
    case 'sm': return vmin(0.8);
    case 'md': return vmin(1.4);
    case 'lg': return vmin(2.4);
    case 'pill': return 9999;
  }
}

// ── Movimiento idle (vida sutil tras la entrada) ─────────────────────────────
// Determinista: función pura de `frame`. Devuelve transform sutil de "respiración"
// para que un elemento ya visible no quede 100% estático. Amplitud pequeña.
export function idleBreathe(frame: number, opts?: { amp?: number; periodFrames?: number }): { scale: number } {
  const amp = opts?.amp ?? 0.012; // ±1.2%
  const period = opts?.periodFrames ?? 120; // ~4s a 30fps
  const phase = (2 * Math.PI * frame) / period;
  return { scale: 1 + amp * Math.sin(phase) };
}

/** Drift idle vertical sutil (px), determinista. */
export function idleDriftY(frame: number, opts?: { amp?: number; periodFrames?: number }): number {
  const amp = opts?.amp ?? 6;
  const period = opts?.periodFrames ?? 150;
  return amp * Math.sin((2 * Math.PI * frame) / period);
}
