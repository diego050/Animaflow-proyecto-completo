import { useMemo, useState, useCallback } from 'react';
import { Sliders, Scissors, Boxes, Type, TextCursorInput, Clock } from 'lucide-react';
import { compileAnimation } from '../../remotion/compileAnimation';
import { analyzeCode, applyValueRef, setElementColor, setElementSize, type ValueRef, type StyleRef } from '../../remotion/groupDetector';

// Fuentes disponibles en el dropdown (las comunes web + sistema).
const FONT_LIST = [
  'Inter', 'Roboto', 'Montserrat', 'Poppins', 'Open Sans', 'Lato', 'Oswald', 'Raleway',
  'Playfair Display', 'Bebas Neue', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New',
];
const WEIGHTS: [string, string][] = [
  ['300', 'Light'], ['400', 'Regular'], ['500', 'Medium'], ['600', 'SemiBold'],
  ['700', 'Bold'], ['800', 'ExtraBold'], ['900', 'Black'],
];

/**
 * Editor MANUAL determinista (sin IA) del código de una animación: Valores sueltos, Separar
 * color/valor compartido, y Grupos (cantidad + color + edición POR ELEMENTO). Con revertir
 * automático (descarta un cambio si rompe la compilación). Controlado: recibe `code` y avisa
 * cada cambio por `onChange`. Lo usan el lab de admin y el editor de video por-escena.
 */
