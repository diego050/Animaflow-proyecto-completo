/**
 * Entry del SAMPLER de After Effects (Etapa 2 del traductor AE). Se empaqueta con esbuild en el
 * render-server y se carga en una pestaña de Chrome (el mismo navegador de Remotion). Monta la
 * animación con un "Remotion de mentira" (frame controlado por nosotros) y expone una API global
 * para girar el frame y MEDIR cada elemento `[data-ae-id]`. NO usa el runtime real de Remotion
 * (controlamos el frame); las matemáticas (interpolate/spring/random) SÍ son las reales.
 *
 * Corre SOLO en el navegador del render-server (no se importa en la app).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { interpolate, spring, random, Easing, interpolateColors } from 'remotion';

let currentFrame = 0;
let cfg = { fps: 30, width: 1080, height: 1920, durationInFrames: 1 };

const useCurrentFrame = () => currentFrame;
const useVideoConfig = () => ({
  fps: cfg.fps,
  width: cfg.width,
  height: cfg.height,
  durationInFrames: cfg.durationInFrames,
  id: 'ae',
  defaultProps: {},
  props: {},
});

const AbsoluteFill: React.FC<any> = React.forwardRef((props: any, ref: any) =>
  React.createElement('div', {
    ref,
    ...props,
    style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', ...(props.style || {}) },
  }),
) as any;

const passthrough = ({ children }: any) => React.createElement(React.Fragment, null, children);
const Series: any = passthrough;
Series.Sequence = passthrough;

// Shim de 'remotion': hooks/contenedores fingidos + matemáticas REALES.
const remotionShim: any = {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  Sequence: passthrough,
  Series,
  Freeze: passthrough,
  Loop: passthrough,
  Audio: () => null,
  Video: () => null,
  OffthreadVideo: () => null,
  Img: (p: any) => React.createElement('img', p),
  staticFile: (s: string) => s,
  delayRender: () => 0,
  continueRender: () => {},
  cancelRender: () => {},
  random,
  interpolate,
  spring,
  Easing,
  interpolateColors,
};

let root: Root | null = null;
let Comp: React.FC | null = null;

(window as any).__ae = {
  /** Compila/evalúa el JS (ya transpilado por sucrase) y monta el componente. */
  mount(jsString: string, dims: Partial<typeof cfg>) {
    cfg = { ...cfg, ...dims };
    const moduleObj: any = { exports: {} };
    const req = (name: string) => {
      if (name === 'react') return React;
      if (name === 'remotion') return remotionShim;
      throw new Error('Import no permitido: ' + name);
    };
    // eslint-disable-next-line no-new-func
    const fn = new Function('require', 'module', 'exports', 'React', jsString);
    fn(req, moduleObj, moduleObj.exports, React);
    const exp = moduleObj.exports;
    Comp = exp.Animation || exp.default || Object.values(exp).find((v: any) => typeof v === 'function');
    if (!Comp) throw new Error('el código no exporta un componente');

    const el = document.getElementById('root')!;
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.style.width = cfg.width + 'px';
    el.style.height = cfg.height + 'px';
    root = createRoot(el);
    // Render de CALENTAMIENTO: el primer render tras createRoot puede dar medidas inestables
    // (el transform aún no aplicado → frame 0 mide tamaño completo). Con un render previo, el
    // setFrame(0) del muestreo ya mide estable.
    flushSync(() => root!.render(React.createElement(Comp!)));
    return true;
  },

  /** Pone la animación en el frame f (re-render síncrono). */
  setFrame(f: number) {
    currentFrame = f;
    flushSync(() => root!.render(React.createElement(Comp!)));
  },

  /** Mide cada [data-ae-id]: centro (x,y), tamaño, opacidad, color, escala/rotación. */
  measure() {
    const rootEl = document.getElementById('root')!;
    const base = rootEl.getBoundingClientRect();
    const out: Record<string, any> = {};
    rootEl.querySelectorAll('[data-ae-id]').forEach((node) => {
      const elx = node as HTMLElement;
      const r = elx.getBoundingClientRect();
      const cs = getComputedStyle(elx);
      const id = elx.getAttribute('data-ae-id') || '';
      // transform → escala + rotación (matrix(a,b,c,d,e,f))
      let scale = 1;
      let rotation = 0;
      const m = cs.transform && cs.transform !== 'none' ? cs.transform.match(/matrix\(([^)]+)\)/) : null;
      if (m) {
        const p = m[1].split(',').map(parseFloat);
        scale = Math.sqrt(p[0] * p[0] + p[1] * p[1]) || 1;
        rotation = Math.round((Math.atan2(p[1], p[0]) * 180) / Math.PI);
      }
      // Color + bgKind: background-color sólido → 'solid'; gradiente en background-image →
      // 'gradient' (1er color); forma SVG → su fill/stroke (OJO: cs.fill da negro por defecto en
      // HTML → solo para SVG); si nada → 'none' (contenedor transparente) y usamos el color del texto.
      const transparent = (c: string) => !c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent' || c === 'none';
      const isSvgShape = !!elx.getAttribute('data-ae-shape');
      let bgKind: 'solid' | 'gradient' | 'none' = 'none';
      let color = cs.color;
      if (!transparent(cs.backgroundColor)) {
        bgKind = 'solid';
        color = cs.backgroundColor;
      } else {
        const cm = (cs.backgroundImage || '').match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
        if ((cs.backgroundImage || '').includes('gradient') && cm) {
          bgKind = 'gradient';
          color = cm[0];
        } else if (isSvgShape && !transparent(cs.fill)) {
          bgKind = 'solid';
          color = cs.fill;
        } else if (isSvgShape && !transparent(cs.stroke)) {
          bgKind = 'solid';
          color = cs.stroke;
        }
      }
      out[id] = {
        type: elx.getAttribute('data-ae-type') || 'shape',
        shape: elx.getAttribute('data-ae-shape') || undefined,
        bgKind,
        x: Math.round(r.left - base.left + r.width / 2),
        y: Math.round(r.top - base.top + r.height / 2),
        w: Math.round(r.width),
        h: Math.round(r.height),
        opacity: Math.round(parseFloat(cs.opacity || '1') * 100),
        scale: Math.round(scale * 100) / 100,
        rotation,
        color,
        borderRadius: cs.borderRadius,
        text: elx.getAttribute('data-ae-type') === 'text' ? (elx.textContent || '').trim().slice(0, 120) : undefined,
        fontSize: cs.fontSize,
      };
    });
    return out;
  },
};
