/**
 * Analizador + editor DETERMINISTA del código de una animación (Camino B).
 *
 * Lee el TSX que generó la IA (sin pedirle nada especial) con un parser real (@babel/parser) y
 * expone lo editable, cada cosa apuntando a la posición exacta del valor en el código:
 *   - values:  valores sueltos (consts de color/texto/número + colores inline fuera de loops).
 *   - groups:  grupos repetidos (Array.from / [...].map) con cantidad, color de grupo y, si se
 *              puede, edición POR ELEMENTO (override por índice: `__ovN[i] ?? base`).
 * Editar = reemplazar solo ese pedacito de texto. Corre en el navegador, en ms, sin IA.
 */
import { parse } from '@babel/parser';
import { tagElements } from './aeTranslator';

export interface ValueRef {
  role?: 'count';
  label: string;
  type: 'number' | 'color' | 'string';
  value: number | string;
  start: number;
  end: number;
  quoted: boolean;
  context?: string; // para los "splits": snippet del entorno del uso
}

export interface PerElementInfo {
  available: boolean;
  reason?: string;
  indexVar: string;
  ovName: string;
  resolvedBase: string; // color base (hex) para el default del picker
  baseText: string; // texto fuente de la expresión base (ej. "glowColor")
  overrides: Record<number, string>;
  setup: boolean; // si el override ya está inyectado en el código
  usageStart: number;
  usageEnd: number;
  insertPos: number;
  ovObjStart: number;
  ovObjEnd: number;
  // SIZE por elemento (opcional): override de una const LOCAL de tamaño (ej. `const size = ...`).
  sizeAvailable: boolean;
  sizeOvName: string;
  sizeSetup: boolean;
  sizeOverrides: Record<number, number>;
  sizeBaseText: string;
  sizeUsageStart: number;
  sizeUsageEnd: number;
  sizeInsertPos: number;
  sizeOvObjStart: number;
  sizeOvObjEnd: number;
}

export interface StyleRef extends ValueRef {
  prop: string; // 'fontFamily' | 'fontWeight' | 'letterSpacing' | 'borderRadius'
  control: 'font' | 'weight' | 'number' | 'text';
  elementLabel: string; // de qué elemento es (texto o tag)
}

export interface DetectedGroup {
  id: number;
  kind: 'Array.from' | '[...]';
  count: number;
  controls: ValueRef[];
  perElement: PerElementInfo;
  callbackStart: number;
  callbackEnd: number;
  snippet: string;
}

export interface AnalysisResult {
  values: ValueRef[];
  groups: DetectedGroup[];
  splits: ValueRef[]; // usos sueltos de un color COMPARTIDO (para hacerlos independientes)
  styles: StyleRef[]; // propiedades de estilo editables (fuente, peso, espaciado, redondeo)
  texts: ValueRef[]; // texto literal en el JSX (las palabras), editable
  timings: ValueRef[]; // rangos de frames de interpolate (cuándo aparece/dura cada cosa)
  error: string | null;
}

// Propiedades de estilo inline que exponemos como editables, con su control de UI y etiqueta.
const STYLE_PROPS: Record<string, { control: StyleRef['control']; label: string }> = {
  fontFamily: { control: 'font', label: 'Fuente' },
  fontWeight: { control: 'weight', label: 'Peso' },
  letterSpacing: { control: 'text', label: 'Espaciado' },
  borderRadius: { control: 'text', label: 'Redondeo' },
  border: { control: 'text', label: 'Borde' },
};

const HEX = /^#[0-9a-fA-F]{3,8}$/;
const COLOR_PROPS = new Set(['background', 'backgroundColor', 'color', 'fill', 'stroke', 'borderColor']);

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
      consts.set(n.id.name, { type: HEX.test(init.value) ? 'color' : 'string', value: init.value, valStart: init.start, valEnd: init.end });
    } else if (init.type === 'NumericLiteral') {
      consts.set(n.id.name, { type: 'number', value: init.value, valStart: init.start, valEnd: init.end });
    }
  });
  return consts;
}

