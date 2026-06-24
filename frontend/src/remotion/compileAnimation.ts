import React from 'react';
import * as Remotion from 'remotion';
import { transform } from 'sucrase';

/**
 * Transpila un componente Remotion escrito como TSX (string) y lo evalúa a un
 * componente React real, inyectando `react` y `remotion` en el scope.
 *
 * Se usa en DOS lugares (mismo código → mismo resultado):
 *  - La página admin "Crear Animación" (preview en el navegador).
 *  - La composición `CustomCode` de Remotion (render a mp4 en el render-server).
 *
 * Solo se permiten imports de 'react' y 'remotion' (lo demás lanza). El determinismo
 * lo garantiza el validador del backend (sin Math.random/Date.now).
 */
export function compileAnimation(tsx: string): React.FC {
  const { code } = transform(tsx, {
    transforms: ['typescript', 'jsx', 'imports'],
    jsxRuntime: 'classic',
    production: true,
  });
  const moduleObj: { exports: Record<string, unknown> } = { exports: {} };
  const requireShim = (name: string) => {
    if (name === 'react') return React;
    if (name === 'remotion') return Remotion;
    throw new Error(`Import no permitido en runtime: ${name}`);
  };
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const factory = new Function('require', 'module', 'exports', code);
  factory(requireShim, moduleObj, moduleObj.exports);
  const exp = moduleObj.exports;
  const comp =
    (exp.default as React.FC | undefined) ||
    (exp.Animation as React.FC | undefined) ||
    (Object.values(exp).find((v) => typeof v === 'function') as React.FC | undefined);
  if (!comp) throw new Error('El código no exporta ningún componente.');
  return comp;
}
