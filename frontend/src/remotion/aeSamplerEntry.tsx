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

interface SubPath {
  points: number[][];
  inTangents: number[][];
  outTangents: number[][];
  closed: boolean;
}

/**
 * Convierte un arco elíptico SVG (A rx ry rot largeArc sweep x2 y2) en segmentos cúbicos bezier
 * (AE no entiende arcos). Endpoint→center parametrization + aproximación bezier (k=4/3·tan(Δ/4)),
 * partiendo en tramos de ≤90°. Devuelve [{c1x,c1y, c2x,c2y, x,y}, ...] (controles + fin de cada cúbica).
 */
function arcToBeziers(
  x1: number, y1: number, rx: number, ry: number, phiDeg: number,
  largeArc: number, sweep: number, x2: number, y2: number,
): { c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number }[] {
  if (!rx || !ry) return [{ c1x: x1, c1y: y1, c2x: x2, c2y: y2, x: x2, y: y2 }];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (phiDeg * Math.PI) / 180;
  const cosP = Math.cos(phi), sinP = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cosP * dx + sinP * dy;
  const y1p = -sinP * dx + cosP * dy;
  let rxs = rx * rx, rys = ry * ry;
  const x1ps = x1p * x1p, y1ps = y1p * y1p;
  const lambda = x1ps / rxs + y1ps / rys;
  if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; rxs = rx * rx; rys = ry * ry; }
  const sign = largeArc !== sweep ? 1 : -1;
  let num = rxs * rys - rxs * y1ps - rys * x1ps;
  if (num < 0) num = 0;
  const co = sign * Math.sqrt(num / (rxs * y1ps + rys * x1ps));
  const cxp = (co * (rx * y1p)) / ry;
  const cyp = (co * -(ry * x1p)) / rx;
  const cx = cosP * cxp - sinP * cyp + (x1 + x2) / 2;
  const cy = sinP * cxp + cosP * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy)) || 1;
    let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const theta1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dTheta = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI;
  if (sweep && dTheta < 0) dTheta += 2 * Math.PI;
  const nSeg = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const delta = dTheta / nSeg;
  const t = (4 / 3) * Math.tan(delta / 4);
  const pt = (a: number) => ({
    x: cx + rx * cosP * Math.cos(a) - ry * sinP * Math.sin(a),
    y: cy + rx * sinP * Math.cos(a) + ry * cosP * Math.sin(a),
  });
  const dv = (a: number) => ({
    x: -rx * cosP * Math.sin(a) - ry * sinP * Math.cos(a),
    y: -rx * sinP * Math.sin(a) + ry * cosP * Math.cos(a),
  });
  const out: { c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number }[] = [];
  let th = theta1, p0 = pt(th);
  for (let s = 0; s < nSeg; s++) {
    const th2 = th + delta;
    const p1 = pt(th2), d0 = dv(th), d1 = dv(th2);
    out.push({ c1x: p0.x + t * d0.x, c1y: p0.y + t * d0.y, c2x: p1.x - t * d1.x, c2y: p1.y - t * d1.y, x: p1.x, y: p1.y });
    th = th2; p0 = p1;
  }
  return out;
}

/**
 * Parsea un `d` (M/L/H/V/C/S/Q/T/Z, abs y rel — sin arcos A) → subpaths de vértices con tangentes
 * de bezier (inTangents/outTangents relativos al vértice), en coordenadas del LIENZO (getScreenCTM
 * → respeta viewBox + transform del padre). Para trazos NATIVOS editables en AE. Quad (Q/T) se
 * convierte a cúbico. Trabaja en coords de usuario y transforma vértices + puntos de control al
 * final (la diferencia transformada = la tangente).
 */
