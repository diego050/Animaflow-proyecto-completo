import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import type { Spec } from '../../types/spec';
import { editScene } from '../../api/sceneEdit';
import { useToastStore } from '../../store/useToastStore';

interface SceneInlineEditorProps {
  scene: Spec;
  sceneIndex: number;
  jobId: string;
  isFocused: boolean;
  aspectRatio?: string;
  onSpecChange?: (sceneIndex: number, updatedScene: Spec) => void;
}

export function SceneInlineEditor({
  scene,
  sceneIndex,
  jobId,
  isFocused,
  aspectRatio = '9:16',
  onSpecChange,
}: SceneInlineEditorProps) {
  const [expanded, setExpanded] = useState(isFocused);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToast } = useToastStore();

  const composer = scene.anima_composer;

  // Auto-expand when focused
  useEffect(() => {
    if (isFocused) setExpanded(true);
  }, [isFocused]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Debounced auto-save function
  const scheduleSave = useCallback(
    (fieldPath: string, value: unknown) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await editScene(jobId, sceneIndex, {
            mode: 'manual',
            changes: [{ field_path: fieldPath, value }],
          });
          addToast('success', `Escena ${sceneIndex + 1} actualizada`);
        } catch {
          addToast('error', 'Error al guardar');
        } finally {
          setSaving(false);
        }
      }, 500); // 500ms debounce
    },
    [jobId, sceneIndex, addToast],
  );

  const handleFieldChange = useCallback(
    (fieldPath: string, value: unknown) => {
      // Update local spec immediately for instant preview
      if (onSpecChange) {
        const updatedScene = JSON.parse(JSON.stringify(scene)) as Spec;
        // Simple nested set for local update
        const keys = fieldPath.split('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let current: any = updatedScene;
        for (const key of keys.slice(0, -1)) {
          current = current[key];
        }
        current[keys[keys.length - 1]] = value;
        onSpecChange(sceneIndex, updatedScene);
      }

      // Schedule backend save
      scheduleSave(fieldPath, value);
    },
    [scene, sceneIndex, onSpecChange, scheduleSave],
  );

  const handleReorderLayer = useCallback((index: number, direction: number) => {
    const newIndex = index + direction;
    if (!composer.layers || newIndex < 0 || newIndex >= composer.layers.length) return;

    const newLayers = [...composer.layers];
    [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];

    handleFieldChange('anima_composer.layers', newLayers);
  }, [composer.layers, handleFieldChange]);

  // Compute center coordinates based on aspect ratio
  const centerX = aspectRatio === '16:9' ? 960 : 540;
  const centerY = aspectRatio === '16:9' ? 540 : 960;

  if (!composer) {
    return (
      <div className="p-4 border-b border-border-tech/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-secondary/50">
            Escena {sceneIndex + 1}
          </span>
          <span className="text-[10px] text-text-secondary/30">
            {scene.duration_seconds}s
          </span>
        </div>
        <p className="text-[10px] text-text-secondary/30 mt-1 truncate">
          {scene.text}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`border-b border-border-tech/30 ${isFocused ? 'bg-mint-precision/5' : ''}`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-surface-elevated transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown size={14} className="text-text-secondary/50" />
          ) : (
            <ChevronRight size={14} className="text-text-secondary/50" />
          )}
          <span className="text-xs font-bold text-text-primary">
            Escena {sceneIndex + 1}
          </span>
          {saving && (
            <span className="text-[10px] text-mint-precision animate-pulse">
              Guardando...
            </span>
          )}
        </div>
        <span className="text-[10px] text-text-secondary/40">
          {scene.duration_seconds}s
        </span>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Text */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary/40 font-semibold">
              Texto
            </label>
            <textarea
              value={scene.text}
              onChange={(e) => handleFieldChange('text', e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded px-2 py-1 text-xs text-text-primary mt-1 resize-none"
              rows={2}
            />
          </div>

          {/* Timing */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary/40 font-semibold">
              Duracion
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                value={scene.duration_seconds ?? 5}
                onChange={(e) =>
                  handleFieldChange(
                    'duration_seconds',
                    parseFloat(e.target.value),
                  )
                }
                min={1}
                max={30}
                step={0.5}
                className="flex-1 accent-mint-precision"
              />
              <span className="text-[10px] font-mono text-text-secondary/50 w-8 text-right">
                {scene.duration_seconds}s
              </span>
            </div>
          </div>

          {/* Background */}
          {composer.background && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-secondary/40 font-semibold">
                Fondo
              </label>
              <div className="flex items-center gap-2 mt-1">
                {composer.background.colors?.map(
                  (color: string, i: number) => (
                    <input
                      key={i}
                      type="color"
                      value={color}
                      onChange={(e) =>
                        handleFieldChange(
                          `anima_composer.background.colors.${i}`,
                          e.target.value,
                        )
                      }
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                    />
                  ),
                )}
              </div>
            </div>
          )}

          {/* Layers */}
          {composer.layers?.map(
            (layer, layerIdx: number) => (
              <div
                key={layerIdx}
                className="pt-2 border-t border-border-tech/30"
              >
                {/* Layer header with label input */}
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="text"
                    value={layer.label ?? `Capa ${layerIdx + 1}`}
                    onChange={(e) => handleFieldChange(`anima_composer.layers.${layerIdx}.label`, e.target.value)}
                    className="flex-1 bg-surface-lowest border border-border-tech rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-secondary/30"
                    placeholder="Nombre de la capa..."
                  />
                  <span className="text-[9px] text-text-secondary/30 font-mono">{layer.type}</span>
                </div>

                <div className="space-y-1.5 mt-1">
                  {/* Position X */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary/50 w-3">
                      X
                    </span>
                    <input
                      type="range"
                      value={typeof layer.x === 'number' ? layer.x : 540}
                      onChange={(e) =>
                        handleFieldChange(
                          `anima_composer.layers.${layerIdx}.x`,
                          parseFloat(e.target.value),
                        )
                      }
                      min={0}
                      max={1080}
                      className="flex-1 accent-mint-precision"
                    />
                    <span className="text-[10px] font-mono text-text-secondary/50 w-6 text-right">
                      {typeof layer.x === 'number' ? layer.x : 540}
                    </span>
                  </div>
                  {/* Position Y */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary/50 w-3">
                      Y
                    </span>
                    <input
                      type="range"
                      value={typeof layer.y === 'number' ? layer.y : 540}
                      onChange={(e) =>
                        handleFieldChange(
                          `anima_composer.layers.${layerIdx}.y`,
                          parseFloat(e.target.value),
                        )
                      }
                      min={0}
                      max={1920}
                      className="flex-1 accent-mint-precision"
                    />
                    <span className="text-[10px] font-mono text-text-secondary/50 w-6 text-right">
                      {typeof layer.y === 'number' ? layer.y : 540}
                    </span>
                  </div>
                  {/* Center guide */}
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-[9px] text-mint-precision/60 font-mono">
                      Centro: X={centerX}, Y={centerY}
                    </span>
                  </div>
                  {/* Scale */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary/50 w-6">
                      Esc
                    </span>
                    <input
                      type="range"
                      value={typeof layer.scale === 'number' ? layer.scale : 1}
                      onChange={(e) =>
                        handleFieldChange(
                          `anima_composer.layers.${layerIdx}.scale`,
                          parseFloat(e.target.value),
                        )
                      }
                      min={0.1}
                      max={3}
                      step={0.1}
                      className="flex-1 accent-mint-precision"
                    />
                    <span className="text-[10px] font-mono text-text-secondary/50 w-6 text-right">
                      {typeof layer.scale === 'number' ? layer.scale : 1}
                    </span>
                  </div>
                  {/* Color */}
                  {layer.fill && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-secondary/50 w-6">
                        Color
                      </span>
                      <input
                        type="color"
                        value={layer.fill}
                        onChange={(e) =>
                          handleFieldChange(
                            `anima_composer.layers.${layerIdx}.fill`,
                            e.target.value,
                          )
                        }
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                      />
                      <span className="text-[10px] font-mono text-text-secondary/50">
                        {layer.fill}
                      </span>
                    </div>
                  )}
                  {/* Entry animation */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary/50 w-6">
                      Entrada
                    </span>
                    <select
                      value={layer.entry ?? 'fade-in'}
                      onChange={(e) =>
                        handleFieldChange(
                          `anima_composer.layers.${layerIdx}.entry`,
                          e.target.value,
                        )
                      }
                      className="flex-1 bg-surface-lowest border border-border-tech rounded px-2 py-1 text-[10px] text-text-primary"
                    >
                      <option value="fade-in">Fade In</option>
                      <option value="slide-up">Slide Up</option>
                      <option value="slide-down">Slide Down</option>
                      <option value="scale-in">Scale In</option>
                      <option value="spring-in">Spring In</option>
                      <option value="bounce-in">Bounce In</option>
                    </select>
                  </div>
                  {/* Exit animation */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary/50 w-6">
                      Salida
                    </span>
                    <select
                      value={layer.exit ?? ''}
                      onChange={(e) =>
                        handleFieldChange(
                          `anima_composer.layers.${layerIdx}.exit`,
                          e.target.value || null,
                        )
                      }
                      className="flex-1 bg-surface-lowest border border-border-tech rounded px-2 py-1 text-[10px] text-text-primary"
                    >
                      <option value="">Ninguna</option>
                      <option value="fade-out">Fade Out</option>
                      <option value="slide-up-out">Slide Up Out</option>
                      <option value="scale-out">Scale Out</option>
                    </select>
                  </div>

                  {/* Component-specific props */}
                  {layer.type === 'component' && layer.props && Object.keys(layer.props).length > 0 && (
                    <div className="pt-2 border-t border-border-tech/30 mt-2">
                      <label className="text-[10px] uppercase tracking-wider text-text-secondary/40 font-semibold">
                        Props del Componente ({layer.componentName ?? 'unknown'})
                      </label>
                      <div className="space-y-1.5 mt-1">
                        {Object.entries(layer.props).map(([key, value]) => (
                          <DynamicPropField
                            key={key}
                            propName={key}
                            propValue={value}
                            onChange={(newValue) => handleFieldChange(`anima_composer.layers.${layerIdx}.props.${key}`, newValue)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reorder buttons */}
                <div className="flex items-center gap-0.5 mt-1">
                  <button
                    onClick={() => handleReorderLayer(layerIdx, -1)}
                    disabled={layerIdx === 0}
                    className="p-0.5 rounded text-text-secondary/30 hover:text-mint-precision disabled:opacity-20 transition-colors"
                    title="Mover arriba"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={() => handleReorderLayer(layerIdx, 1)}
                    disabled={layerIdx === (composer.layers?.length ?? 1) - 1}
                    className="p-0.5 rounded text-text-secondary/30 hover:text-mint-precision disabled:opacity-20 transition-colors"
                    title="Mover abajo"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function DynamicPropField({ propName, propValue, onChange }: {
  propName: string;
  propValue: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = propName.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  
  // Auto-detect type
  if (typeof propValue === 'number') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-secondary/50 w-16 truncate" title={propName}>{label}</span>
        <input
          type="range"
          value={propValue}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={0}
          max={1000}
          step={1}
          className="flex-1 accent-mint-precision"
        />
        <span className="text-[10px] font-mono text-text-secondary/50 w-8 text-right">{propValue}</span>
      </div>
    );
  }
  
  if (typeof propValue === 'string') {
    // Check if it looks like a color
    if (/^#[0-9a-fA-F]{3,8}$/.test(propValue)) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-secondary/50 w-16 truncate" title={propName}>{label}</span>
          <input
            type="color"
            value={propValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
          />
          <span className="text-[10px] font-mono text-text-secondary/50">{propValue}</span>
        </div>
      );
    }
    
    // Regular string
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-secondary/50 w-16 truncate" title={propName}>{label}</span>
        <input
          type="text"
          value={propValue}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-surface-lowest border border-border-tech rounded px-2 py-1 text-[10px] text-text-primary"
        />
      </div>
    );
  }
  
  if (typeof propValue === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-secondary/50 w-16 truncate" title={propName}>{label}</span>
        <button
          onClick={() => onChange(!propValue)}
          className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
            propValue ? 'bg-mint-precision/20 text-mint-precision' : 'bg-surface-high text-text-secondary/50'
          }`}
        >
          {propValue ? 'ON' : 'OFF'}
        </button>
      </div>
    );
  }
  
  // Fallback for objects/arrays
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-secondary/50 w-16 truncate" title={propName}>{label}</span>
      <span className="text-[10px] font-mono text-text-secondary/30 italic">
        {Array.isArray(propValue) ? `[${propValue.length} items]` : '{object}'}
      </span>
    </div>
  );
}
