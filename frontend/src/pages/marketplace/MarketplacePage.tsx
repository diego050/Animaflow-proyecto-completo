import React, { useEffect, useState } from 'react';
import {
  Search,
  Heart,
  Download,
  Grid3X3,
  X,
  ShoppingBag,
  User,
  Clock,
  Tag,
} from 'lucide-react';
import { useMarketplaceStore } from '../../store/useMarketplaceStore';
import type { MarketplaceComponent } from '../../store/useMarketplaceStore';

const CATEGORIES = [
  { value: '', label: 'Todas las categorías' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'tech', label: 'Tech' },
  { value: 'social', label: 'Social Media' },
  { value: 'data', label: 'Data Viz' },
  { value: 'text', label: 'Texto' },
  { value: 'background', label: 'Fondos' },
  { value: 'logo', label: 'Logos' },
  { value: 'transition', label: 'Transiciones' },
];

export function MarketplacePage() {
  const { components, fetchApproved, likeComponent, loading } =
    useMarketplaceStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedComponent, setSelectedComponent] =
    useState<MarketplaceComponent | null>(null);

  useEffect(() => {
    fetchApproved(category || undefined, search || undefined);
  }, [category, search, fetchApproved]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingBag
            size={24}
            className="text-mint-precision"
            strokeWidth={1.5}
          />
          <h1 className="text-2xl font-bold text-white">
            Marketplace de Componentes
          </h1>
        </div>
        <p className="text-gray-400 text-sm">
          Descubre y reutiliza componentes animados creados por la comunidad
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar componentes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated border border-border-tech rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-mint-precision transition-colors"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 bg-surface-elevated border border-border-tech rounded-lg text-white focus:outline-none focus:border-mint-precision transition-colors"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Cargando...</div>
      ) : components.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Grid3X3 size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No hay componentes en el marketplace aún</p>
          <p className="text-sm mt-2 text-gray-600">
            ¡Sé el primero en publicar uno!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {components.map((comp) => (
            <div
              key={comp.id}
              onClick={() => setSelectedComponent(comp)}
              className="bg-surface-container border border-border-tech rounded-xl p-4 cursor-pointer hover:border-mint-precision/50 hover:shadow-lg hover:shadow-mint-precision/5 transition-all duration-200 group"
            >
              {/* Preview mini */}
              <div className="aspect-[9/16] bg-black rounded-lg mb-4 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-700 group-hover:text-gray-600 transition-colors">
                    {comp.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <h3 className="text-white font-semibold text-sm mb-1 truncate">
                {comp.name}
              </h3>
              <p className="text-gray-500 text-xs mb-3 line-clamp-2 min-h-[2rem]">
                {comp.description || 'Sin descripción'}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1 truncate max-w-[40%]">
                  <User size={10} />
                  <span className="truncate">
                    {comp.author_name || 'Anónimo'}
                  </span>
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      likeComponent(comp.id);
                    }}
                    className="flex items-center gap-1 hover:text-red-400 transition-colors"
                  >
                    <Heart size={12} /> {comp.likes}
                  </button>
                  <span className="flex items-center gap-1">
                    <Download size={12} /> {comp.downloads}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      {selectedComponent && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedComponent(null)}
        >
          <div
            className="bg-surface-container border border-border-tech rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-white truncate">
                    {selectedComponent.name}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {selectedComponent.description || 'Sin descripción'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedComponent(null)}
                  className="p-2 hover:bg-surface-elevated rounded-lg transition-colors ml-4 shrink-0"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Preview grande */}
              <div className="aspect-[9/16] max-h-[55vh] bg-black rounded-xl overflow-hidden mb-6">
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Preview del componente</p>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3">
                <button className="flex-1 bg-mint-precision text-deep-slate font-semibold py-3 rounded-xl hover:bg-mint-precision/90 transition-colors">
                  Usar en mi proyecto
                </button>
                <button
                  onClick={() => {
                    likeComponent(selectedComponent.id);
                  }}
                  className="px-4 py-3 border border-border-tech rounded-xl text-gray-300 hover:bg-surface-elevated transition-colors"
                >
                  <Heart size={18} />
                </button>
              </div>

              {/* Stats & metadata */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Download size={14} />
                  {selectedComponent.downloads} descargas
                </span>
                <span className="flex items-center gap-1.5">
                  <Heart size={14} />
                  {selectedComponent.likes} likes
                </span>
                <span className="flex items-center gap-1.5">
                  <User size={14} />
                  {selectedComponent.author_name || 'Anónimo'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Tag size={14} />
                  {selectedComponent.category || 'Sin categoría'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {new Date(
                    selectedComponent.created_at,
                  ).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