function parsePath(pathEl: SVGPathElement, base: DOMRect): SubPath[] {
  const d = pathEl.getAttribute('d') || '';
  const ctm = pathEl.getScreenCTM();
  const svg = pathEl.ownerSVGElement;
  if (!ctm || !svg) return [];
  const pt = svg.createSVGPoint();
  const toCanvas = (x: number, y: number): number[] => {
    pt.x = x;
    pt.y = y;
    const s = pt.matrixTransform(ctm);
    return [s.x - base.left, s.y - base.top];
  };
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const isCmd = (t: string) => /^[MmLlHhVvCcSsQqTtAaZz]$/.test(t);

  // Vértice con sus puntos de control ABSOLUTOS en coords de usuario (in/out = el vértice si no hay).
  type V = { x: number; y: number; ix: number; iy: number; ox: number; oy: number };
  const subs: { verts: V[]; closed: boolean }[] = [];
  let cur: { verts: V[]; closed: boolean } | null = null;
  let cx = 0, cy = 0, sx = 0, sy = 0, pcx = 0, pcy = 0, prevCmd = '', i = 0;
  const num = () => parseFloat(tokens[i++]);
  const pushV = (x: number, y: number): V => {
    const v: V = { x, y, ix: x, iy: y, ox: x, oy: y };
    cur!.verts.push(v);
    return v;
  };
  const last = (): V => cur!.verts[cur!.verts.length - 1];

  while (i < tokens.length) {
    let cmd = tokens[i];
    if (isCmd(cmd)) i++;
    else cmd = prevCmd === 'M' ? 'L' : prevCmd === 'm' ? 'l' : prevCmd; // repetición implícita
    const rel = cmd >= 'a';
    const C = cmd.toUpperCase();
    if (C === 'M') {
      let x = num(), y = num();
      if (rel) { x += cx; y += cy; }
      cx = x; cy = y; sx = x; sy = y;
      cur = { verts: [], closed: false };
      subs.push(cur);
      pushV(cx, cy);
    } else if (C === 'L') {
      let x = num(), y = num();
      if (rel) { x += cx; y += cy; }
      cx = x; cy = y; pushV(cx, cy);
    } else if (C === 'H') {
      let x = num(); if (rel) x += cx; cx = x; pushV(cx, cy);
    } else if (C === 'V') {
      let y = num(); if (rel) y += cy; cy = y; pushV(cx, cy);
    } else if (C === 'C' || C === 'S') {
      let x1: number, y1: number;
      if (C === 'S') {
        // Control inicial = reflexión del control previo (si el comando previo fue C/S), si no el punto.
        const sm = prevCmd.toUpperCase() === 'C' || prevCmd.toUpperCase() === 'S';
        x1 = sm ? 2 * cx - pcx : cx;
        y1 = sm ? 2 * cy - pcy : cy;
      } else {
        x1 = num(); y1 = num(); if (rel) { x1 += cx; y1 += cy; }
      }
      let x2 = num(), y2 = num(), x = num(), y = num();
      if (rel) { x2 += cx; y2 += cy; x += cx; y += cy; }
      last().ox = x1; last().oy = y1;
      const v = pushV(x, y); v.ix = x2; v.iy = y2;
      pcx = x2; pcy = y2; cx = x; cy = y;
    } else if (C === 'Q' || C === 'T') {
      let qx: number, qy: number;
      if (C === 'T') {
        const sm = prevCmd.toUpperCase() === 'Q' || prevCmd.toUpperCase() === 'T';
        qx = sm ? 2 * cx - pcx : cx;
        qy = sm ? 2 * cy - pcy : cy;
      } else {
        qx = num(); qy = num(); if (rel) { qx += cx; qy += cy; }
      }
      let x = num(), y = num();
      if (rel) { x += cx; y += cy; }
      // Cuadrática → cúbica: control out del prev y control in del nuevo a 2/3 del punto de control.
      last().ox = cx + (2 / 3) * (qx - cx); last().oy = cy + (2 / 3) * (qy - cy);
      const v = pushV(x, y); v.ix = x + (2 / 3) * (qx - x); v.iy = y + (2 / 3) * (qy - y);
      pcx = qx; pcy = qy; cx = x; cy = y;
    } else if (C === 'A') {
      const rx = num(), ry = num(), rot = num(), laf = num(), sf = num();
      let x = num(), y = num();
      if (rel) { x += cx; y += cy; }
      for (const sg of arcToBeziers(cx, cy, rx, ry, rot, laf, sf, x, y)) {
        last().ox = sg.c1x; last().oy = sg.c1y;
        const v = pushV(sg.x, sg.y); v.ix = sg.c2x; v.iy = sg.c2y;
        cx = sg.x; cy = sg.y;
      }
      pcx = cx; pcy = cy;
    } else if (C === 'Z') {
      if (cur) cur.closed = true;
      cx = sx; cy = sy;
    }
    prevCmd = cmd;
  }

  return subs.map((s) => {
    const points: number[][] = [], inT: number[][] = [], outT: number[][] = [];
    for (const v of s.verts) {
      const P = toCanvas(v.x, v.y);
      const I = toCanvas(v.ix, v.iy);
      const O = toCanvas(v.ox, v.oy);
      points.push([Math.round(P[0]), Math.round(P[1])]);
      inT.push([Math.round(I[0] - P[0]), Math.round(I[1] - P[1])]);
      outT.push([Math.round(O[0] - P[0]), Math.round(O[1] - P[1])]);
    }
    return { points, inTangents: inT, outTangents: outT, closed: s.closed };
  });
}