export function CodeValueEditor({
  code,
  onChange,
}: {
  code: string;
  onChange: (newCode: string) => void;
}) {
  const [expandedPE, setExpandedPE] = useState<Set<number>>(new Set());
  const [warning, setWarning] = useState<string | null>(null);

  const analysis = useMemo(() => analyzeCode(code), [code]);

  // Revertir automático: aplica el código nuevo SOLO si compila; si lo rompe, lo descarta.
  const commit = useCallback(
    (newCode: string) => {
      if (newCode === code) return;
      try {
        compileAnimation(newCode);
        setWarning(null);
        onChange(newCode);
      } catch {
        setWarning('Ese cambio rompía la animación — se descartó automáticamente.');
      }
    },
    [code, onChange],
  );

  const editControl = useCallback(
    (ref: ValueRef, newValue: number | string) => commit(applyValueRef(code, ref, newValue)),
    [code, commit],
  );
  const setElemColor = useCallback(
    (groupId: number, index: number, color: string) => commit(setElementColor(code, groupId, index, color)),
    [code, commit],
  );
  const setElemSize = useCallback(
    (groupId: number, index: number, value: number) => commit(setElementSize(code, groupId, index, value)),
    [code, commit],
  );

  const valueInput = (v: ValueRef) => {
    if (v.type === 'color') {
      return (
        <input
          type="color"
          defaultValue={String(v.value)}
          onChange={(e) => editControl(v, e.target.value)}
          className="w-8 h-7 rounded border border-border-tech bg-transparent cursor-pointer shrink-0"
        />
      );
    }
    if (v.type === 'number') {
      const isCount = v.role === 'count';
      return (
        <input
          type="number"
          step={isCount ? 1 : 'any'}
          min={isCount ? 1 : undefined}
          defaultValue={Number(v.value)}
          onBlur={(e) =>
            editControl(
              v,
              isCount
                ? Math.max(1, Math.min(300, parseInt(e.target.value) || 1))
                : parseFloat(e.target.value) || 0,
            )
          }
          className="w-24 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary font-mono"
        />
      );
    }
    return (
      <input
        type="text"
        defaultValue={String(v.value)}
        onBlur={(e) => editControl(v, e.target.value)}
        className="flex-1 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary"
      />
    );
  };

  const styleInput = (s: StyleRef) => {
    if (s.control === 'font') {
      const primary = String(s.value).split(',')[0].replace(/['"]/g, '').trim();
      const opts = FONT_LIST.includes(primary) ? FONT_LIST : [primary, ...FONT_LIST];
      return (
        <select
          value={primary}
          onChange={(e) => editControl(s, `${e.target.value}, sans-serif`)}
          className="flex-1 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary"
        >
          {opts.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      );
    }
    if (s.control === 'weight') {
      return (
        <select
          value={String(s.value)}
          onChange={(e) => editControl(s, parseInt(e.target.value, 10))}
          className="flex-1 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary"
        >
          {WEIGHTS.map(([w, l]) => (
            <option key={w} value={w}>{l} ({w})</option>
          ))}
        </select>
      );
    }
    return (
      <input
        type="text"
        defaultValue={String(s.value)}
        onBlur={(e) => editControl(s, e.target.value)}
        className="flex-1 bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary font-mono"
      />
    );
  };

  if (analysis.error) {
    return <p className="text-xs text-red-400">No se pudo analizar el código: {analysis.error}</p>;
  }

  return (
    <div className="space-y-3">
      {warning && (
        <p className="text-[11px] text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-lg p-2">
          ⚠ {warning}
        </p>
      )}

      {/* Texto (las palabras del JSX) */}
      {analysis.texts.length > 0 && (
        <div className="border border-border-tech rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary mb-2">
            <TextCursorInput size={14} className="text-mint-precision" /> Texto ({analysis.texts.length})
          </div>
          <div className="space-y-1.5">
            {analysis.texts.map((t, i) => (
              <input
                key={`txt-${t.start}-${i}`}
                type="text"
                defaultValue={String(t.value)}
                onBlur={(e) => editControl(t, e.target.value)}
                className="w-full bg-surface-container border border-border-tech rounded px-2 py-1 text-text-primary text-xs"
              />
            ))}
          </div>
        </div>
      )}

      {/* Valores sueltos */}
      <div className="border border-border-tech rounded-lg p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary mb-2">
          <Sliders size={14} className="text-mint-precision" /> Valores ({analysis.values.length})
        </div>
        {analysis.values.length === 0 ? (
          <p className="text-[11px] text-text-secondary/40">Sin valores sueltos editables.</p>
        ) : (
          <div className="space-y-1.5">
            {analysis.values.map((v, i) => (
              <div key={`${v.label}-${v.value}-${i}`} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-[11px] text-text-secondary/70 w-32 truncate" title={v.label}>
                  {v.label}
                </span>
                {valueInput(v)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estilo: fuente, peso, espaciado, redondeo (por elemento) */}
      {analysis.styles.length > 0 && (
        <div className="border border-border-tech rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary mb-2">
            <Type size={14} className="text-mint-precision" /> Estilo ({analysis.styles.length})
          </div>
          <div className="space-y-1.5">
            {analysis.styles.map((s, i) => (
              <div key={`${s.prop}-${s.start}-${i}`} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-[11px] text-text-secondary/70 w-16 shrink-0" title={s.label}>
                  {s.label}
                </span>
                {styleInput(s)}
                <span className="font-mono text-[10px] text-text-secondary/40 truncate w-24 shrink-0" title={s.elementLabel}>
                  {s.elementLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tiempos (rangos de frames de interpolate) */}
      {analysis.timings.length > 0 && (
        <div className="border border-border-tech rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary mb-1">
            <Clock size={14} className="text-mint-precision" /> Tiempos ({analysis.timings.length})
          </div>
          <p className="text-[10px] text-text-secondary/40 mb-2">Frame en que empieza/termina cada animación.</p>
          <div className="space-y-1.5">
            {analysis.timings.map((t, i) => (
              <div key={`tm-${t.start}-${i}`} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-[11px] text-text-secondary/70 flex-1 truncate" title={t.label}>{t.label}</span>
                {valueInput(t)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Separar color/valor compartido */}
      {analysis.splits.length > 0 && (
        <div className="border border-border-tech rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary mb-1">
            <Scissors size={14} className="text-mint-precision" /> Separar compartido ({analysis.splits.length})
          </div>
          <p className="text-[10px] text-text-secondary/40 mb-2">
            Estos comparten un valor. Edítalos para darles uno propio sin afectar el resto.
          </p>
          <div className="space-y-1.5">
            {analysis.splits.map((s, i) => (
              <div key={`${s.label}-${s.start}-${s.value}-${i}`} className="flex items-center gap-2 text-xs">
                {valueInput(s)}
                <span className="font-mono text-[10px] text-text-secondary/50 truncate" title={s.context}>
                  {s.label} · {s.context}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grupos */}
      {analysis.groups.length > 0 && (
        <div className="border border-border-tech rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary mb-2">
            <Boxes size={14} className="text-mint-precision" /> Grupos ({analysis.groups.length})
          </div>
          <div className="space-y-2.5">
            {analysis.groups.map((g) => (
              <div key={g.id} className="bg-surface-lowest border border-border-tech rounded-lg p-2.5 text-xs">
                <div className="font-semibold text-text-primary mb-2">
                  Grupo {g.id + 1} · {g.count >= 0 ? `${g.count} elementos` : 'cantidad dinámica'}
                </div>
                {g.controls.length > 0 && (
                  <div className="space-y-1.5">
                    {g.controls.map((ctrl, ci) => (
                      <div key={`${ctrl.role}-${ctrl.label}-${ctrl.value}-${ci}`} className="flex items-center gap-2">
                        <span className="font-mono text-text-secondary/70 w-28 truncate" title={ctrl.label}>
                          {ctrl.role === 'count' ? 'Cantidad' : ctrl.label}
                        </span>
                        {valueInput(ctrl)}
                      </div>
                    ))}
                  </div>
                )}
                {(g.perElement.available || g.perElement.sizeAvailable) && g.count > 0 && g.count <= 100 && (
                  <div className="mt-2 border-t border-border-tech/50 pt-2">
                    <button
                      onClick={() =>
                        setExpandedPE((prev) => {
                          const ns = new Set(prev);
                          if (ns.has(g.id)) ns.delete(g.id);
                          else ns.add(g.id);
                          return ns;
                        })
                      }
                      className="text-[11px] text-mint-precision hover:underline"
                    >
                      {expandedPE.has(g.id) ? '▾' : '▸'} Editar por elemento ({g.count})
                    </button>
                    {expandedPE.has(g.id) && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5 max-h-48 overflow-auto pr-1">
                        {Array.from({ length: g.count }).map((_, k) => {
                          const ov = g.perElement.overrides[k];
                          const eff = ov ?? g.perElement.resolvedBase;
                          const sizeOv = g.perElement.sizeOverrides[k];
                          return (
                            <div key={`${g.id}-${k}-${eff}-${sizeOv ?? ''}`} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-text-secondary/50 w-7">#{k + 1}</span>
                              {g.perElement.available && (
                                <input
                                  type="color"
                                  defaultValue={eff}
                                  onChange={(e) => setElemColor(g.id, k, e.target.value)}
                                  className="w-7 h-6 rounded border border-border-tech bg-transparent cursor-pointer"
                                />
                              )}
                              {g.perElement.sizeAvailable && (
                                <input
                                  type="number"
                                  defaultValue={sizeOv ?? ''}
                                  placeholder="tam."
                                  title="Tamaño (vacío = automático)"
                                  onBlur={(e) => setElemSize(g.id, k, parseFloat(e.target.value) || 0)}
                                  className="w-12 bg-surface-container border border-border-tech rounded px-1 py-0.5 text-text-primary font-mono text-[10px]"
                                />
                              )}
                              {ov && (
                                <button
                                  onClick={() => setElemColor(g.id, k, '')}
                                  title="Quitar color de excepción"
                                  className="text-[11px] text-text-secondary/40 hover:text-red-400"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
