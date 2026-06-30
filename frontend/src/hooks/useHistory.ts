import { useState, useRef, useCallback } from 'react';

/**
 * Historial deshacer/rehacer para un valor (ej. el código de una animación). `set` registra un
 * paso (coalesciendo ediciones muy seguidas — escribir/arrastrar/picker — en un solo paso, ~600ms);
 * `reset` reemplaza el valor y BORRA el historial (animación nueva / cargada). Tope de 100 pasos.
 */
export function useHistory<T>(initial: T, coalesceMs = 600, limit = 100) {
  const [state, setState] = useState<{ past: T[]; value: T; future: T[] }>({ past: [], value: initial, future: [] });
  const lastSet = useRef(0);

  const set = useCallback(
    (value: T) => {
      setState((s) => {
        if (Object.is(value, s.value)) return s;
        const now = Date.now();
        const coalesce = now - lastSet.current < coalesceMs;
        lastSet.current = now;
        const past = coalesce ? s.past : [...s.past, s.value].slice(-limit);
        return { past, value, future: [] };
      });
    },
    [coalesceMs, limit],
  );

  const reset = useCallback((value: T) => {
    lastSet.current = 0;
    setState({ past: [], value, future: [] });
  }, []);

  const undo = useCallback(() => {
    lastSet.current = 0;
    setState((s) => {
      if (!s.past.length) return s;
      const value = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), value, future: [s.value, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    lastSet.current = 0;
    setState((s) => {
      if (!s.future.length) return s;
      const value = s.future[0];
      return { past: [...s.past, s.value], value, future: s.future.slice(1) };
    });
  }, []);

  return {
    value: state.value,
    set,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