function countTarget(obj: any): { kind: DetectedGroup['kind']; lengthNode: any; arrayLen: number } | null {
  if (obj?.type === 'CallExpression' && obj.callee?.type === 'MemberExpression' && obj.callee.object?.name === 'Array' && obj.callee.property?.name === 'from') {
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

function resolveColor(node: any, consts: Map<string, ConstInfo>): string {
  if (!node) return '#888888';
  if (node.type === 'StringLiteral' && HEX.test(node.value)) return node.value;
  if (node.type === 'Identifier') {
    const c = consts.get(node.name);
    if (c?.type === 'color') return String(c.value);
  }
  return '#888888';
}

function findReturnInsertPos(ast: any, groupStart: number): number {
  let best = -1;
  walk(ast, (n: any) => {
    if (n.type === 'ReturnStatement' && typeof n.start === 'number' && n.start <= groupStart && (n.end ?? 0) >= groupStart) {
      if (n.start > best) best = n.start;
    }
  });
  return best;
}

function parseOverrideObject(ast: any, ovName: string): { overrides: Record<number, string>; objStart: number; objEnd: number } {
  const result = { overrides: {} as Record<number, string>, objStart: -1, objEnd: -1 };
  walk(ast, (n: any) => {
    if (n.type === 'VariableDeclarator' && n.id?.type === 'Identifier' && n.id.name === ovName && n.init?.type === 'ObjectExpression') {
      result.objStart = n.init.start;
      result.objEnd = n.init.end;
      for (const p of n.init.properties) {
        const key = p.key?.type === 'NumericLiteral' ? p.key.value : (p.key?.type === 'StringLiteral' ? Number(p.key.value) : null);
        if (key !== null && p.value?.type === 'StringLiteral') result.overrides[key] = p.value.value;
      }
    }
  });
  return result;
}

const SIZE_PROPS = new Set(['width', 'height', 'fontSize', 'r', 'size', 'radius']);

function parseOverrideObjectNum(ast: any, ovName: string): { overrides: Record<number, number>; objStart: number; objEnd: number } {
  const result = { overrides: {} as Record<number, number>, objStart: -1, objEnd: -1 };
  walk(ast, (n: any) => {
    if (n.type === 'VariableDeclarator' && n.id?.type === 'Identifier' && n.id.name === ovName && n.init?.type === 'ObjectExpression') {
      result.objStart = n.init.start;
      result.objEnd = n.init.end;
      for (const p of n.init.properties) {
        const key = p.key?.type === 'NumericLiteral' ? p.key.value : (p.key?.type === 'StringLiteral' ? Number(p.key.value) : null);
        if (key !== null && p.value?.type === 'NumericLiteral') result.overrides[key] = p.value.value;
      }
    }
  });
  return result;
}

interface SizeSlot {
  sizeAvailable: boolean;
  sizeOvName: string;
  sizeSetup: boolean;
  sizeOverrides: Record<number, number>;
  sizeBaseText: string;
  sizeUsageStart: number;
  sizeUsageEnd: number;
  sizeInsertPos: number;
  sizeOvObjStart: number;
  sizeOvObjEnd: number;
}

// Tamaño por elemento: override de una const LOCAL del loop usada en una prop de tamaño.
function computeSizeSlot(callback: any, ast: any, groupId: number, code: string): SizeSlot {
  const ovName = `__ovs${groupId}`;
  const def: SizeSlot = {
    sizeAvailable: false, sizeOvName: ovName, sizeSetup: false, sizeOverrides: {}, sizeBaseText: '',
    sizeUsageStart: -1, sizeUsageEnd: -1, sizeInsertPos: -1, sizeOvObjStart: -1, sizeOvObjEnd: -1,
  };
  const indexVar = callback?.params?.[1]?.type === 'Identifier' ? callback.params[1].name : '';
  if (!indexVar) return def;

  let sizeName = '';
  walk(callback, (m: any) => {
    if (sizeName || m.type !== 'ObjectProperty') return;
    const key = m.key?.name ?? m.key?.value;
    if (SIZE_PROPS.has(key) && m.value?.type === 'Identifier') sizeName = m.value.name;
  });
  if (!sizeName) return def;

  let decl: any = null;
  walk(callback, (m: any) => {
    if (!decl && m.type === 'VariableDeclarator' && m.id?.type === 'Identifier' && m.id.name === sizeName && m.init) decl = m;
  });
  if (!decl) return def; // no es una const local (quizá nivel componente) → no override de tamaño

  const init = decl.init;
  if (init.type === 'LogicalExpression' && init.operator === '??' && init.left?.type === 'MemberExpression' && init.left.object?.name === ovName) {
    const ov = parseOverrideObjectNum(ast, ovName);
    return { ...def, sizeAvailable: true, sizeSetup: true, sizeOverrides: ov.overrides, sizeOvObjStart: ov.objStart, sizeOvObjEnd: ov.objEnd };
  }
  const insertPos = findReturnInsertPos(ast, callback.start);
  if (insertPos < 0) return def;
  return { ...def, sizeAvailable: true, sizeBaseText: code.slice(init.start, init.end), sizeUsageStart: init.start, sizeUsageEnd: init.end, sizeInsertPos: insertPos };
}

// Calcula si un grupo permite edición por elemento (color) y dónde inyectar el override.
function computePerElement(callback: any, ast: any, groupId: number, consts: Map<string, ConstInfo>, groupStart: number, code: string): PerElementInfo {
  const sizeSlot = computeSizeSlot(callback, ast, groupId, code);
  const off: PerElementInfo = {
    available: false, indexVar: '', ovName: `__ov${groupId}`, resolvedBase: '#888888', baseText: '',
    overrides: {}, setup: false, usageStart: -1, usageEnd: -1, insertPos: -1, ovObjStart: -1, ovObjEnd: -1,
    ...sizeSlot,
  };
  const indexVar = callback?.params?.[1]?.type === 'Identifier' ? callback.params[1].name : '';
  if (!indexVar) return { ...off, reason: 'el loop no tiene variable de índice (_, i)' };
  const ovName = `__ov${groupId}`;

  // Busca la PRIMERA prop de color del estilo: identificador→const color, hex, o ya-override (?? base).
  let usage: any = null;
  let setupNode: any = null;
  walk(callback, (m: any) => {
    if (usage || setupNode) return;
    if (m.type !== 'ObjectProperty') return;
    const key = m.key?.name || m.key?.value;
    if (!COLOR_PROPS.has(key)) return;
    const v = m.value;
    // ya-override: ovName[i] ?? base
    if (v?.type === 'LogicalExpression' && v.operator === '??' && v.left?.type === 'MemberExpression' && v.left.object?.name === ovName) {
      setupNode = v;
    } else if (v?.type === 'Identifier' && consts.get(v.name)?.type === 'color') {
      usage = v;
    } else if (v?.type === 'StringLiteral' && HEX.test(v.value)) {
      usage = v;
    }
  });

  if (setupNode) {
    const baseNode = setupNode.right;
    const ov = parseOverrideObject(ast, ovName);
    return {
      available: true, indexVar, ovName, setup: true,
      baseText: '', resolvedBase: resolveColor(baseNode, consts), overrides: ov.overrides,
      usageStart: -1, usageEnd: -1, insertPos: -1, ovObjStart: ov.objStart, ovObjEnd: ov.objEnd,
      ...sizeSlot,
    };
  }
  if (usage) {
    const insertPos = findReturnInsertPos(ast, groupStart);
    if (insertPos < 0) return { ...off, reason: 'no se ubicó dónde insertar el override' };
    return {
      available: true, indexVar, ovName, setup: false,
      baseText: '', resolvedBase: resolveColor(usage, consts), overrides: {},
      usageStart: usage.start, usageEnd: usage.end, insertPos, ovObjStart: -1, ovObjEnd: -1,
      ...sizeSlot,
      // baseText se completa abajo (necesita el code)
    };
  }
  return { ...off, reason: 'no se encontró un color editable en el elemento' };
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
          controls.push({ label: m.value, type: 'color', value: m.value, start: m.start, end: m.end, quoted: true });
        }
        if (m.type === 'Identifier') {
          const c = consts.get(m.name);
          if (c && c.type === 'color' && !seenConst.has(m.name)) {
            seenConst.add(m.name);
            controls.push({ label: m.name, type: 'color', value: c.value, start: c.valStart, end: c.valEnd, quoted: true });
          }
        }
      });
    }

    const perElement = computePerElement(callback, ast, id, consts, n.start, code);
    if (perElement.available && !perElement.setup && perElement.usageStart >= 0) {
      perElement.baseText = code.slice(perElement.usageStart, perElement.usageEnd);
    }

    groups.push({
      id: id++, kind: target.kind, count, controls, perElement,
      callbackStart: callback?.start ?? n.start, callbackEnd: callback?.end ?? n.end,
      snippet: code.slice(n.start, Math.min(n.end ?? n.start, n.start + 130)).replace(/\s+/g, ' ').trim(),
    });
  });
  return groups;
}

