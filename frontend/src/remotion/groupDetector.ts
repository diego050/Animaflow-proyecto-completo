/**
 * Detector DETERMINISTA de grupos repetidos en el código de una animación (Camino B, Fase 1).
 *
 * Lee el código TSX que generó la IA (sin pedirle nada especial) y encuentra los grupos que
 * se dibujan en bucle (`Array.from({length:N}).map(...)` o `[...].map(...)`). Por cada grupo
 * reporta cuántos elementos hay y qué colores/números aparecen dentro. NO modifica el código
 * (eso será la Fase 2/3). Corre 100% en el navegador, en milisegundos, sin IA.
 */
import { parse } from '@babel/parser';

export interface DetectedGroup {
  id: number;
  kind: 'Array.from' | '[...]';
  count: number;            // cantidad de elementos (length / tamaño del array)
  colorsInBody: string[];   // colores hex hallados dentro del bucle
  identifiersInStyle: string[]; // consts referenciadas (ej. particleColor)
  snippet: string;          // primeras líneas del grupo (para reconocerlo)
  start: number;
  end: number;
}

export interface DetectionResult {
  groups: DetectedGroup[];
  error: string | null;
}

const HEX = /^#[0-9a-fA-F]{3,8}$/;

/* eslint-disable @typescript-eslint/no-explicit-any */
// Recorrido recursivo simple del árbol (sin @babel/traverse, para mantenerlo liviano).
function walk(node: any, visit: (n: any) => void) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (typeof node.type === 'string') visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'range' || key === 'leadingComments' || key === 'trailingComments') {
      continue;
    }
    walk(node[key], visit);
  }
}

function countFromMapTarget(obj: any): { kind: DetectedGroup['kind']; count: number } | null {
  // Array.from({ length: N }) / Array.from([...])
  if (
    obj?.type === 'CallExpression' &&
    obj.callee?.type === 'MemberExpression' &&
    obj.callee.object?.name === 'Array' &&
    obj.callee.property?.name === 'from'
  ) {
    const arg0 = obj.arguments?.[0];
    if (arg0?.type === 'ObjectExpression') {
      const lengthProp = arg0.properties.find(
        (p: any) => p.key?.name === 'length' || p.key?.value === 'length',
      );
      if (lengthProp?.value?.type === 'NumericLiteral') {
        return { kind: 'Array.from', count: lengthProp.value.value };
      }
    } else if (arg0?.type === 'ArrayExpression') {
      return { kind: 'Array.from', count: arg0.elements.length };
    }
    return { kind: 'Array.from', count: -1 };
  }
  // [0, 1, 2].map(...)
  if (obj?.type === 'ArrayExpression') {
    return { kind: '[...]', count: obj.elements.length };
  }
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

  const groups: DetectedGroup[] = [];
  let id = 0;

  walk(ast, (n: any) => {
    if (
      n.type !== 'CallExpression' ||
      n.callee?.type !== 'MemberExpression' ||
      n.callee.property?.name !== 'map'
    ) {
      return;
    }
    const target = countFromMapTarget(n.callee.object);
    if (!target) return;

    // Inspecciona el cuerpo del .map (el primer argumento, la función) para hallar valores.
    const callback = n.arguments?.[0];
    const colors: string[] = [];
    const identifiers: string[] = [];
    if (callback) {
      walk(callback, (m: any) => {
        if (m.type === 'StringLiteral' && HEX.test(m.value) && !colors.includes(m.value)) {
          colors.push(m.value);
        }
        // Identificadores usados como valor de una prop de estilo (ej. background: particleColor)
        if (
          m.type === 'ObjectProperty' &&
          m.value?.type === 'Identifier' &&
          !identifiers.includes(m.value.name)
        ) {
          identifiers.push(m.value.name);
        }
      });
    }

    groups.push({
      id: id++,
      kind: target.kind,
      count: target.count,
      colorsInBody: colors,
      identifiersInStyle: identifiers,
      snippet: code.slice(n.start, Math.min(n.end ?? n.start, n.start + 140)).replace(/\s+/g, ' ').trim(),
      start: n.start,
      end: n.end ?? n.start,
    });
  });

  return { groups, error: null };
}