/** Parsea strokeDasharray ("10px 20px" / "10 20") → [dash, gap] en px de lienzo; undefined si none. */
function parseDash(d: string | null, scale: number): number[] | undefined {
  if (!d || d === 'none') return undefined;
  const nums = (d.match(/[\d.]+/g) || []).map((s) => Math.max(1, Math.round(parseFloat(s) * scale)));
  return nums.length ? nums : undefined;
}

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
        // OJO: `|| 1` convertiría escala 0 en 1 (0 es falsy) → el frame 0 de una entrada que crece
        // desde 0 saldría a tamaño completo. Solo caer a 1 si es NaN (matrix inválida).
        const sc = Math.sqrt(p[0] * p[0] + p[1] * p[1]);
        scale = isNaN(sc) ? 1 : sc;
        rotation = Math.round((Math.atan2(p[1], p[0]) * 180) / Math.PI);
      }
      // Color + bgKind: background-color sólido → 'solid'; gradiente en background-image →
      // 'gradient' (1er color); forma SVG → su fill/stroke (OJO: cs.fill da negro por defecto en
      // HTML → solo para SVG); si nada → 'none' (contenedor transparente) y usamos el color del texto.
      const transparent = (c: string) => !c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent' || c === 'none';
      const isSvgShape = !!elx.getAttribute('data-ae-shape');
      let bgKind: 'solid' | 'gradient' | 'none' = 'none';
      let grad: Record<string, any> | undefined; // degradado completo (para Gradient Fill nativo)
      let color = cs.color;
      if (!transparent(cs.backgroundColor)) {
        bgKind = 'solid';
        color = cs.backgroundColor;
      } else {
        const bgi = cs.backgroundImage || '';
        const cm = bgi.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
        if (bgi.includes('gradient') && cm) {
          bgKind = 'gradient';
          color = cm[0];
          // Degradado completo: 1er y último color + tipo + ángulo (para emitir Gradient Fill en AE).
          const all = bgi.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g) || [];
          const am = bgi.match(/(-?\d+(?:\.\d+)?)deg/);
          grad = {
            shape: bgi.includes('radial-gradient') ? 'radial' : 'linear',
            start: all[0],
            end: all[all.length - 1],
            angle: am ? parseFloat(am[1]) : 180,
          };
        } else if (isSvgShape && !transparent(cs.fill)) {
          bgKind = 'solid';
          color = cs.fill;
        } else if (isSvgShape && !transparent(cs.stroke)) {
          bgKind = 'solid';
          color = cs.stroke;
        }
      }
      // Path nativo: parsear el `d` (líneas rectas) a puntos del lienzo + color/ancho del trazo.
      const aeType = elx.getAttribute('data-ae-type') || 'shape';
      let pathExtra: Record<string, any> | undefined;
      if (aeType === 'path') {
        const ctmEl = elx as unknown as SVGGraphicsElement;
        const ctm2 = ctmEl.getScreenCTM ? ctmEl.getScreenCTM() : null;
        const ctmScale = ctm2 ? Math.sqrt(ctm2.a * ctm2.a + ctm2.b * ctm2.b) : 1;
        const filled = !transparent(cs.fill);
        pathExtra = {
          paths: parsePath(elx as unknown as SVGPathElement, base),
          strokeWidth: Math.max(1, Math.round(parseFloat(cs.strokeWidth || '1') * ctmScale)),
          filled,
          dash: parseDash(cs.strokeDasharray, ctmScale),
        };
        color = filled ? cs.fill : !transparent(cs.stroke) ? cs.stroke : cs.color;
      }

      // Formas SVG (circle/ellipse/rect): ¿relleno o SOLO trazo (fill:none + stroke)? + ancho/dash.
      let shapeStroke: Record<string, any> | undefined;
      if (aeType === 'shape' && isSvgShape) {
        const ctmEl = elx as unknown as SVGGraphicsElement;
        const ctm3 = ctmEl.getScreenCTM ? ctmEl.getScreenCTM() : null;
        const cScale = ctm3 ? Math.sqrt(ctm3.a * ctm3.a + ctm3.b * ctm3.b) : 1;
        shapeStroke = {
          filled: !transparent(cs.fill),
          strokeWidth: Math.max(1, Math.round((parseFloat(cs.strokeWidth || '0') || 0) * cScale)),
          dash: parseDash(cs.strokeDasharray, cScale),
        };
      }

      // Opacidad EFECTIVA: en CSS la opacidad se hereda visualmente (un contenedor a 50% hace que
      // sus hijos se vean al 50%). Como podemos SALTAR contenedores (wrappers sin fondo), aquí
      // multiplicamos la opacidad del elemento por la de TODOS sus ancestros (hasta el root) → así
      // un fade-in puesto en el contenedor se conserva en cada hijo.
      let effOpacity = parseFloat(cs.opacity || '1');
      let par = elx.parentElement;
      while (par && par !== rootEl) {
        const pcs = getComputedStyle(par);
        const po = parseFloat(pcs.opacity || '1');
        if (!isNaN(po)) effOpacity *= po;
        // Un padre con transform:scale/rotate ESCALA/ROTA a sus hijos (ej. el check dentro del
        // círculo que hace scale(spring)). El bbox del hijo lo refleja, pero su matrix propia es
        // identidad → hay que multiplicar la escala del padre (y sumar su rotación).
        const pm = pcs.transform && pcs.transform !== 'none' ? pcs.transform.match(/matrix\(([^)]+)\)/) : null;
        if (pm) {
          const pp = pm[1].split(',').map((s) => parseFloat(s));
          const ps = Math.sqrt(pp[0] * pp[0] + pp[1] * pp[1]);
          if (!isNaN(ps)) scale *= ps;
          rotation += Math.round((Math.atan2(pp[1], pp[0]) * 180) / Math.PI);
        }
        par = par.parentElement;
      }
      // boxShadow (formas) o textShadow (texto) → sombra/glow; filter: blur() → desenfoque.
      let shadow: Record<string, any> | undefined;
      const bs = cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : cs.textShadow;
      if (bs && bs !== 'none' && !bs.startsWith('inset')) {
        const seg = bs.split(/,(?![^(]*\))/)[0]; // primera sombra (coma fuera de rgb())
        const col = seg.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
        const px = (seg.replace(/rgba?\([^)]+\)/, '').match(/-?\d+(?:\.\d+)?px/g) || []).map((s) => parseFloat(s));
        if (col) shadow = { color: col[0], x: px[0] || 0, y: px[1] || 0, blur: px[2] || 0 };
      }
      const fm = (cs.filter || '').match(/blur\(([\d.]+)px\)/);
      const blurPx = fm ? parseFloat(fm[1]) : 0;

      // Texto: familia, peso (bold), tracking (letter-spacing) e interlineado (line-height).
      let textStyle: Record<string, any> | undefined;
      if (aeType === 'text') {
        const lh = parseFloat(cs.lineHeight);
        textStyle = {
          fontFamily: (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim(),
          fontWeight: parseInt(cs.fontWeight, 10) || 400,
          letterSpacing: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing) || 0,
          lineHeight: isNaN(lh) ? 0 : Math.round(lh),
        };
      }
      // Forma div: esquinas redondeadas (borderRadius px, no 50%) + borde (border:Npx solid).
      let roundness = 0;
      let border: Record<string, any> | undefined;
      if (aeType === 'shape' && !isSvgShape) {
        const br = cs.borderRadius || '';
        if (!br.includes('50%')) {
          const brpx = parseFloat(br);
          if (brpx > 0) roundness = Math.round(brpx);
        }
        const bw = parseFloat(cs.borderTopWidth || '0') || 0;
        if (bw > 0 && cs.borderTopStyle !== 'none' && !transparent(cs.borderTopColor)) {
          border = { width: Math.round(bw), color: cs.borderTopColor };
        }
      }

      out[id] = {
        type: aeType,
        shape: elx.getAttribute('data-ae-shape') || undefined,
        bgKind,
        grad,
        shadow,
        blur: blurPx || undefined,
        roundness: roundness || undefined,
        border,
        ...(textStyle || {}),
        ...(pathExtra || {}),
        ...(shapeStroke || {}),
        x: Math.round(r.left - base.left + r.width / 2),
        y: Math.round(r.top - base.top + r.height / 2),
        w: Math.round(r.width),
        h: Math.round(r.height),
        opacity: Math.round(effOpacity * 100),
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

  /**
   * Lee el FONDO del contenedor raíz (el AbsoluteFill, primer hijo de #root): color sólido o
   * gradiente (linear/radial) con su color inicial/final. El AbsoluteFill no se etiqueta, por eso
   * se mide aparte. Devuelve null si no hay fondo visible.
   */
  background() {
    const rootEl = document.getElementById('root');
    const fill = rootEl?.firstElementChild as HTMLElement | null;
    if (!fill) return null;
    const cs = getComputedStyle(fill);
    const transp = (c: string) => !c || c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
    const bgImg = cs.backgroundImage || '';
    if (bgImg.includes('gradient')) {
      const colors = bgImg.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g) || [];
      if (colors.length >= 2) {
        let angle = 180;
        const am = bgImg.match(/(-?\d+(?:\.\d+)?)deg/);
        if (am) angle = parseFloat(am[1]);
        let cx = 50, cy = 50;
        const cm = bgImg.match(/at\s+([\d.]+)%\s+([\d.]+)%/);
        if (cm) { cx = parseFloat(cm[1]); cy = parseFloat(cm[2]); }
        return {
          kind: 'gradient',
          shape: bgImg.includes('radial-gradient') ? 'radial' : 'linear',
          start: colors[0],
          end: colors[colors.length - 1],
          angle, cx, cy,
        };
      }
    }
    if (!transp(cs.backgroundColor)) return { kind: 'solid', color: cs.backgroundColor };
    return null;
  },
};
