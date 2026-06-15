/**
 * Genera backend/app/services/component_manifest.json A PARTIR de
 * src/remotion/manifest.ts (la ÚNICA fuente de verdad).
 *
 * El backend (Python) no puede leer el .ts, así que consume este JSON derivado.
 * Para que NUNCA diverjan:
 *   - `npm run generate:manifest`  → regenera el JSON desde el TS.
 *   - `npm run check:manifest`     → falla si el JSON difiere del TS (para CI).
 *
 * Regla: el JSON es un ARTEFACTO generado. No editarlo a mano; editar manifest.ts.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { COMPONENT_MANIFEST } from '../src/remotion/manifest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', '..', 'backend', 'app', 'services', 'component_manifest.json');

function build(): string {
  const components = COMPONENT_MANIFEST.map((c) => {
    const props: Record<string, Record<string, unknown>> = {};
    for (const p of c.props) {
      // Orden de campos fijo para una salida determinista (type, label,
      // description, default, options, min, max).
      const def: Record<string, unknown> = {
        type: p.type,
        label: p.label,
        description: p.description,
      };
      if (p.defaultValue !== undefined) def.default = p.defaultValue;
      if (p.options !== undefined) def.options = p.options;
      if (p.min !== undefined) def.min = p.min;
      if (p.max !== undefined) def.max = p.max;
      props[p.name] = def;
    }
    return {
      name: c.name,
      category: c.category,
      role: c.role,
      description: c.description,
      props,
    };
  });

  const manifest = {
    version: '1.0.0',
    source: 'frontend/src/remotion/manifest.ts',
    components,
  };
  return JSON.stringify(manifest, null, 2) + '\n';
}

const json = build();
const isCheck = process.argv.includes('--check');

if (isCheck) {
  let current = '';
  try {
    current = readFileSync(OUT, 'utf-8');
  } catch {
    console.error(`❌ No existe ${OUT}. Corre: npm run generate:manifest`);
    process.exit(1);
  }
  if (current !== json) {
    console.error(
      '❌ component_manifest.json está DESINCRONIZADO con manifest.ts.\n' +
        '   Corre: npm run generate:manifest (y commitea el JSON).',
    );
    process.exit(1);
  }
  console.log(`✅ component_manifest.json en sync con manifest.ts (${COMPONENT_MANIFEST.length} componentes)`);
} else {
  writeFileSync(OUT, json, 'utf-8');
  console.log(`✅ Generado ${OUT} (${COMPONENT_MANIFEST.length} componentes)`);
}