export function analyzeCode(code: string): AnalysisResult {
  if (!code || !code.trim()) return { values: [], groups: [], splits: [], styles: [], texts: [], timings: [], error: null };
  let ast: any;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch (e) {
    return { values: [], groups: [], splits: [], styles: [], texts: [], timings: [], error: e instanceof Error ? e.message : String(e) };
  }

  const consts = collectLiteralConsts(ast);
  const groups = findGroups(ast, consts, code);
  const groupSpans = groups.map((g) => [g.callbackStart, g.callbackEnd] as [number, number]);

  const values: ValueRef[] = [];
  for (const [name, c] of consts) {
    values.push({ label: name, type: c.type, value: c.value, start: c.valStart, end: c.valEnd, quoted: c.type !== 'number' });
  }
  const constStarts = new Set(Array.from(consts.values()).map((c) => c.valStart));
  walk(ast, (n: any) => {
    if (n.type !== 'StringLiteral' || !HEX.test(n.value)) return;
    if (constStarts.has(n.start)) return;
    if (groupSpans.some(([s, e]) => n.start >= s && n.start < e)) return;
    values.push({ label: n.value, type: 'color', value: n.value, start: n.start, end: n.end, quoted: true });
  });

  // Colores hex INLINE dentro de template literals (ej. el 2º color de un
  // `linear-gradient(${c}, #16a34a)`). No son StringLiteral → escaneamos el texto crudo de cada
  // quasi. `quoted: false` = se reemplaza el hex tal cual (sin comillas).
  const HEX_SCAN = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
  walk(ast, (n: any) => {
    if (n.type !== 'TemplateLiteral') return;
    for (const q of n.quasis || []) {
      const raw: string = q.value?.raw ?? '';
      HEX_SCAN.lastIndex = 0;
      let mm: RegExpExecArray | null;
      while ((mm = HEX_SCAN.exec(raw))) {
        const start = q.start + mm.index;
        if (groupSpans.some(([s, e]) => start >= s && start < e)) continue;
        values.push({ label: mm[0], type: 'color', value: mm[0], start, end: start + mm[0].length, quoted: false });
      }
    }
  });

  // ── Splits: usos SUELTOS de un valor COMPARTIDO (color/tamaño/texto). Ej. el subtítulo usa
  //    glowColor igual que las partículas, o dos textos usan el mismo titleSize. Editar un uso
  //    lo vuelve un literal propio → independiente, sin tocar el resto. Sirve para cualquier tipo. ──
  const styleUsages: { name: string; node: any; inGroup: boolean }[] = [];
  const seenUsage = new Set<number>();
  const collectConstIds = (subtree: any) => {
    walk(subtree, (m: any) => {
      if (m.type === 'Identifier' && consts.has(m.name) && !seenUsage.has(m.start)) {
        seenUsage.add(m.start);
        const inGroup = groupSpans.some(([s, e]) => m.start >= s && m.start < e);
        styleUsages.push({ name: m.name, node: m, inGroup });
      }
    });
  };
  walk(ast, (n: any) => {
    // Valor de una prop de estilo (directo o dentro de una fórmula: `width * titleSize`),
    // excepto `length:` (eso es la cantidad del loop, se edita con el grupo).
    if (n.type === 'ObjectProperty') {
      const key = n.key?.name ?? n.key?.value;
      if (key !== 'length') collectConstIds(n.value);
    }
    if (n.type === 'TemplateLiteral') {
      for (const ex of n.expressions || []) collectConstIds(ex);
    }
  });
  const countByName = new Map<string, number>();
  for (const u of styleUsages) countByName.set(u.name, (countByName.get(u.name) ?? 0) + 1);
  const splits: ValueRef[] = [];
  for (const u of styleUsages) {
    if (u.inGroup) continue; // los usos dentro de loops se editan con el grupo
    if ((countByName.get(u.name) ?? 0) < 2) continue; // solo si es compartido
    const c = consts.get(u.name);
    if (!c) continue;
    const ctx = code.slice(Math.max(0, u.node.start - 28), Math.min(code.length, u.node.end + 12)).replace(/\s+/g, ' ').trim();
    splits.push({ label: u.name, type: c.type, value: c.value, start: u.node.start, end: u.node.end, quoted: c.type !== 'number', context: ctx });
  }

  // ── Estilos: propiedades inline (fontFamily/fontWeight/letterSpacing/borderRadius) en el `style`
  //    de cada elemento → editables con su control (dropdown fuente/peso, texto). Solo literales
  //    (si es una const, ya está en `values`). Se saltan los que están dentro de loops. ──
  const styles: StyleRef[] = [];
  walk(ast, (n: any) => {
    if (n.type !== 'JSXElement') return;
    if (groupSpans.some(([s, e]) => n.start >= s && n.start < e)) return;
    const styleAttr = (n.openingElement?.attributes || []).find(
      (a: any) => a.type === 'JSXAttribute' && a.name?.name === 'style',
    );
    const obj =
      styleAttr?.value?.type === 'JSXExpressionContainer' && styleAttr.value.expression?.type === 'ObjectExpression'
        ? styleAttr.value.expression
        : null;
    if (!obj) return;
    const tag = n.openingElement?.name?.type === 'JSXIdentifier' ? n.openingElement.name.name : 'elem';
    const txt = (n.children || [])
      .map((c: any) => (c.type === 'JSXText' ? c.value.trim() : ''))
      .join(' ')
      .trim()
      .slice(0, 24);
    const elementLabel = txt || `<${tag}>`;
    for (const p of obj.properties || []) {
      if (p.type !== 'ObjectProperty') continue;
      const key = p.key?.name ?? (p.key?.type === 'StringLiteral' ? p.key.value : null);
      const meta = key ? STYLE_PROPS[key] : undefined;
      if (!meta) continue;
      const v = p.value;
      if (v?.type === 'StringLiteral') {
        styles.push({ prop: key, control: meta.control, elementLabel, label: meta.label, type: 'string', value: v.value, start: v.start, end: v.end, quoted: true });
      } else if (v?.type === 'NumericLiteral') {
        styles.push({ prop: key, control: meta.control, elementLabel, label: meta.label, type: 'number', value: v.value, start: v.start, end: v.end, quoted: false });
      }
    }
  });

  // ── Textos: el contenido literal del JSX (las PALABRAS, ej. <h1>Progreso Activo</h1>). Si el
  //    texto viene de una const (`{titleText}`) ya está en `values`; aquí sacamos el texto inline. ──
  const texts: ValueRef[] = [];
  walk(ast, (n: any) => {
    if (n.type !== 'JSXElement') return;
    if (groupSpans.some(([s, e]) => n.start >= s && n.start < e)) return;
    for (const c of n.children || []) {
      if (c.type !== 'JSXText') continue;
      const raw: string = c.value || '';
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const lead = raw.length - raw.trimStart().length;
      const trail = raw.length - raw.trimEnd().length;
      texts.push({ label: 'Texto', type: 'string', value: trimmed, start: c.start + lead, end: c.end - trail, quoted: false });
    }
  });

  // ── Tiempos: el rango de frames de cada `interpolate(frame, [inicio, fin], ...)` asignado a una
  //    const (ej. `const titleOpacity = interpolate(frame, [30, 60], ...)`). Editar = cambiar cuándo
  //    aparece/dura cada cosa. Solo literales numéricos del rango (arg 2). ──
  const timings: ValueRef[] = [];
  walk(ast, (n: any) => {
    if (n.type !== 'VariableDeclarator' || n.id?.type !== 'Identifier') return;
    const init = n.init;
    if (init?.type !== 'CallExpression' || init.callee?.type !== 'Identifier' || init.callee.name !== 'interpolate') return;
    const range = init.arguments?.[1];
    if (range?.type !== 'ArrayExpression') return;
    if (groupSpans.some(([s, e]) => init.start >= s && init.start < e)) return;
    (range.elements || []).forEach((el: any, i: number) => {
      if (el?.type !== 'NumericLiteral') return;
      const pos = i === 0 ? 'inicio' : i === range.elements.length - 1 ? 'fin' : `pto ${i}`;
      timings.push({ label: `${n.id.name} · ${pos}`, type: 'number', value: el.value, start: el.start, end: el.end, quoted: false });
    });
  });

  return { values, groups, splits, styles, texts, timings, error: null };
}

