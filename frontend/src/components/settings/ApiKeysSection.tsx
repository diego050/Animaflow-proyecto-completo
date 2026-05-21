import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import type { ApiKeyProvider } from '../../types/auth';
import { PROVIDER_LABELS } from '../../types/auth';

const ALL_PROVIDERS: ApiKeyProvider[] = ['gemini', 'anthropic', 'openai', 'grok'];

export function ApiKeysSection() {
  const { apiKeys, fetchApiKeys, createApiKey, deleteApiKey } = useAuthStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [addProvider, setAddProvider] = useState<ApiKeyProvider>('gemini');
  const [addKey, setAddKey] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const isProviderConfigured = useCallback(
    (provider: ApiKeyProvider): boolean => {
      return apiKeys.some((k) => k.provider === provider && k.is_active);
    },
    [apiKeys],
  );

  const getConfiguredKey = useCallback(
    (provider: ApiKeyProvider) => {
      return apiKeys.find((k) => k.provider === provider && k.is_active);
    },
    [apiKeys],
  );

  const handleAddKey = async () => {
    if (!addKey.trim()) {
      setAddError('Ingresa una clave API válida.');
      return;
    }
    setAddError(null);
    setAddLoading(true);
    try {
      await createApiKey({ provider: addProvider, api_key: addKey.trim() });
      setShowAddModal(false);
      setAddKey('');
      setAddProvider('gemini');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Error al agregar la clave.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    setDeleteLoading(id);
    try {
      await deleteApiKey(id);
    } finally {
      setDeleteLoading(null);
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-surface-container border border-border-tech rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold text-text-primary flex items-center gap-2">
            <Key size={18} className="text-mint-precision" />
            API Keys
          </h3>
          <p className="text-text-secondary text-sm mt-1">
            Configura las claves de tus proveedores de IA.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setAddError(null);
            setAddKey('');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-mint-precision/10 text-mint-precision rounded-lg text-sm font-semibold hover:bg-mint-precision/20 transition-colors"
        >
          <Plus size={14} />
          Agregar clave
        </button>
      </div>

      {/* Provider list */}
      <div>
        <p className="text-text-secondary text-sm font-medium mb-3">
          Proveedores configurados:
        </p>
        <div className="space-y-2">
          {ALL_PROVIDERS.map((provider) => {
            const configured = getConfiguredKey(provider);
            const isActive = isProviderConfigured(provider);

            return (
              <div
                key={provider}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  isActive
                    ? 'border-mint-precision/30 bg-mint-precision/5'
                    : 'border-border-tech bg-surface-lowest'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {isActive ? '🟢' : '🔴'}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {PROVIDER_LABELS[provider]}
                    </p>
                    {configured && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs font-mono text-text-secondary/70">
                          {visibleKeys[configured.id]
                            ? configured.api_key_last_four
                              ? `sk-...${configured.api_key_last_four}`
                              : 'sk-...****'
                            : 'sk-...****'}
                        </p>
                        <button
                          onClick={() => toggleKeyVisibility(configured.id)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-surface-high text-text-secondary hover:text-text-primary transition-colors"
                        >
                          {visibleKeys[configured.id] ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                    )}
                    {configured && (
                      <p className="text-xs text-text-secondary/50 mt-0.5">
                        Creada:{' '}
                        {new Date(configured.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {isActive ? (
                  <button
                    onClick={() => handleDeleteKey(configured!.id)}
                    disabled={deleteLoading === configured!.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                  >
                    {deleteLoading === configured!.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    Eliminar
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setAddProvider(provider);
                      setShowAddModal(true);
                      setAddError(null);
                      setAddKey('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-mint-precision hover:bg-mint-precision/10 transition-colors"
                  >
                    <Plus size={12} />
                    Agregar clave
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-text-secondary/50 mt-3">
          Por seguridad, solo mostramos los últimos 4 caracteres. Guarda tus API keys en un lugar seguro.
        </p>
      </div>

      {/* Add API Key Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container border border-border-tech rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-text-primary">
                  Agregar API Key
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-text-secondary/50 hover:text-text-primary transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {addError && (
                <div className="mb-4 bg-error/10 border border-error/20 rounded-lg p-3 text-sm text-error">
                  {addError}
                </div>
              )}

              {/* Provider selector */}
              <div className="mb-4">
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Proveedor
                </label>
                <select
                  value={addProvider}
                  onChange={(e) => setAddProvider(e.target.value as ApiKeyProvider)}
                  className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors appearance-none"
                >
                  {ALL_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {PROVIDER_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key input */}
              <div className="mb-6">
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Clave API
                </label>
                <input
                  type="password"
                  value={addKey}
                  onChange={(e) => setAddKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddKey();
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary bg-surface-high hover:bg-surface-highest transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddKey}
                  disabled={addLoading || !addKey.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-mint-precision text-deep-slate hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
