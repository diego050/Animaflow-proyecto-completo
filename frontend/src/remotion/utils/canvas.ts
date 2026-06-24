/**
 * canvas.ts — Contrato de RESPONSIVIDAD para componentes Remotion (Fase 2).
 *
 * PROBLEMA QUE RESUELVE: los componentes hardcodeaban tamaños en px (ej.
 * `width: 300px`, `fontSize: 24`), por lo que se veían mal o diminutos según el
 * aspect ratio (9:16, 1:1, 16:9, 4:5…). `useVideoConfig()` ya expone el tamaño
 * del lienzo dentro de una composición Remotion; lo que faltaba era una
 * CONVENCIÓN para derivar tamaños del lienzo de forma consistente.
 *
 * CONVENCIÓN (úsala en todo componente nuevo o al hacerlo responsivo):
 *   - NUNCA uses px absolutos para tamaños estructurales (anchos de cajas,
 *     fontSize, gap, padding, radios, iconos). Derívalos del lienzo con los
 *     helpers de abajo.
 *   - `vw(pct)` / `vh(pct)`  → porcentaje del ancho / alto del lienzo.
 *   - `vmin(pct)`            → porcentaje de la dimensión MENOR. Úsalo para
 *     fontSize, iconos y todo lo que deba tener el MISMO tamaño físico en
 *     vertical y horizontal (es el helper por defecto para tipografía).
 *   - `vmax(pct)`            → porcentaje de la dimensión MAYOR (poco común).
 *   - Layout direccional: usa `isLandscape` para elegir fila vs columna
 *     (vertical/cuadrado → apilar en columna; horizontal → fila).
 *
 * Esto NO reemplaza el contrato de coordenadas (x/y + translate(-50%,-50%)),
 * ver `docs/coordinate-contract.md`. Es complementario: x/y posiciona, esta
 * convención dimensiona.
 *
 * Determinismo: derivado de `useVideoConfig()`, 100% determinista.
 */
import { useVideoConfig } from 'remotion';

export type Orientation = 'portrait' | 'landscape' | 'square';

export interface CanvasInfo {
  /** Ancho del lienzo en px (1080, 1920, …). */
  width: number;
  /** Alto del lienzo en px. */
  height: number;
  /** width / height. */
  aspectRatio: number;
  /** 'portrait' | 'landscape' | 'square'. */
  orientation: Orientation;
  /** true si NO es horizontal (vertical o cuadrado → apilar en columna). */
  isPortrait: boolean;
  /** true si es claramente horizontal (→ disponer en fila). */
  isLandscape: boolean;
  /** Porcentaje del ANCHO → px. vw(50) = mitad del ancho del lienzo. */
  vw: (pct: number) => number;
  /** Porcentaje del ALTO → px. */
  vh: (pct: number) => number;
  /** Porcentaje de la dimensión MENOR → px. Default para fontSize/iconos. */
  vmin: (pct: number) => number;
  /** Porcentaje de la dimensión MAYOR → px. */
  vmax: (pct: number) => number;
}

/**
 * Hook de canvas para componentes responsivos. Debe llamarse dentro de una
 * composición Remotion (lo está: AnimaComposer → componentes; y el Player del
 * Playground también provee useVideoConfig).
 */
export function useCanvas(): CanvasInfo {
  const { width, height } = useVideoConfig();
  const aspectRatio = width / height;
  const minD = Math.min(width, height);
  const maxD = Math.max(width, height);

  const orientation: Orientation =
    aspectRatio > 1.05 ? 'landscape' : aspectRatio < 0.95 ? 'portrait' : 'square';

  return {
    width,
    height,
    aspectRatio,
    orientation,
    isLandscape: aspectRatio > 1.05,
    isPortrait: aspectRatio <= 1.05, // vertical y cuadrado se apilan en columna
    vw: (pct) => (width * pct) / 100,
    vh: (pct) => (height * pct) / 100,
    vmin: (pct) => (minD * pct) / 100,
    vmax: (pct) => (maxD * pct) / 100,
  };
}