export interface ElementEdit {
  id: string; // data-ae-id (el-N)
  label: string; // texto del elemento o <tag>
  type: string; // shape | text | path | svg
  refs: ValueRef[]; // valores editables de ESTE elemento (texto/estilo/inline + consts que usa)
}

/**
 * Para el EDITOR VISUAL (clic→editar): mapea cada elemento etiquetado a sus valores editables.
 * Junta los refs INLINE dentro del span del elemento (texto, estilo, hex) + las CONSTANTES que
 * referencia en su código (ej. `background: circleColor`). Reusa los mismos ValueRef → se editan
 * con applyValueRef como en el panel. Devuelve [] si el código no parsea.
 */
export function analyzeByElement(code: string): ElementEdit[] {
  const { elements, error: tagErr } = tagElements(code);
  if (tagErr) return [];
  const a = analyzeCode(code);
  if (a.error) return [];
  let ast: any;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch {
    return [];
  }
  const inlineRefs = [...a.texts, ...a.styles, ...a.values]; // candidatos por posición
  // Consts con nombre (para resolver referencias dentro de un elemento).
  const constByName = new Map<string, ValueRef>();
  for (const v of a.values) if (typeof v.label === 'string' && /^[A-Za-z_$]/.test(v.label)) constByName.set(v.label, v);
  const usages: { name: string; pos: number }[] = [];
  walk(ast, (n: any) => {
    if (n.type === 'Identifier' && constByName.has(n.name)) usages.push({ name: n.name, pos: n.start });
  });

  return elements.map((el) => {
    const refs: ValueRef[] = [];
    const seen = new Set<number>();
    const add = (r: ValueRef) => {
      if (!seen.has(r.start)) { seen.add(r.start); refs.push(r); }
    };
    const within = (pos: number) => pos >= el.start && pos < el.end;
    for (const r of inlineRefs) if (within(r.start)) add(r);
    for (const u of usages) if (within(u.pos)) add(constByName.get(u.name)!);
    const txt = refs.find((r) => r.label === 'Texto');
    return { id: el.id, label: txt ? String(txt.value).slice(0, 24) : `<${el.tag}>`, type: el.type, refs };
  });
}

