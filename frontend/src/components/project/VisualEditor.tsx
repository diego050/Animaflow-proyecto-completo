import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { X, MousePointerClick, ChevronsUp, ChevronsDown } from 'lucide-react';
import { CustomCode } from '../../remotion/CustomCode';
import { compileAnimation } from '../../remotion/compileAnimation';
import { tagElements } from '../../remotion/aeTranslator';
import {
  analyzeByElement, applyValueRef, setElementMargin, setElementSizePx, setElementZIndex, type ValueRef,
} from '../../remotion/groupDetector';

const FONT_LIST = [
  'Inter', 'Roboto', 'Montserrat', 'Poppins', 'Open Sans', 'Lato', 'Oswald', 'Raleway',
  'Playfair Display', 'Bebas Neue', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New',
];
const WEIGHTS: [string, string][] = [
  ['300', 'Light'], ['400', 'Regular'], ['500', 'Medium'], ['600', 'SemiBold'],
  ['700', 'Bold'], ['800', 'ExtraBold'], ['900', 'Black'],
];
const SNAP = 8; // px de pantalla para snap al centro del lienzo
const RGB_RE = /^rgba?\(/i;
const rgbToHexC = (c: string): string => {
  const m = c.match(/[\d.]+/g);
  if (!m || m.length < 3) return '#000000';
  const h = (n: string) => Math.max(0, Math.min(255, Math.round(parseFloat(n)))).toString(16).padStart(2, '0');
  return `#${h(m[0])}${h(m[1])}${h(m[2])}`;
};
const hexIntoRgb = (orig: string, hex: string): string => {
  const m = orig.match(/[\d.]+/g) || [];
  const a = m.length >= 4 ? m[3] : null;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return a != null ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
};
const onEnterBlur = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
};
const COLOR_TOKEN = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}/;
const colorInStr = (s: string): string | null => s.match(COLOR_TOKEN)?.[0] ?? null;
const replaceColorInStr = (s: string, hex: string): string => {
  const tok = colorInStr(s);
  if (!tok) return s;
  return s.replace(tok, RGB_RE.test(tok) ? hexIntoRgb(tok, hex) : hex);
};

type Rect = { left: number; top: number; width: number; height: number };

/**
 * Editor VISUAL: preview con elementos etiquetados. Clic → seleccionar y editar (popover); Shift+clic
 * → multi-selección; arrastrar → mover (varios a la vez, con snap al centro); handle esquina →
 * redimensionar; al frente/atrás (z-order). Cada cambio pasa por las funciones deterministas + valida.
 */
