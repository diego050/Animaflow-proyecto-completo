import { useState, useRef, useEffect } from 'react';
import { Monitor, Smartphone, Square, Image, Check, ChevronDown, Grid3x3, CheckSquare, MousePointer } from 'lucide-react';
import { api } from '../../api/client';
import { useToastStore } from '../../store/useToastStore';

const PRESET_RATIOS = [
  { value: '9:16', label: 'Vertical (9:16)', icon: Smartphone },
  { value: '16:9', label: 'Horizontal (16:9)', icon: Monitor },
  { value: '1:1', label: 'Cuadrado (1:1)', icon: Square },
  { value: '4:5', label: 'Instagram (4:5)', icon: Image },
  { value: '21:9', label: 'Cinemascope (21:9)', icon: Monitor },
];

interface ReformatButtonProps {
  currentRatio: string;
  jobId: string;
  sceneCount: number;
  selectedScenes?: number[];
  currentSceneIndex?: number;
  onReformat?: () => void;
}

export function ReformatButton({
  currentRatio,
  jobId,
  sceneCount,
  selectedScenes = [],
  currentSceneIndex,
  onReformat,
}: ReformatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customRatio, setCustomRatio] = useState('');
  const [selectedRatio, setSelectedRatio] = useState(currentRatio);
  const [sceneSelection, setSceneSelection] = useState<'all' | 'selected' | 'current'>('all');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToastStore();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleReformat = async () => {
    const ratio = showCustomInput ? customRatio : selectedRatio;

    if (!ratio || !ratio.includes(':')) {
      addToast('error', 'Ingresa un ratio válido (ej: 16:9)');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        aspect_ratio: ratio,
        scene_selection: sceneSelection,
      };

      if (sceneSelection === 'selected') {
        payload.scene_indices = selectedScenes.length > 0 ? selectedScenes : [0];
      } else if (sceneSelection === 'current') {
        payload.current_scene_index = currentSceneIndex ?? 0;
      }

      await api.post(`/api/jobs/${jobId}/reformat`, payload);

      const sceneLabel =
        sceneSelection === 'all'
          ? 'todas las escenas'
          : sceneSelection === 'selected'
            ? `${selectedScenes.length} escenas`
            : 'escena actual';

      addToast('success', `Reformateando ${sceneLabel} a ${ratio}`);
      onReformat?.();
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Error al reformatear');
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-high text-text-secondary hover:text-text-primary text-sm transition-colors"
      >
        <Monitor size={14} />
        {loading ? 'Reformateando...' : `Formato: ${currentRatio}`}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-surface-container border border-border-tech rounded-lg shadow-xl z-50 p-4 space-y-4">
          {/* Ratio Selection */}
          <div>
            <label className="text-xs text-text-secondary/60 mb-2 block">Ratio de aspecto</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {PRESET_RATIOS.map(ratio => {
                const Icon = ratio.icon;
                const isActive = selectedRatio === ratio.value && !showCustomInput;
                return (
                  <button
                    key={ratio.value}
                    onClick={() => {
                      setSelectedRatio(ratio.value);
                      setShowCustomInput(false);
                      setCustomRatio('');
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                      isActive
                        ? 'bg-mint-precision/10 border border-mint-precision/40 text-mint-precision'
                        : 'bg-surface-lowest border border-border-tech text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{ratio.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Ratio Toggle */}
            <button
              onClick={() => {
                setShowCustomInput(!showCustomInput);
                if (!showCustomInput) {
                  setSelectedRatio('');
                }
              }}
              className="text-xs text-mint-precision hover:underline mt-1"
            >
              {showCustomInput ? 'Usar preset' : 'Ratio personalizado'}
            </button>

            {showCustomInput && (
              <input
                type="text"
                value={customRatio}
                onChange={(e) => setCustomRatio(e.target.value)}
                placeholder="ej: 21:9, 2.39:1, 3:4"
                className="w-full mt-2 bg-surface-container border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary focus:border-mint-precision outline-none"
              />
            )}
          </div>

          {/* Scene Selection */}
          <div>
            <label className="text-xs text-text-secondary/60 mb-2 block">Escenas a reformatear</label>
            <div className="space-y-1">
              <button
                onClick={() => setSceneSelection('all')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  sceneSelection === 'all'
                    ? 'bg-mint-precision/10 text-mint-precision'
                    : 'text-text-secondary hover:bg-surface-high'
                }`}
              >
                <Grid3x3 size={14} />
                <span>Todas las escenas ({sceneCount})</span>
                {sceneSelection === 'all' && <Check size={14} className="ml-auto" />}
              </button>

              <button
                onClick={() => setSceneSelection('selected')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  sceneSelection === 'selected'
                    ? 'bg-mint-precision/10 text-mint-precision'
                    : 'text-text-secondary hover:bg-surface-high'
                }`}
              >
                <CheckSquare size={14} />
                <span>Escenas seleccionadas ({selectedScenes.length})</span>
                {sceneSelection === 'selected' && <Check size={14} className="ml-auto" />}
              </button>

              <button
                onClick={() => setSceneSelection('current')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  sceneSelection === 'current'
                    ? 'bg-mint-precision/10 text-mint-precision'
                    : 'text-text-secondary hover:bg-surface-high'
                }`}
              >
                <MousePointer size={14} />
                <span>Solo escena actual {currentSceneIndex !== undefined ? `(#${currentSceneIndex + 1})` : ''}</span>
                {sceneSelection === 'current' && <Check size={14} className="ml-auto" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-border-tech/50">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-surface-high transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleReformat}
              disabled={loading || (!selectedRatio && !customRatio)}
              className="flex-1 px-3 py-2 rounded-lg text-xs bg-mint-precision text-deep-slate font-semibold hover:bg-white transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Reformatear'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
