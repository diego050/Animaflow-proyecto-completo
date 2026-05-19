import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Eye,
  Copy,
  Check,
  Search,
  FileImage,
} from 'lucide-react';
import { apiFetch, apiUpload, API_BASE } from '../../api/client';

interface Asset {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export function ImagesPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Asset[]>('/api/assets/');
      setAssets(data);
      setError(null);
    } catch (err) {
      setError('Error cargando imágenes');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      await apiUpload('/api/assets/upload', file);
      await fetchAssets();
    } catch (err: any) {
      setError(err.message || 'Error subiendo imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleUpload(file);
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta imagen?')) return;
    try {
      await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError('Error eliminando imagen');
    }
  };

  const handleCopyUrl = async (asset: Asset) => {
    const url = `${API_BASE}/api/assets/${asset.id}/file`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHours < 1) return 'Hace minutos';
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const getTypeBadge = (type: string) => {
    const ext = type.split('/')[1]?.toUpperCase() || 'IMG';
    const colors: Record<string, string> = {
      PNG: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      JPEG: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      JPG: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      SVG: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      WEBP: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      GIF: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider border ${colors[ext] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
        {ext}
      </span>
    );
  };

  const filteredAssets = assets.filter((a) =>
    a.original_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary mb-1">
            Biblioteca de Imágenes
          </h1>
          <p className="text-text-secondary text-sm">
            Sube logos, fotos de productos y assets para tus videos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary/50">
            {assets.length} asset{assets.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Upload zone */}
      <div
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center mb-8 transition-all duration-300 ${
          dragOver
            ? 'border-mint-precision bg-mint-precision/5 scale-[1.01]'
            : 'border-border-tech/50 hover:border-mint-precision/30 hover:bg-surface-high/50'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-mint-precision/10 flex items-center justify-center">
              <Loader2 size={20} className="text-mint-precision animate-spin" />
            </div>
            <span className="text-text-secondary text-sm">Subiendo imagen...</span>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-4 group w-full"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-mint-precision/10 to-mint-precision/5 border border-mint-precision/20 flex items-center justify-center group-hover:scale-110 group-hover:border-mint-precision/40 transition-all duration-300">
              <Upload size={24} className="text-mint-precision/70 group-hover:text-mint-precision transition-colors" />
            </div>
            <div>
              <p className="text-text-primary font-medium text-base">
                Arrastra tu imagen aquí o <span className="text-mint-precision underline underline-offset-2">selecciona un archivo</span>
              </p>
              <p className="text-text-secondary/40 text-sm mt-1.5">
                PNG, JPG, SVG, WebP, GIF · Máximo 10MB
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/10 rounded-lg transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search bar */}
      {assets.length > 0 && (
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-high border border-border-tech/50 rounded-xl text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-mint-precision/40 focus:ring-1 focus:ring-mint-precision/20 transition-all"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-mint-precision animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && assets.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-surface-high to-surface-container border border-border-tech/50 flex items-center justify-center mb-5">
            <FileImage size={32} className="text-text-secondary/20" />
          </div>
          <h3 className="text-lg font-display font-semibold text-text-primary mb-1.5">
            Tu biblioteca está vacía
          </h3>
          <p className="text-text-secondary/60 text-sm max-w-sm">
            Sube logos, fotos de productos o cualquier imagen que quieras usar en tus videos animados.
          </p>
        </motion.div>
      )}

      {/* No search results */}
      {!loading && assets.length > 0 && filteredAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search size={32} className="text-text-secondary/20 mb-3" />
          <h3 className="text-base font-display font-semibold text-text-primary mb-1">
            Sin resultados
          </h3>
          <p className="text-text-secondary/50 text-sm">
            Ninguna imagen coincide con "{search}"
          </p>
        </div>
      )}

      {/* Image Grid */}
      {!loading && filteredAssets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence>
            {filteredAssets.map((asset, i) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group bg-surface-high border border-border-tech/50 rounded-xl overflow-hidden hover:border-mint-precision/30 hover:shadow-lg hover:shadow-mint-precision/5 transition-all duration-300"
              >
                {/* Image preview */}
                <div
                  className="aspect-square bg-surface-container cursor-pointer relative overflow-hidden"
                  onClick={() => setPreviewAsset(asset)}
                >
                  <img
                    src={`${API_BASE}/api/assets/${asset.id}/file`}
                    alt={asset.original_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Type badge */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getTypeBadge(asset.file_type)}
                  </div>

                  {/* Action buttons */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewAsset(asset);
                        }}
                        className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center hover:bg-white/25 transition-colors"
                        title="Ver"
                      >
                        <Eye size={13} className="text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUrl(asset);
                        }}
                        className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center hover:bg-white/25 transition-colors"
                        title="Copiar URL"
                      >
                        {copiedId === asset.id ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : (
                          <Copy size={13} className="text-white" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(asset.id);
                      }}
                      className="w-7 h-7 rounded-lg bg-red-500/20 backdrop-blur-md flex items-center justify-center hover:bg-red-500/40 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={13} className="text-white" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <p className="text-xs text-text-primary font-medium truncate mb-1">
                    {asset.original_name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-text-secondary/40">
                      {formatSize(asset.file_size)}
                    </span>
                    <span className="text-[10px] text-text-secondary/20">·</span>
                    <span className="text-[10px] text-text-secondary/40">
                      {formatDate(asset.created_at)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setPreviewAsset(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-3xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-surface-highest rounded-2xl overflow-hidden border border-border-tech/50 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-tech/30">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(previewAsset.file_type)}
                    <span className="text-sm text-text-primary font-medium truncate max-w-[200px] sm:max-w-md">
                      {previewAsset.original_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyUrl(previewAsset)}
                      className="p-2 rounded-lg hover:bg-surface-high transition-colors text-text-secondary/60 hover:text-text-primary"
                      title="Copiar URL"
                    >
                      {copiedId === previewAsset.id ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => setPreviewAsset(null)}
                      className="p-2 rounded-lg hover:bg-surface-high transition-colors text-text-secondary/60 hover:text-text-primary"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Image */}
                <div className="flex items-center justify-center bg-black/40 p-4">
                  <img
                    src={`${API_BASE}/api/assets/${previewAsset.id}/file`}
                    alt={previewAsset.original_name}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  />
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-border-tech/30 flex items-center justify-between">
                  <span className="text-xs text-text-secondary/50">
                    {formatSize(previewAsset.file_size)} · Subido {formatDate(previewAsset.created_at)}
                  </span>
                  <button
                    onClick={() => handleDelete(previewAsset.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
