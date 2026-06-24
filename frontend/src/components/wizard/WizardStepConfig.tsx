import { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, Check, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserLLMSettings } from '../../types/auth';
import { AVAILABLE_MODELS, ADMIN_ONLY_MODELS } from '../../types/auth';
import { useAuthStore } from '../../store/useAuthStore';

interface AspectRatioOption {
  value: string;
  label: string;
  description: string;
  silhouette: { width: string; height: string };
}

const ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '9:16', label: '9:16', description: 'Stories / Reels / TikTok', silhouette: { width: 'w-3.5', height: 'h-6' } },
  { value: '4:5', label: '4:5', description: 'Instagram Feed', silhouette: { width: 'w-4', height: 'h-5' } },
  { value: '1:1', label: '1:1', description: 'Cuadrado', silhouette: { width: 'w-5', height: 'h-5' } },
  { value: '16:9', label: '16:9', description: 'YouTube / Landscape', silhouette: { width: 'w-6', height: 'h-3.5' } },
  { value: '3:4', label: '3:4', description: 'Pinterest / Portrait', silhouette: { width: 'w-4', height: 'h-5.5' } },
];

// ---------------------------------------------------------------------------
// Aspect Ratio Selector
// ---------------------------------------------------------------------------

export function AspectRatioSelector({
  value,
  onChange,
  customWidth,
  customHeight,
  onCustomWidthChange,
  onCustomHeightChange,
}: {
  value: string;
  onChange: (value: string) => void;
  customWidth: number;
  customHeight: number;
  onCustomWidthChange: (value: number) => void;
  onCustomHeightChange: (value: number) => void;
}) {
  const isCustom = value === 'custom';

  return (
    <div>
      <label className="block text-text-secondary text-sm font-medium mb-3">
        Relación de aspecto
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        {ASPECT_RATIOS.map((ratio) => {
          const isSelected = value === ratio.value;
          return (
            <button
              key={ratio.value}
              onClick={() => onChange(ratio.value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-all duration-200 ${
                isSelected
                  ? 'border-mint-precision/40 bg-mint-precision/5 shadow-[0_0_12px_rgba(0,255,171,0.06)]'
                  : 'border-border-tech bg-surface-container hover:border-outline-variant hover:bg-surface-high'
              }`}
            >
              {/* Visual silhouette */}
              <div className={`flex items-center justify-center h-8 ${isSelected ? 'text-mint-precision' : 'text-text-secondary/60'}`}>
                <div
                  className={`${ratio.silhouette.width} ${ratio.silhouette.height} rounded-sm border-2 transition-colors ${
                    isSelected
                      ? 'border-mint-precision bg-mint-precision/10'
                      : 'border-text-secondary/40 bg-transparent'
                  }`}
                />
              </div>

              <span
                className={`text-sm font-semibold ${
                  isSelected ? 'text-mint-precision' : 'text-text-primary'
                }`}
              >
                {ratio.label}
              </span>
              <p className="text-[10px] text-text-secondary/50 leading-tight">
                {ratio.description}
              </p>
            </button>
          );
        })}

        {/* Custom option */}
        <button
          onClick={() => onChange('custom')}
          className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-all duration-200 ${
            isCustom
              ? 'border-mint-precision/40 bg-mint-precision/5 shadow-[0_0_12px_rgba(0,255,171,0.06)]'
              : 'border-border-tech bg-surface-container hover:border-outline-variant hover:bg-surface-high'
          }`}
        >
          {/* Settings icon as silhouette */}
          <div className={`flex items-center justify-center h-8 ${isCustom ? 'text-mint-precision' : 'text-text-secondary/60'}`}>
            <Settings size={18} />
          </div>

          <span
            className={`text-sm font-semibold ${
              isCustom ? 'text-mint-precision' : 'text-text-primary'
            }`}
          >
            Personalizado
          </span>
          <p className="text-[10px] text-text-secondary/50">
            Ancho × Alto
          </p>
        </button>
      </div>

      {/* Custom dimension inputs */}
      <AnimatePresence>
        {isCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-1.5">
                  Ancho (px)
                </label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => onCustomWidthChange(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-xs font-medium mb-1.5">
                  Alto (px)
                </label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => onCustomHeightChange(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model Selector
// ---------------------------------------------------------------------------

export function ModelSelector({
  llmSettings,
  selectedModel,
  onChange,
}: {
  llmSettings: UserLLMSettings | null;
  selectedModel: string | null;
  onChange: (value: string | null) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const isPrivileged = user?.role === 'admin' || user?.role === 'founder';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const baseModels =
    llmSettings?.available_models && llmSettings.available_models.length > 0
      ? llmSettings.available_models
      : Object.values(AVAILABLE_MODELS).flat();
  // Modelos admin-only (ej. Gemma) solo para admin/founder.
  const adminModels = isPrivileged ? Object.values(ADMIN_ONLY_MODELS).flat() : [];
  const availableModels: string[] = Array.from(new Set([...baseModels, ...adminModels]));

  const displayModel = selectedModel || llmSettings?.default_model || 'gemini-2.0-flash (predeterminado)';
  const isDefault = !selectedModel && !!llmSettings?.default_model;

  return (
    <div>
      <label className="block text-text-secondary text-sm font-medium mb-2">
        <Sparkles size={14} className="inline mr-1.5 -mt-0.5" />
        Modelo a usar
      </label>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary hover:border-outline-variant transition-colors"
        >
          <span className={isDefault ? 'text-text-secondary/70' : 'text-text-primary'}>
            {displayModel}
          </span>
          <ChevronDown size={14} className="text-text-secondary/50 shrink-0 ml-2" />
        </button>
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-10 w-full mt-1 bg-surface-highest border border-border-tech rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto"
            >
              {/* Default option */}
              <button
                onClick={() => {
                  onChange(null);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-text-primary hover:bg-surface-high transition-colors"
              >
                <span className="text-text-secondary/70">
                  {llmSettings?.default_model || 'gemini-2.0-flash'} (predeterminado)
                </span>
                {!selectedModel && (
                  <Check size={14} className="text-mint-precision" />
                )}
              </button>

              {/* Available models */}
              {availableModels.map((model) => (
                <button
                  key={model}
                  onClick={() => {
                    onChange(model);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-text-primary hover:bg-surface-high transition-colors"
                >
                  <span>{model}</span>
                  {selectedModel === model && (
                    <Check size={14} className="text-mint-precision" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="text-xs text-text-secondary/40 mt-1.5">
        Si no tienes este modelo, puedes agregar uno personalizado en{' '}
        <span className="text-mint-precision/70 cursor-pointer hover:underline">
          Configuración → API Keys
        </span>
      </p>
    </div>
  );
}