/**
 * MOVER un elemento (Fase 3, arrastrar): suma (ddx, ddy) px al desplazamiento del elemento vía
 * `marginLeft`/`marginTop` en su `style` (desplaza toda su trayectoria sin tocar las fórmulas de
 * posición). Acumula: si ya existen márgenes numéricos (nuestros), les suma; si no, los crea.
 * Devuelve el código sin cambios si el elemento no tiene objeto `style`.
 */
export function setElementMargin(code: string, elementId: string, ddx: number, ddy: number): string {
  const { elements } = tagElements(code);
  const el = elements.find((e) => e.id === elementId);
  if (!el) return code;
  let ast: any;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch {
    return code;
  }
  let styleObj: any = null;
  walk(ast, (n: any) => {
    if (styleObj || n.type !== 'JSXElement' || n.start !== el.start) return;
    const sa = (n.openingElement?.attributes || []).find(
      (a: any) => a.type === 'JSXAttribute' && a.name?.name === 'style',
    );
    const ex = sa?.value?.type === 'JSXExpressionContainer' ? sa.value.expression : null;
    if (ex?.type === 'ObjectExpression') styleObj = ex;
  });
  if (!styleObj) return code;
  const find = (name: string) =>
    (styleObj.properties || []).find(
      (p: any) => p.type === 'ObjectProperty' && (p.key?.name === name || p.key?.value === name),
    );
  // Lee un valor numérico, incluyendo negativos (`-20` es UnaryExpression, no NumericLiteral).
  const numVal = (node: any): number | null => {
    if (node?.type === 'NumericLiteral') return node.value;
    if (node?.type === 'UnaryExpression' && node.operator === '-' && node.argument?.type === 'NumericLiteral')
      return -node.argument.value;
    return null;
  };
  const edits: { start: number; end: number; text: string }[] = [];
  const handle = (name: string, delta: number) => {
    if (!delta) return;
    const p = find(name);
    if (p) {
      const cur = numVal(p.value);
      if (cur !== null) edits.push({ start: p.value.start, end: p.value.end, text: String(Math.round(cur + delta)) });
      // si existe pero es un margen calculado (no número) → no lo tocamos
    } else {
      edits.push({ start: styleObj.start + 1, end: styleObj.start + 1, text: ` ${name}: ${Math.round(delta)},` });
    }
  };
  handle('marginLeft', ddx);
  handle('marginTop', ddy);
  let out = code;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

/**
 * REDIMENSIONAR un elemento (Fase: handles): fija `width`/`height` en px (reemplaza el valor
 * existente o lo agrega). Pierde el tamaño responsivo de esa propiedad, pero es lo que el usuario
 * quiere al redimensionar a mano. La animación de escala (si la hay) sigue aplicando encima.
 */
export function setElementSizePx(code: string, elementId: string, w: number, h: number): string {
  const { elements } = tagElements(code);
  const el = elements.find((e) => e.id === elementId);
  if (!el) return code;
  let ast: any;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch {
    return code;
  }
  let styleObj: any = null;
  walk(ast, (n: any) => {
    if (styleObj || n.type !== 'JSXElement' || n.start !== el.start) return;
    const sa = (n.openingElement?.attributes || []).find(
      (a: any) => a.type === 'JSXAttribute' && a.name?.name === 'style',
    );
    const ex = sa?.value?.type === 'JSXExpressionContainer' ? sa.value.expression : null;
    if (ex?.type === 'ObjectExpression') styleObj = ex;
  });
  if (!styleObj) return code;
  const find = (name: string) =>
    (styleObj.properties || []).find(
      (p: any) => p.type === 'ObjectProperty' && (p.key?.name === name || p.key?.value === name),
    );
  const edits: { start: number; end: number; text: string }[] = [];
  const handle = (name: string, val: number) => {
    if (!(val > 0)) return;
    const v = Math.max(1, Math.round(val));
    const p = find(name);
    if (p) edits.push({ start: p.value.start, end: p.value.end, text: String(v) });
    else edits.push({ start: styleObj.start + 1, end: styleObj.start + 1, text: ` ${name}: ${v},` });
  };
  handle('width', w);
  handle('height', h);
  let out = code;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

/** Z-ORDER: fija `zIndex` (apilado) en el style del elemento. Mayor = más al frente. */
export function setElementZIndex(code: string, elementId: string, z: number): string {
  const { elements } = tagElements(code);
  const el = elements.find((e) => e.id === elementId);
  if (!el) return code;
  let ast: any;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch {
    return code;
  }
  let styleObj: any = null;
  walk(ast, (n: any) => {
    if (styleObj || n.type !== 'JSXElement' || n.start !== el.start) return;
    const sa = (n.openingElement?.attributes || []).find(
      (a: any) => a.type === 'JSXAttribute' && a.name?.name === 'style',
    );
    const ex = sa?.value?.type === 'JSXExpressionContainer' ? sa.value.expression : null;
    if (ex?.type === 'ObjectExpression') styleObj = ex;
  });
  if (!styleObj) return code;
  const p = (styleObj.properties || []).find(
    (q: any) => q.type === 'ObjectProperty' && (q.key?.name === 'zIndex' || q.key?.value === 'zIndex'),
  );
  const v = String(Math.round(z));
  if (p) return code.slice(0, p.value.start) + v + code.slice(p.value.end);
  return code.slice(0, styleObj.start + 1) + ` zIndex: ${v},` + code.slice(styleObj.start + 1);
}

/** Reemplaza el valor apuntado por `ref` con `newValue` (reescribe solo ese pedacito). */
export function applyValueRef(code: string, ref: ValueRef, newValue: number | string): string {
  const text = ref.quoted ? `"${String(newValue).replace(/"/g, '')}"` : String(newValue);
  return code.slice(0, ref.start) + text + code.slice(ref.end);
}

function serializeOverrides(ov: Record<number, string>): string {
  const entries = Object.entries(ov)
    .map(([k, v]) => [Number(k), v] as [number, string])
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => `${k}: "${String(v).replace(/"/g, '')}"`);
  return `{ ${entries.join(', ')} }`;
}

/**
 * Fija el color del elemento #index de un grupo (override por índice). Si es la primera vez,
 * inyecta `const __ovN = {index: color}` antes del return y envuelve el uso del color con
 * `__ovN[i] ?? base`. Si ya existe, solo actualiza el objeto. Reescribe el código de forma
 * determinista (sin IA). `color` vacío = quita la excepción de ese elemento.
 */
export function setElementColor(code: string, groupId: number, index: number, color: string): string {
  const a = analyzeCode(code);
  const g = a.groups.find((x) => x.id === groupId);
  if (!g || !g.perElement.available) return code;
  const pe = g.perElement;
  const safe = color.replace(/"/g, '');

  if (pe.setup) {
    const ov = { ...pe.overrides };
    if (safe) ov[index] = safe;
    else delete ov[index];
    return code.slice(0, pe.ovObjStart) + serializeOverrides(ov) + code.slice(pe.ovObjEnd);
  }

  if (!safe) return code; // nada que hacer (sin setup y sin color)
  // 1. Envuelve el uso del color (posición alta primero).
  const wrapped = `${pe.ovName}[${pe.indexVar}] ?? ${pe.baseText}`;
  let out = code.slice(0, pe.usageStart) + wrapped + code.slice(pe.usageEnd);
  // 2. Inserta la const del override antes del return (posición baja, sin afectar lo de arriba).
  const decl = `const ${pe.ovName} = ${serializeOverrides({ [index]: safe })};\n  `;
  out = out.slice(0, pe.insertPos) + decl + out.slice(pe.insertPos);
  return out;
}

function serializeOverridesNum(ov: Record<number, number>): string {
  const entries = Object.entries(ov)
    .map(([k, v]) => [Number(k), v] as [number, number])
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => `${k}: ${v}`);
  return `{ ${entries.join(', ')} }`;
}

/**
 * Fija el TAMAÑO del elemento #index (override numérico de una const local de tamaño). Igual
 * que setElementColor pero envuelve la const local: `const size = __ovsN[i] ?? (<init>)`.
 * `value <= 0` quita la excepción de ese elemento.
 */
export function setElementSize(code: string, groupId: number, index: number, value: number): string {
  const a = analyzeCode(code);
  const g = a.groups.find((x) => x.id === groupId);
  if (!g || !g.perElement.sizeAvailable) return code;
  const pe = g.perElement;

  if (pe.sizeSetup) {
    const ov = { ...pe.sizeOverrides };
    if (value > 0) ov[index] = value;
    else delete ov[index];
    return code.slice(0, pe.sizeOvObjStart) + serializeOverridesNum(ov) + code.slice(pe.sizeOvObjEnd);
  }

  if (!(value > 0)) return code;
  const wrapped = `${pe.sizeOvName}[${pe.indexVar}] ?? (${pe.sizeBaseText})`;
  let out = code.slice(0, pe.sizeUsageStart) + wrapped + code.slice(pe.sizeUsageEnd);
  const decl = `const ${pe.sizeOvName} = ${serializeOverridesNum({ [index]: value })};\n  `;
  out = out.slice(0, pe.sizeInsertPos) + decl + out.slice(pe.sizeInsertPos);
  return out;
}
