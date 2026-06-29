/**
 * Analizador + editor DETERMINISTA del código de una animación (Camino B).
 *
 * Lee el TSX que generó la IA (sin pedirle nada especial) con un parser real (@babel/parser) y
 * expone DOS cosas editables, cada una apuntando a la posición exacta del valor en el código:
 *   - values:  valores sueltos (consts de color/texto/número + colores inline fuera de loops) →
 *              fondo, textos, color de un texto, etc.
 *   - groups:  grupos repetidos (Array.from / [...].map) con su cantidad y colores de grupo.
 * Editar = reemplazar solo ese pedacito de texto. Corre 100% en el navegador, en ms, sin IA.
 */
import { parse } from '@babel/parser';

export interface ValueRef {
  role?: 'count';
  label: string;
  type: 'number' | 'color' | 'string';
  value: number | string;
  start: number;
  end: number;
  quoted: boolean;
}

export interface DetectedGroup {
  id: number;
  kind: 'Array.from' | '[...]';
  count: number;
  controls: ValueRef[];
  callbackStart: number;
  callbackEnd: number;
  snippet: string;
}

export interface AnalysisResult {
  values: ValueRef[];
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

function findGroups(ast: any, consts: Map<string, ConstInfo>, code: string): DetectedGroup[] {
  const groups: DetectedGroup[] = [];
  let id = 0;
  walk(ast, (n: any) => {
    if (n.type !== 'CallExpression' || n.callee?.type !== 'MemberExpression' || n.callee.property?.name !== 'map') return;
    const target = countTarget(n.callee.object);
    if (!target) return;
    const callback = n.arguments?.[0];
    const controls: ValueRef[] = [];

    let count = target.arrayLen;
    if (target.lengthNode?.type === 'NumericLiteral') {
      count = target.lengthNode.value;
      controls.push({ role: 'count', label: 'cantidad', type: 'number', value: count, start: target.lengthNode.start, end: target.lengthNode.end, quoted: false });
    } else if (target.lengthNode?.type === 'Identifier') {
      const c = consts.get(target.lengthNode.name);
      if (c && c.type === 'number') {
        count = c.value as number;
        controls.push({ role: 'count', label: `cantidad (${target.lengthNode.name})`, type: 'number', value: count, start: c.valStart, end: c.valEnd, quoted: false });
      }
    }

    const seenConst = new Set<string>();
    const seenInline = new Set<number>();
    if (callback) {
      walk(callback, (m: any) => {
        if (m.type === 'StringLiteral' && HEX.test(m.value) && !seenInline.has(m.start)) {
          seenInline.add(m.start);
          controls.push({ role: undefined, label: m.value, type: 'color', value: m.value, start: m.start, end: m.end, quoted: true });
        }
        if (m.type === 'Identifier') {
          const c = consts.get(m.name);
          if (c && c.type === 'color' && !seenConst.has(m.name)) {
            seenConst.add(m.name);
            controls.push({ role: undefined, label: m.name, type: 'color', value: c.value, start: c.valStart, end: c.valEnd, quoted: true });
          }
        }
      });
    }

    groups.push({
      id: id++, kind: target.kind, count, controls,
      callbackStart: callback?.start ?? n.start,
      callbackEnd: callback?.end ?? n.end,
      snippet: code.slice(n.start, Math.min(n.end ?? n.start, n.start + 130)).replace(/\s+/g, ' ').trim(),
    });
  });
  return groups;
}

export function analyzeCode(code: string): AnalysisResult {
  if (!code || !code.trim()) return { values: [], groups: [], error: null };
  let ast: any;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch (e) {
    return { values: [], groups: [], error: e instanceof Error ? e.message : String(e) };
  }

  const consts = collectLiteralConsts(ast);
  const groups = findGroups(ast, consts, code);
  const groupSpans = groups.map((g) => [g.callbackStart, g.callbackEnd] as [number, number]);

  const values: ValueRef[] = [];
  // 1. Consts literales (colores, textos, números) → fondo, textos, etc.
  for (const [name, c] of consts) {
    values.push({ label: name, type: c.type, value: c.value, start: c.valStart, end: c.valEnd, quoted: c.type !== 'number' });
  }
  // 2. Colores inline fuera de cualquier loop (ej. color: "#ffffff" en un texto suelto).
  const constStarts = new Set(Array.from(consts.values()).map((c) => c.valStart));
  walk(ast, (n: any) => {
    if (n.type !== 'StringLiteral' || !HEX.test(n.value)) return;
    if (constStarts.has(n.start)) return; // es el valor de una const (ya listada)
    if (groupSpans.some(([s, e]) => n.start >= s && n.start < e)) return; // dentro de un grupo
    values.push({ label: n.value, type: 'color', value: n.value, start: n.start, end: n.end, quoted: true });
  });

  return { values, groups, error: null };
}

/** Reemplaza el valor apuntado por `ref` con `newValue` (reescribe solo ese pedacito). */
export function applyValueRef(code: string, ref: ValueRef, newValue: number | string): string {
  const text = ref.quoted ? `"${String(newValue).replace(/"/g, '')}"` : String(newValue);
  return code.slice(0, ref.start) + text + code.slice(ref.end);
}