export function VisualEditor({
  code, onChange, width, height, fps, durationInFrames, previewW, previewH,
  initialSelect, onInitialSelectConsumed,
}: {
  code: string;
  onChange: (c: string) => void;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  previewW: number;
  previewH: number;
  /** Al entrar desde un clic en el preview global: frame + posición (fracción 0..1) del clic
   *  → el editor hace seek a ese frame y AUTO-SELECCIONA el elemento en ese punto. */
  initialSelect?: { frame: number; fx: number; fy: number } | null;
  onInitialSelectConsumed?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const dragRef = useRef<{ ids: string[]; node: HTMLElement; origTransform: string; x: number; y: number; moved: boolean } | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [autoFocusText, setAutoFocusText] = useState(false);

  // Fuerza repintar el frame pausado tras una edición (si no, el Player no refleja el cambio hasta darle play).
  const repaint = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    const f = p.getCurrentFrame();
    requestAnimationFrame(() => { try { p.seekTo(f); } catch { /* noop */ } });
  }, []);

  // Clic FUERA de la preview y del panel → deseleccionar (cierra el recuadro).
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (containerRef.current?.contains(t) || t.closest('[data-ae-panel]')) return;
      setIds([]);
      setRects({});
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number } | null>(null);
  const [panelPos, setPanelPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  // Coloca el panel FIJO al costado de la preview, sin taparla; salta de lado si no cabe.
  const placePanel = useCallback(() => {
    const c = containerRef.current?.getBoundingClientRect();
    if (!c) return;
    const panelW = 248;
    let left = c.right + 8;
    if (left + panelW > window.innerWidth - 8) left = c.left - panelW - 8;
    if (left < 8) left = 8;
    setPanelPos({ left, top: Math.max(8, Math.min(c.top, window.innerHeight - 220)) });
  }, []);

  const tagged = useMemo(() => {
    const t = tagElements(code).taggedCode;
    try { compileAnimation(t); return t; } catch { return code; }
  }, [code]);
  const elements = useMemo(() => analyzeByElement(code), [code]);
  const single = useMemo(() => (ids.length === 1 ? elements.find((e) => e.id === ids[0]) || null : null), [ids, elements]);
  const scale = width / previewW;

  const rectOf = useCallback((node: HTMLElement): Rect => {
    const c = containerRef.current!.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    return { left: r.left - c.left, top: r.top - c.top, width: r.width, height: r.height };
  }, []);

  const baseId = useCallback(
    (node: HTMLElement) => {
      let id = node.getAttribute('data-ae-id') || '';
      if (!elements.some((el) => el.id === id)) id = id.replace(/-\d+$/, '');
      return id;
    },
    [elements],
  );

  // Selección inicial (entrando desde un clic en el preview global): seek al frame del clic y
  // selecciona el elemento que está en ese punto. Reintenta unas veces mientras el Player pinta.
  useEffect(() => {
    if (!initialSelect) return;
    const c = containerRef.current;
    const p = playerRef.current;
    if (!c || !p) { onInitialSelectConsumed?.(); return; }
    try { p.seekTo(Math.max(0, Math.min(durationInFrames - 1, Math.round(initialSelect.frame)))); } catch { /* noop */ }
    let tries = 0;
    let timer = 0 as unknown as ReturnType<typeof setTimeout>;
    const pick = () => {
      tries++;
      const rect = c.getBoundingClientRect();
      const x = rect.left + initialSelect.fx * rect.width;
      const y = rect.top + initialSelect.fy * rect.height;
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const node = el && c.contains(el) ? (el.closest('[data-ae-id]') as HTMLElement | null) : null;
      if (node) {
        const id = baseId(node);
        setIds([id]);
        setRects({ [id]: rectOf(node) });
        placePanel();
        onInitialSelectConsumed?.();
        return;
      }
      if (tries < 12) timer = setTimeout(pick, 60);
      else onInitialSelectConsumed?.();
    };
    timer = setTimeout(pick, 90);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelect]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-ae-panel]')) return;
      const node = t.closest('[data-ae-id]') as HTMLElement | null;
      if (!node) { dragRef.current = null; setIds([]); setRects({}); return; }
      const id = baseId(node);
      placePanel();
      if (e.shiftKey) {
        // multi-selección: alternar
        setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
        setRects((prev) => ({ ...prev, [id]: rectOf(node) }));
        dragRef.current = null;
        return;
      }
      const moveIds = ids.includes(id) ? ids : [id];
      if (!ids.includes(id)) { setIds([id]); setRects({ [id]: rectOf(node) }); }
      dragRef.current = { ids: moveIds, node, origTransform: node.style.transform, x: e.clientX, y: e.clientY, moved: false };
    },
    [ids, baseId, rectOf, placePanel],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved && (Math.abs(e.clientX - d.x) > 4 || Math.abs(e.clientY - d.y) > 4)) d.moved = true;
      if (d.moved) {
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        setDragOffset({ dx, dy }); // recuadro
        const s = width / previewW; // mover el OBJETO real en vivo (px de composición)
        d.node.style.transform = `${d.origTransform} translate(${dx * s}px, ${dy * s}px)`;
      }
    },
    [width, previewW],
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDragOffset(null);
      if (!d || !d.moved) return;
      let ddxS = e.clientX - d.x;
      let ddyS = e.clientY - d.y;
      // Snap al centro del lienzo (solo si es un único elemento).
      if (d.ids.length === 1 && rects[d.ids[0]]) {
        const r = rects[d.ids[0]];
        const cx = r.left + r.width / 2 + ddxS;
        if (Math.abs(cx - previewW / 2) < SNAP) ddxS += previewW / 2 - cx;
        const cy = r.top + r.height / 2 + ddyS;
        if (Math.abs(cy - previewH / 2) < SNAP) ddyS += previewH / 2 - cy;
      }
      const ddx = Math.round(ddxS * scale);
      const ddy = Math.round(ddyS * scale);
      if (!ddx && !ddy) return;
      let nc = code;
      for (const id of d.ids) nc = setElementMargin(nc, id, ddx, ddy);
      try { compileAnimation(nc); onChange(nc); setRects({}); repaint(); } catch { /* noop */ }
    },
    [code, onChange, scale, previewW, previewH, rects, repaint],
  );

  // Doble clic en un TEXTO → seleccionarlo y enfocar su campo de texto para escribir de una.
  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const node = (e.target as HTMLElement).closest('[data-ae-id]') as HTMLElement | null;
      if (!node || node.getAttribute('data-ae-type') !== 'text') return;
      const id = baseId(node);
      setIds([id]);
      setRects({ [id]: rectOf(node) });
      placePanel();
      setAutoFocusText(true);
    },
    [baseId, rectOf, placePanel],
  );

  const editRef = useCallback(
    (ref: ValueRef, val: string | number) => {
      try {
        const nc = applyValueRef(code, ref, val);
        compileAnimation(nc);
        onChange(nc);
        repaint();
      } catch { /* noop */ }
    },
    [code, onChange, repaint],
  );

  const apply = useCallback(
    (nc: string) => { try { compileAnimation(nc); onChange(nc); repaint(); } catch { /* noop */ } },
    [onChange, repaint],
  );

  const onResizeDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!single || !rects[single.id]) return;
      const r = rects[single.id];
      const start = { id: single.id, x: e.clientX, y: e.clientY, w: r.width, h: r.height };
      const onMove = (ev: MouseEvent) => {
        setRects((prev) => ({ ...prev, [start.id]: { ...prev[start.id], width: Math.max(8, start.w + (ev.clientX - start.x)), height: Math.max(8, start.h + (ev.clientY - start.y)) } }));
      };
      const onUp = (ev: MouseEvent) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        const nw = Math.max(8, start.w + (ev.clientX - start.x)) * scale;
        const nh = Math.max(8, start.h + (ev.clientY - start.y)) * scale;
        apply(setElementSizePx(code, start.id, nw, nh));
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [single, rects, code, scale, apply],
  );

  // Alinear el centro de todos los seleccionados al centro del lienzo (H o V).
  const alignCenter = useCallback(
    (axis: 'h' | 'v') => {
      let nc = code;
      for (const id of ids) {
        const r = rects[id];
        if (!r) continue;
        if (axis === 'h') {
          const dx = Math.round((previewW / 2 - (r.left + r.width / 2)) * scale);
          nc = setElementMargin(nc, id, dx, 0);
        } else {
          const dy = Math.round((previewH / 2 - (r.top + r.height / 2)) * scale);
          nc = setElementMargin(nc, id, 0, dy);
        }
      }
      apply(nc);
      setRects({});
    },
    [ids, rects, code, scale, previewW, previewH, apply],
  );

  const control = (r: ValueRef) => {
    const c = (r as { control?: string }).control;
    if (r.type === 'color') {
      return <input type="color" defaultValue={String(r.value)} onChange={(e) => editRef(r, e.target.value)} className="w-8 h-7 rounded border border-border-tech bg-transparent cursor-pointer shrink-0" />;
    }
    if (r.type === 'string' && RGB_RE.test(String(r.value))) {
      return (
        <input type="color" defaultValue={rgbToHexC(String(r.value))} onChange={(e) => editRef(r, hexIntoRgb(String(r.value), e.target.value))} className="w-8 h-7 rounded border border-border-tech bg-transparent cursor-pointer shrink-0" />
      );
    }
    if (c === 'font') {
      const primary = String(r.value).split(',')[0].replace(/['"]/g, '').trim();
      const opts = FONT_LIST.includes(primary) ? FONT_LIST : [primary, ...FONT_LIST];
      return (
        <select value={primary} onChange={(e) => editRef(r, `${e.target.value}, sans-serif`)} className="flex-1 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary text-xs min-w-0">
          {opts.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      );
    }
    if (c === 'weight') {
      return (
        <select value={String(r.value)} onChange={(e) => editRef(r, parseInt(e.target.value, 10))} className="flex-1 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary text-xs min-w-0">
          {WEIGHTS.map(([w, l]) => <option key={w} value={w}>{l}</option>)}
        </select>
      );
    }
    if (r.type === 'number') {
      return <input type="number" defaultValue={Number(r.value)} onKeyDown={onEnterBlur} onBlur={(e) => editRef(r, parseFloat(e.target.value) || 0)} className="w-24 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary font-mono text-xs" />;
    }
    const isText = r.label === 'Texto';
    const valStr = String(r.value);
    const col = !isText ? colorInStr(valStr) : null; // borde u otro con color → picker inline
    return (
      <>
        {col && (
          <input
            type="color"
            defaultValue={RGB_RE.test(col) ? rgbToHexC(col) : col}
            onChange={(e) => editRef(r, replaceColorInStr(valStr, e.target.value))}
            className="w-8 h-7 rounded border border-border-tech bg-transparent cursor-pointer shrink-0"
          />
        )}
        <input
          type="text"
          defaultValue={valStr}
          autoFocus={isText && autoFocusText}
          onFocus={(e) => { if (isText && autoFocusText) { setAutoFocusText(false); e.currentTarget.select(); } }}
          onKeyDown={onEnterBlur}
          onBlur={(e) => editRef(r, e.target.value)}
          className="flex-1 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary text-xs min-w-0"
        />
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: previewW, height: previewH }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onDoubleClick={onDoubleClick}
    >
      <Player
        ref={playerRef}
        component={CustomCode}
        inputProps={{ code: tagged, durationInFrames, width, height, fps }}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={width}
        compositionHeight={height}
        style={{ width: previewW, height: previewH }}
        controls
        loop
        clickToPlay={false}
      />

      {ids.map((id) => {
        const r = rects[id];
        return r ? (
          <div
            key={id}
            className="absolute pointer-events-none border-2 border-mint-precision rounded-sm"
            style={{ left: r.left + (dragOffset?.dx ?? 0), top: r.top + (dragOffset?.dy ?? 0), width: r.width, height: r.height }}
          />
        ) : null;
      })}

      {single && rects[single.id] && single.type !== 'text' && (
        <div
          onMouseDown={onResizeDown}
          title="Arrastra para redimensionar"
          className="absolute w-3 h-3 bg-mint-precision border border-white rounded-sm cursor-se-resize z-20"
          style={{ left: rects[single.id].left + rects[single.id].width - 6, top: rects[single.id].top + rects[single.id].height - 6 }}
        />
      )}

      {ids.length === 0 && (
        <div className="absolute left-2 top-2 flex items-center gap-1 bg-surface-lowest/80 border border-border-tech rounded-lg px-2 py-1 text-[10px] text-text-secondary/70 pointer-events-none">
          <MousePointerClick size={12} className="text-mint-precision" /> Clic = editar · arrastra = mover · Shift+clic = varios
        </div>
      )}

      {single && (
        <div data-ae-panel className="fixed w-60 overflow-auto bg-surface-lowest border border-border-tech rounded-xl shadow-2xl p-3 text-xs z-50" style={{ left: panelPos.left, top: panelPos.top, maxHeight: '80vh' }}>
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="font-semibold text-text-primary truncate" title={single.label}>{single.label}</span>
            <button onClick={() => { setIds([]); setRects({}); }} className="text-text-secondary/60 hover:text-text-primary shrink-0"><X size={14} /></button>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <button onClick={() => apply(setElementZIndex(code, single.id, 50))} title="Traer al frente" className="flex items-center gap-1 text-[10px] px-1.5 py-1 rounded border border-border-tech text-text-secondary hover:text-text-primary">
              <ChevronsUp size={11} /> Al frente
            </button>
            <button onClick={() => apply(setElementZIndex(code, single.id, -1))} title="Enviar atrás" className="flex items-center gap-1 text-[10px] px-1.5 py-1 rounded border border-border-tech text-text-secondary hover:text-text-primary">
              <ChevronsDown size={11} /> Atrás
            </button>
          </div>
          {single.refs.length === 0 ? (
            <p className="text-[11px] text-text-secondary/40">Sin valores editables directos.</p>
          ) : (
            <div className="space-y-1.5">
              {single.refs.map((r, i) => (
                <div key={`${r.label}-${r.start}-${i}`} className="flex items-center gap-2">
                  <span className="text-text-secondary/70 w-14 truncate shrink-0" title={r.label}>{r.label}</span>
                  {control(r)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {ids.length > 1 && (
        <div data-ae-panel className="fixed bg-surface-lowest border border-border-tech rounded-xl shadow-2xl p-3 text-xs z-50" style={{ left: panelPos.left, top: panelPos.top }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-semibold text-text-primary">{ids.length} seleccionados</span>
            <button onClick={() => { setIds([]); setRects({}); }} className="text-text-secondary/60 hover:text-text-primary"><X size={14} /></button>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => alignCenter('h')} className="text-[11px] px-2 py-1 rounded border border-border-tech text-text-secondary hover:text-text-primary">Centrar horizontal</button>
            <button onClick={() => alignCenter('v')} className="text-[11px] px-2 py-1 rounded border border-border-tech text-text-secondary hover:text-text-primary">Centrar vertical</button>
            <p className="text-[10px] text-text-secondary/40">Arrastra para mover todos.</p>
          </div>
        </div>
      )}
    </div>
  );
}
