/**
 * Traductor a After Effects — ETAPA 1: Etiquetado de elementos (Camino AE editable).
 *
 * Lee el código TSX de una animación y le inserta `data-ae-id` / `data-ae-type` a cada elemento
 * visual (div/span/texto/svg), para que luego el muestreo por-frame (Etapa 2) pueda leer la
 * posición/tamaño/etc. de cada uno y emitir capas editables en AE (Etapa 3). Determinista, en
 * el navegador, sin IA. Inserta por POSICIÓN (no re-imprime el AST) → no altera el resto.
 */
import { parse } from '@babel/parser';

export interface AeElement {
  id: string;
  type: 'shape' | 'text' | 'svg';
  name: string;
  tag: string;
  isGroup: boolean; // true = está en un loop → se renderiza N veces (ids `id-0`, `id-1`, …)
  indexVar?: string;
}

export interface TagResult {
  taggedCode: string;
  elements: AeElement[];
  error: string | null;
}

const TEXT_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span']);
// Componentes contenedores / no-visuales-directos que NO etiquetamos como capa propia.
const SKIP_NAMES = new Set(['AbsoluteFill', 'Sequence', 'Series', 'Audio', 'Img', 'Video', 'Freeze', 'Loop']);

/* eslint-disable @typescript-eslint/no-explicit-any */
function walk(node: any, visit: (n: any) => void) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const c of node) walk(c, visit);
    return;
  }
  if (typeof node.type === 'string') visit(node);
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'range' || k === 'comments' || k === 'leadingComments' || k === 'trailingComments') continue;
    walk(node[k], visit);
  }
}

function jsxName(openingElement: any): string {
  const n = openingElement?.name;
  return n?.type === 'JSXIdentifier' ? n.name : '';
}

export function tagElements(code: string): TagResult {
  if (!code || !code.trim()) return { taggedCode: code, elements: [], error: null };
  let ast: any;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch (e) {
    return { taggedCode: code, elements: [], error: e instanceof Error ? e.message : String(e) };
  }

  // 1. Spans de cada <svg> → para saltar sus elementos internos (circle/path/…): el svg se trata
  //    como una sola unidad.
  const svgSpans: [number, number][] = [];
  walk(ast, (n: any) => {
    if (n.type === 'JSXElement' && jsxName(n.openingElement).toLowerCase() === 'svg') {
      svgSpans.push([n.start, n.end]);
    }
  });

  // 1b. Callbacks de `.map(...)` con su variable de índice → los elementos dentro se renderizan
  //     N veces; su id debe ser por instancia (`id-${i}`).
  const mapCbs: { start: number; end: number; indexVar: string }[] = [];
  walk(ast, (n: any) => {
    if (n.type === 'CallExpression' && n.callee?.type === 'MemberExpression' && n.callee.property?.name === 'map') {
      const cb = n.arguments?.[0];
      if (cb && (cb.type === 'ArrowFunctionExpression' || cb.type === 'FunctionExpression')) {
        const idx =
          cb.params?.[1]?.type === 'Identifier' ? cb.params[1].name
          : cb.params?.[0]?.type === 'Identifier' ? cb.params[0].name
          : 'i';
        mapCbs.push({ start: cb.start, end: cb.end, indexVar: idx });
      }
    }
  });

  const elements: AeElement[] = [];
  const inserts: { pos: number; text: string }[] = [];
  const counts = { shape: 0, text: 0, svg: 0 };

  walk(ast, (n: any) => {
    if (n.type !== 'JSXElement') return;
    const name = jsxName(n.openingElement);
    if (!name || SKIP_NAMES.has(name)) return;

    const isHtml = name[0] === name[0].toLowerCase(); // div/span/svg vs Componentes propios
    if (!isHtml) return; // los componentes custom no se etiquetan (no vemos su HTML aquí)

    const lower = name.toLowerCase();
    // Saltar elementos DENTRO de un svg (pero sí etiquetar el <svg> mismo).
    if (lower !== 'svg' && svgSpans.some(([s, e]) => n.start > s && n.start < e)) return;

    let type: AeElement['type'] = 'shape';
    if (lower === 'svg') {
      type = 'svg';
    } else if (TEXT_TAGS.has(lower)) {
      type = 'text';
    } else {
      // div: texto si tiene contenido textual y NINGÚN hijo elemento; si no, forma.
      const kids = n.children || [];
      const hasElementChild = kids.some((k: any) => k.type === 'JSXElement');
      const hasText = kids.some(
        (k: any) => (k.type === 'JSXText' && k.value.trim()) || k.type === 'JSXExpressionContainer',
      );
      if (!hasElementChild && hasText) type = 'text';
    }

    counts[type] += 1;
    const id = `el-${elements.length}`;
    const label = type === 'text' ? `Texto ${counts.text}` : type === 'svg' ? `SVG ${counts.svg}` : `Forma ${counts.shape}`;

    // ¿está dentro de un .map? → id por instancia con la variable de índice.
    const cb = mapCbs
      .filter((c) => n.start > c.start && n.start < c.end)
      .sort((a, b) => b.start - a.start)[0];
    let idAttr: string;
    if (cb) {
      const tid = '`' + id + '-${' + cb.indexVar + '}`';
      idAttr = ` data-ae-id={${tid}} data-ae-type="${type}"`;
    } else {
      idAttr = ` data-ae-id="${id}" data-ae-type="${type}"`;
    }
    elements.push({ id, type, name: label, tag: lower, isGroup: !!cb, indexVar: cb?.indexVar });
    inserts.push({ pos: n.openingElement.name.end, text: idAttr });
  });

  // Insertar de derecha a izquierda para no correr las posiciones.
  let taggedCode = code;
  for (const ins of inserts.sort((a, b) => b.pos - a.pos)) {
    taggedCode = taggedCode.slice(0, ins.pos) + ins.text + taggedCode.slice(ins.pos);
  }

  return { taggedCode, elements, error: null };
}
