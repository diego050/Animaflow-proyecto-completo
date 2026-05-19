import { useState, useCallback, useEffect, useRef } from 'react';
import { Save, Loader2, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import type { ApiKeyProvider } from '../../types/auth';
import { AVAILABLE_MODELS, PROVIDER_LABELS } from '../../types/auth';

const ALL_PROVIDERS: ApiKeyProvider[] = ['gemini', 'anthropic', 'openai', 'grok'];

export function LLMSettingsSection() {
  const {
    llmSettings,
    llmSettingsLoading,
    fetchLLMSettings,
    updateLLMSettings,
  } = useAuthStore();

  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [customModel, setCustomModel] = useState('');
  const [showCustomModel, setShowCustomModel] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const providerDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const getAllModels = useCallback((): string[] => {
    return Object.values(AVAILABLE_MODELS).flat();
  }, []);

  const getModelsForProvider = useCallback((provider: string): string[] => {
    return AVAILABLE_MODELS[provider] || [];
  }, []);

  useEffect(() => {
    fetchLLMSettings();
  }, [fetchLLMSettings]);

  useEffect(() => {
    if (llmSettings) {
      setSelectedProvider(llmSettings.default_provider || '');
      setSelectedModel(llmSettings.default_model || '');
      const allModels = getAllModels();
      const isCustom = llmSettings.default_model
        ? !allModels.includes(llmSettings.default_model)
        : false;
      setShowCustomModel(isCustom);
      if (isCustom && llmSettings.default_model) {
        setCustomModel(llmSettings.default_model);
      }
    }
  }, [llmSettings, getAllModels]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        providerDropdownRef.current &&
        !providerDropdownRef.current.contains(e.target as Node)
      ) {
        setShowProviderDropdown(false);
      }
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target as Node)
      ) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isProviderConfigured = useCallback(
    (provider: ApiKeyProvider): boolean => {
      const { apiKeys } = useAuthStore.getState();
      return apiKeys.some((k) => k.provider === provider && k.is_active);
    },
    [],
  );

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const modelToSave = showCustomModel ? customModel.trim() : selectedModel;
      await updateLLMSettings({
        default_provider: selectedProvider || null,
        default_model: modelToSave || null,
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } finally {
      setSettingsSaving(false);
    }
  };

  const availableModelsForProvider = selectedProvider
    ? getModelsForProvider(selectedProvider)
    : [];

  return (
    <div className="pt-4 border-t border-border-tech/50 space-y-4">
      <h4 className="text-sm font-semibold text-text-primary">
        Configuración de modelo
      </h4>

      {/* Default provider */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Proveedor predeterminado
        </label>
        <div className="relative" ref={providerDropdownRef}>
          <button
            type="button"
            onClick={() => setShowProviderDropdown(!showProviderDropdown)}
            className="w-full flex items-center justify-between bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary hover:border-outline-variant transition-colors"
          >
            <span>
              {selectedProvider
                ? PROVIDER_LABELS[selectedProvider as ApiKeyProvider] || selectedProvider
                : 'Seleccionar proveedor'}
            </span>
            <ChevronDown size={14} className="text-text-secondary/50" />
          </button>
          <AnimatePresence>
            {showProviderDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute z-10 w-full mt-1 bg-surface-highest border border-border-tech rounded-lg shadow-xl overflow-hidden"
              >
                {ALL_PROVIDERS.map((p) => {
                  const configured = isProviderConfigured(p);
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        setSelectedProvider(p);
                        setSelectedModel('');
                        setShowCustomModel(false);
                        setShowProviderDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-text-primary hover:bg-surface-high transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        {configured ? '🟢' : '🔴'}
                        {PROVIDER_LABELS[p]}
                      </span>
                      {selectedProvider === p && (
                        <Check size={14} className="text-mint-precision" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Default model */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Modelo predeterminado
        </label>
        {!showCustomModel ? (
          <div className="relative" ref={modelDropdownRef}>
            <button
              type="button"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="w-full flex items-center justify-between bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary hover:border-outline-variant transition-colors"
            >
              <span>
                {selectedModel || 'Seleccionar modelo'}
              </span>
              <ChevronDown size={14} className="text-text-secondary/50" />
            </button>
            <AnimatePresence>
              {showModelDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-10 w-full mt-1 bg-surface-highest border border-border-tech rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto"
                >
                  {availableModelsForProvider.length > 0 ? (
                    availableModelsForProvider.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedModel(m);
                          setShowModelDropdown(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-text-primary hover:bg-surface-high transition-colors"
                      >
                        <span>{m}</span>
                        {selectedModel === m && (
                          <Check size={14} className="text-mint-precision" />
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-text-secondary/50">
                      Selecciona un proveedor primero
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <input
            type="text"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="Ej: mi-modelo-personalizado"
            className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
          />
        )}
      </div>

      {/* Add custom model toggle */}
      <button
        type="button"
        onClick={() => {
          setShowCustomModel(!showCustomModel);
          if (showCustomModel) {
            setSelectedModel('');
            setCustomModel('');
          }
        }}
        className="text-xs text-mint-precision hover:underline"
      >
        {showCustomModel ? 'Usar modelo predefinido' : 'Agregar modelo personalizado'}
      </button>

      {/* Available models checkboxes */}
      {llmSettings && llmSettings.available_models.length > 0 && (
        <div>
          <p className="text-text-secondary text-sm font-medium mb-2">
            Modelos disponibles:
          </p>
          <div className="space-y-1.5">
            {llmSettings.available_models.map((model) => (
              <label
                key={model}
                className="flex items-center gap-2 text-sm text-text-primary cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={
                    selectedModel === model ||
                    (showCustomModel && customModel === model)
                  }
                  onChange={() => {
                    if (selectedModel === model) {
                      setSelectedModel('');
                    } else {
                      setSelectedModel(model);
                      setShowCustomModel(false);
                    }
                  }}
                  className="w-4 h-4 rounded border-border-tech bg-surface-lowest text-mint-precision focus:ring-mint-precision/20"
                />
                <span className="text-xs font-mono">{model}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSaveSettings}
        disabled={settingsSaving || llmSettingsLoading}
        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          settingsSaved
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none'
        }`}
      >
        {settingsSaving ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Guardando...
          </>
        ) : settingsSaved ? (
          <>
            <Save size={14} />
            ¡Guardado!
          </>
        ) : (
          <>
            <Save size={14} />
            Guardar configuración
          </>
        )}
      </button>
    </div>
  );
}
