import { useState, useMemo, useRef, useCallback } from 'react';
import { Player } from '@remotion/player';
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

type Rect = { left: number; top: number; width: number; height: number };

/**
 * Editor VISUAL: preview con elementos etiquetados. Clic → seleccionar y editar (popover); Shift+clic
 * → multi-selección; arrastrar → mover (varios a la vez, con snap al centro); handle esquina →
 * redimensionar; al frente/atrás (z-order). Cada cambio pasa por las funciones deterministas + valida.
 */
export function VisualEditor({
  code, onChange, width, height, fps, durationInFrames, previewW, previewH,
}: {
  code: string;
  onChange: (c: string) => void;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  previewW: number;
  previewH: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ ids: string[]; x: number; y: number; moved: boolean } | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [rects, setRects] = useState<Record<string, Rect>>({});

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

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-ae-panel]')) return;
      const node = t.closest('[data-ae-id]') as HTMLElement | null;
      if (!node) { dragRef.current = null; setIds([]); setRects({}); return; }
      const id = baseId(node);
      if (e.shiftKey) {
        // multi-selección: alternar
        setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
        setRects((prev) => ({ ...prev, [id]: rectOf(node) }));
        dragRef.current = null;
        return;
      }
      const moveIds = ids.includes(id) ? ids : [id];
      if (!ids.includes(id)) { setIds([id]); setRects({ [id]: rectOf(node) }); }
      dragRef.current = { ids: moveIds, x: e.clientX, y: e.clientY, moved: false };
    },
    [ids, baseId, rectOf],
  );

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (d && !d.moved && (Math.abs(e.clientX - d.x) > 4 || Math.abs(e.clientY - d.y) > 4)) d.moved = true;
  }, []);

  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
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
      try { compileAnimation(nc); onChange(nc); setRects({}); } catch { /* noop */ }
    },
    [code, onChange, scale, previewW, previewH, rects],
  );

  const editRef = useCallback(
    (ref: ValueRef, val: string | number) => {
      try {
        const nc = applyValueRef(code, ref, val);
        compileAnimation(nc);
        onChange(nc);
      } catch { /* noop */ }
    },
    [code, onChange],
  );

  const apply = useCallback(
    (nc: string) => { try { compileAnimation(nc); onChange(nc); } catch { /* noop */ } },
    [onChange],
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
      return <input type="number" defaultValue={Number(r.value)} onBlur={(e) => editRef(r, parseFloat(e.target.value) || 0)} className="w-24 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary font-mono text-xs" />;
    }
    return <input type="text" defaultValue={String(r.value)} onBlur={(e) => editRef(r, e.target.value)} className="flex-1 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary text-xs min-w-0" />;
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: previewW, height: previewH }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <Player
        key={tagged}
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
          <div key={id} className="absolute pointer-events-none border-2 border-mint-precision rounded-sm" style={{ left: r.left, top: r.top, width: r.width, height: r.height }} />
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
        <div data-ae-panel className="absolute right-2 top-2 w-60 max-h-[85%] overflow-auto bg-surface-lowest border border-border-tech rounded-xl shadow-2xl p-3 text-xs z-10">
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
        <div data-ae-panel className="absolute right-2 top-2 bg-surface-lowest border border-border-tech rounded-xl shadow-2xl p-3 text-xs z-10">
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
