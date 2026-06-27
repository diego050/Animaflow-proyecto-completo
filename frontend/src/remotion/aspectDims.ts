/**
 * Dims (w, h) para CUALQUIER aspect ratio "W:H" (presets o custom: 4:3, 21:9, 2.39:1…).
 * El lado CORTO queda en 1080 (igual que los presets); el largo escala. Default 9:16.
 * Igual que `_parse_dims` del backend → preview y render coinciden.
 */
export function dimsFor(ratio: string | undefined): { w: number; h: number; cssRatio: string } {
  const parts = String(ratio || '').replace(/\s/g, '').split(':').map(Number);
  const [wr, hr] = parts;
  if (!wr || !hr || wr <= 0 || hr <= 0 || parts.length !== 2) {
    return { w: 1080, h: 1920, cssRatio: '9/16' };
  }
  const r = wr / hr;
  let w: number;
  let h: number;
  if (r >= 1) {
    h = 1080;
    w = Math.round(1080 * r);
  } else {
    w = 1080;
    h = Math.round(1080 / r);
  }
  w += w % 2;
  h += h % 2;
  return { w, h, cssRatio: `${w}/${h}` };
}
