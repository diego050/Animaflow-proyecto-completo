import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Settings, Search, Download } from 'lucide-react';

import { COMPONENT_MANIFEST, getDefaultProps } from '../../remotion/manifest';
import { downloadComponentAEScript } from '../../api/aeScript';

// Orden de presentación de las categorías (las no listadas van al final, alfabéticas).
const CATEGORY_ORDER = [
  'Cinematic',
  'Branding',
  'Background',
  'Transition',
  'Text',
  'UI',
  'Charts & Data',
  'Social',
  'Effects & VFX',
  'Transition',
  'General',
];

export function AnimationsGallery() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Agrupar los componentes del manifest por categoría (filtrando por búsqueda).
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byCat = new Map<string, typeof COMPONENT_MANIFEST>();

    for (const entry of COMPONENT_MANIFEST) {
      if (q && !(`${entry.name} ${entry.description ?? ''}`.toLowerCase().includes(q))) {
        continue;
      }
      const list = byCat.get(entry.category) ?? [];
      list.push(entry);
      byCat.set(entry.category, list);
    }

    const cats = Array.from(byCat.keys()).sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return cats.map((cat) => ({
      category: cat,
      items: (byCat.get(cat) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [query]);

  const total = useMemo(
    () => groups.reduce((sum, g) => sum + g.items.length, 0),
    [groups],
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 hover:bg-surface-high rounded-lg text-text-secondary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Playground de Animaciones
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Explora, prueba y ajusta todos los componentes visuales disponibles para la IA.
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-8 max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Buscar entre ${COMPONENT_MANIFEST.length} componentes...`}
          className="w-full pl-9 pr-4 py-2 bg-surface-container border border-border-tech rounded-lg text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-mint-precision"
        />
      </div>

      {total === 0 && (
        <p className="text-text-secondary text-sm">
          No hay componentes que coincidan con “{query}”.
        </p>
      )}

      <div className="space-y-10">
        {groups.map(({ category, items }) => (
          <section key={category}>
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-lg font-display font-semibold text-text-primary">
                {category}
              </h2>
              <span className="text-xs text-text-secondary bg-surface-high px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {items.map((entry) => (
                <div
                  key={entry.name}
                  className="relative flex flex-col text-left group bg-surface-container border border-border-tech hover:border-mint-precision rounded-xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(0,255,171,0.1)]"
                >
                  {/* Descargar AE (.jsx) con props por defecto — no navega */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadComponentAEScript(entry.name, getDefaultProps(entry.name)).catch((err) =>
                        alert(`No se pudo generar el .jsx: ${err?.message ?? err}`),
                      );
                    }}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-surface-lowest/80 border border-border-tech text-text-secondary hover:text-mint-precision hover:border-mint-precision/40 opacity-0 group-hover:opacity-100 transition-all"
                    title="Descargar AE ExtendScript (.jsx) para probar en After Effects"
                  >
                    <Download size={14} />
                  </button>

                  <button
                    onClick={() => navigate(`/admin/animations/${entry.name}`)}
                    className="flex flex-col text-left w-full"
                  >
                    <div className="h-32 bg-surface-lowest flex items-center justify-center p-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-mint-precision/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <PlayCircle
                        className="text-mint-precision/40 group-hover:text-mint-precision transition-colors"
                        size={48}
                      />
                    </div>
                    <div className="p-4 border-t border-border-tech/50">
                      <h3 className="text-sm font-semibold text-text-primary font-mono group-hover:text-mint-precision transition-colors">
                        {entry.name}
                      </h3>
                      {entry.description && (
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {entry.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary">
                        <Settings size={12} />
                        <span>Interactuable</span>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
