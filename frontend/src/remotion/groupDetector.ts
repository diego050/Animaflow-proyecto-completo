/**
 * Detector + editor DETERMINISTA de grupos repetidos (Camino B, Fases 1-2).
 *
 * Lee el código TSX que generó la IA (sin pedirle nada especial) con un parser real
 * (@babel/parser) y encuentra los grupos en bucle (`Array.from({length:N}).map`, `[...].map`).
 * Por cada grupo expone CONTROLES editables (cantidad + colores de todo el grupo), cada uno
 * apuntando a la posición exacta del valor en el código. Editar = reemplazar ese pedacito de
 * texto (no se reescribe el resto). Corre 100% en el navegador, en milisegundos, sin IA.
 */
import { parse } from '@babel/parser';

export interface ValueRef {
  role: 'count' | 'color';
  label: string;
  type: 'number' | 'color';
  value: number | string;
  start: number; // posición del valor en el código (a reemplazar)
  end: number;
  quoted: boolean; // si el valor va entre comillas al escribirlo
}

export interface DetectedGroup {
  id: number;
  kind: 'Array.from' | '[...]';
  count: number;
  controls: ValueRef[];
  callbackStart: number; // cuerpo del .map (para la Fase 3)
  callbackEnd: number;
  snippet: string;
}

export interface DetectionResult {
  groups: DetectedGroup[];
  error: string | null;
}

const HEX = /^#[0-9a-fA-F]{3,8}$/;

/* eslint-disable @typescript-eslint/no-explicit-any */
function walk(node: any, visit: (n: any) => void) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (typeof node.type === 'string') visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range' || key === 'comments' || key === 'leadingComments' || key === 'trailingComments') {
      continue;
    }
    walk(node[key], visit);
  }
}

interface ConstInfo {
  type: 'number' | 'color' | 'string';
  value: number | string;
  valStart: number;
  valEnd: number;
}

// Consts LITERALES (const X = "#hex" | número). Las locales de un loop (const size = random()*...)
// son EXPRESIONES, no literales → no entran aquí. Por eso esto filtra solo lo editable de verdad.
function collectLiteralConsts(ast: any): Map<string, ConstInfo> {
  const consts = new Map<string, ConstInfo>();
  walk(ast, (n: any) => {
    if (n.type !== 'VariableDeclarator' || n.id?.type !== 'Identifier' || !n.init) return;
    const init = n.init;
    if (init.type === 'StringLiteral') {
      consts.set(n.id.name, {
        type: HEX.test(init.value) ? 'color' : 'string',
        value: init.value, valStart: init.start, valEnd: init.end,
      });
    } else if (init.type === 'NumericLiteral') {
      consts.set(n.id.name, { type: 'number', value: init.value, valStart: init.start, valEnd: init.end });
    }
  });
  return consts;
}

function countTarget(obj: any): { kind: DetectedGroup['kind']; lengthNode: any; arrayLen: number } | null {
  if (
    obj?.type === 'CallExpression' &&
    obj.callee?.type === 'MemberExpression' &&
    obj.callee.object?.name === 'Array' &&
    obj.callee.property?.name === 'from'
  ) {
    const arg0 = obj.arguments?.[0];
    if (arg0?.type === 'ObjectExpression') {
      const lengthProp = arg0.properties.find((p: any) => p.key?.name === 'length' || p.key?.value === 'length');
      return { kind: 'Array.from', lengthNode: lengthProp?.value ?? null, arrayLen: -1 };
    }
    if (arg0?.type === 'ArrayExpression') return { kind: 'Array.from', lengthNode: null, arrayLen: arg0.elements.length };
    return { kind: 'Array.from', lengthNode: null, arrayLen: -1 };
  }
  if (obj?.type === 'ArrayExpression') return { kind: '[...]', lengthNode: null, arrayLen: obj.elements.length };
  return null;
}

export function detectGroups(code: string): DetectionResult {
  if (!code || !code.trim()) return { groups: [], error: null };
  let ast: any;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch (e) {
    return { groups: [], error: e instanceof Error ? e.message : String(e) };
  }

  const consts = collectLiteralConsts(ast);
  const groups: DetectedGroup[] = [];
  let id = 0;

  walk(ast, (n: any) => {
    if (n.type !== 'CallExpression' || n.callee?.type !== 'MemberExpression' || n.callee.property?.name !== 'map') {
      return;
    }
    const target = countTarget(n.callee.object);
    if (!target) return;

    const callback = n.arguments?.[0];
    const controls: ValueRef[] = [];

    // ── Cantidad ──
    let count = target.arrayLen;
    if (target.lengthNode?.type === 'NumericLiteral') {
      count = target.lengthNode.value;
      controls.push({
        role: 'count', label: 'cantidad', type: 'number', value: count,
        start: target.lengthNode.start, end: target.lengthNode.end, quoted: false,
      });
    } else if (target.lengthNode?.type === 'Identifier') {
      // length: barCount → resolvemos a la const
      const c = consts.get(target.lengthNode.name);
      if (c && c.type === 'number') {
        count = c.value as number;
        controls.push({
          role: 'count', label: `cantidad (${target.lengthNode.name})`, type: 'number', value: count,
          start: c.valStart, end: c.valEnd, quoted: false,
        });
      }
    }

    // ── Colores del grupo ──
    const seenColorConst = new Set<string>();
    const seenInline = new Set<number>();
    if (callback) {
      walk(callback, (m: any) => {
        // color inline (ej. color: "#ffffff" dentro del loop)
        if (m.type === 'StringLiteral' && HEX.test(m.value) && !seenInline.has(m.start)) {
          seenInline.add(m.start);
          controls.push({
            role: 'color', label: m.value, type: 'color', value: m.value,
            start: m.start, end: m.end, quoted: true,
          });
        }
        // color por const referenciada (glowColor, barColor… también dentro de templates)
        if (m.type === 'Identifier') {
          const c = consts.get(m.name);
          if (c && c.type === 'color' && !seenColorConst.has(m.name)) {
            seenColorConst.add(m.name);
            controls.push({
              role: 'color', label: m.name, type: 'color', value: c.value,
              start: c.valStart, end: c.valEnd, quoted: true,
            });
          }
        }
      });
    }

    groups.push({
      id: id++, kind: target.kind, count,
      controls,
      callbackStart: callback?.start ?? n.start,
      callbackEnd: callback?.end ?? n.end,
      snippet: code.slice(n.start, Math.min(n.end ?? n.start, n.start + 130)).replace(/\s+/g, ' ').trim(),
    });
  });

  return { groups, error: null };
}

/** Reemplaza el valor apuntado por `ref` con `newValue` (reescribe solo ese pedacito). */
export function applyValueRef(code: string, ref: ValueRef, newValue: number | string): string {
  const text = ref.quoted ? `"${String(newValue).replace(/"/g, '')}"` : String(newValue);
  return code.slice(0, ref.start) + text + code.slice(ref.end);
}
