import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  Film,
  Package,
  FileCode,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { TimelineSpec } from '../../types/job';

type ExportMode = 'all' | 'selected';

interface ExportFormats {
  mp4: boolean;
  ae: boolean;
  spec: boolean;
}

interface ExportPanelProps {
  spec: TimelineSpec | null;
  isReadyToRender: boolean;
  renderLoading: boolean;
  exportLoading: boolean;
  onRender: () => void;
  onAEExport: () => void;
  onRegenerateAE: () => void;
  onSpecDownload: () => void;
}

export function ExportPanel({
  spec,
  isReadyToRender,
  renderLoading,
  exportLoading,
  onRender,
  onAEExport,
  onRegenerateAE,
  onSpecDownload,
}: ExportPanelProps) {
  const [exportMode, setExportMode] = useState<ExportMode>('all');
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(() => {
    if (spec) {
      return new Set(spec.scenes.map((_, idx) => idx));
    }
    return new Set();
  });
  const [exportFormats, setExportFormats] = useState<ExportFormats>({
    mp4: true,
    ae: true,
    spec: true,
  });
  const [formatsExpanded, setFormatsExpanded] = useState(true);

  const sceneCount = spec?.scenes.length ?? 0;

  const toggleScene = (idx: number) => {
    setSelectedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const selectAllScenes = () => {
    if (spec) {
      setSelectedScenes(new Set(spec.scenes.map((_, idx) => idx)));
    }
  };

  const deselectAllScenes = () => {
    setSelectedScenes(new Set());
  };

  const toggleFormat = (key: keyof ExportFormats) => {
    setExportFormats((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const anyFormatSelected = exportFormats.mp4 || exportFormats.ae || exportFormats.spec;
  const selectedSceneCount = selectedScenes.size;

  const backendSupportsPartialExport = false;

  const handleExport = () => {
    if (!anyFormatSelected) return;

    if (exportMode === 'all') {
      if (exportFormats.mp4) onRender();
      if (exportFormats.ae) onAEExport();
      if (exportFormats.spec) onSpecDownload();
    } else {
      if (backendSupportsPartialExport) {
        if (exportFormats.mp4) onRender();
        if (exportFormats.ae) onAEExport();
        if (exportFormats.spec) onSpecDownload();
      } else {
        if (exportFormats.mp4) onRender();
        if (exportFormats.ae) onAEExport();
        if (exportFormats.spec) onSpecDownload();
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Export mode selector */}
      <div className="bg-surface-container border border-border-tech rounded-xl p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Download size={16} />
          Exportar Proyecto
        </h3>

        <p className="text-text-secondary text-sm mb-4">Modo de exportación:</p>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={() => setExportMode('all')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
              exportMode === 'all'
                ? 'bg-mint-precision/10 border-mint-precision/40 text-mint-precision'
                : 'bg-surface-high border-border-tech text-text-secondary hover:text-text-primary hover:border-border-tech/80'
            }`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              exportMode === 'all' ? 'border-mint-precision' : 'border-text-secondary/40'
            }`}>
              {exportMode === 'all' && <span className="w-2 h-2 rounded-full bg-mint-precision" />}
            </span>
            Todo el proyecto
          </button>
          <button
            onClick={() => setExportMode('selected')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
              exportMode === 'selected'
                ? 'bg-mint-precision/10 border-mint-precision/40 text-mint-precision'
                : 'bg-surface-high border-border-tech text-text-secondary hover:text-text-primary hover:border-border-tech/80'
            }`}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              exportMode === 'selected' ? 'border-mint-precision' : 'border-text-secondary/40'
            }`}>
              {exportMode === 'selected' && <span className="w-2 h-2 rounded-full bg-mint-precision" />}
            </span>
            Escenas seleccionadas
          </button>
        </div>

        {/* Scene selection panel (only when mode is 'selected') */}
        <AnimatePresence>
          {exportMode === 'selected' && spec && spec.scenes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-6 bg-surface-lowest rounded-xl border border-border-tech/50 overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-text-secondary/60">
                    Selecciona las escenas a exportar:
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllScenes}
                      className="text-[10px] font-medium text-mint-precision/70 hover:text-mint-precision transition-colors"
                    >
                      Seleccionar todas
                    </button>
                    <button
                      onClick={deselectAllScenes}
                      className="text-[10px] font-medium text-text-secondary/40 hover:text-text-secondary transition-colors"
                    >
                      Deseleccionar todas
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {spec.scenes.map((scene, idx) => {
                    const isSelected = selectedScenes.has(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleScene(idx)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-mint-precision/5 hover:bg-mint-precision/10'
                            : 'bg-surface-container hover:bg-surface-high'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-mint-precision border-mint-precision'
                            : 'border-border-tech bg-surface-high'
                        }`}>
                          {isSelected && <Check size={10} className="text-deep-slate" />}
                        </span>
                        <span className="text-[10px] font-bold text-mint-precision/70 bg-mint-precision/10 px-1.5 py-0.5 rounded shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs text-text-secondary/40 font-mono shrink-0">
                          {scene.duration_seconds}s
                        </span>
                        <span className="text-xs text-text-primary truncate">
                          &ldquo;{scene.text.slice(0, 50)}{scene.text.length > 50 ? '...' : ''}&rdquo;
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-text-secondary/40 mt-2">
                  {selectedSceneCount} de {sceneCount} escenas seleccionadas
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Warning for partial export */}
        {exportMode === 'selected' && !backendSupportsPartialExport && selectedSceneCount < sceneCount && selectedSceneCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-cadmium-orange/10 border border-cadmium-orange/20"
          >
            <AlertTriangle size={14} className="text-cadmium-orange shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary/70">
              La exportación por escenas requiere soporte del backend. Por ahora se exportará el proyecto completo.
            </p>
          </motion.div>
        )}

        {/* Export formats */}
        <div className="mb-6">
          <button
            onClick={() => setFormatsExpanded(!formatsExpanded)}
            className="flex items-center gap-2 text-sm font-semibold text-text-primary hover:text-mint-precision transition-colors mb-3"
          >
            {formatsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Formato de exportación
          </button>
          <AnimatePresence>
            {formatsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                <label className="flex items-center gap-3 p-3 rounded-lg bg-surface-lowest cursor-pointer hover:bg-surface-high transition-colors">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    exportFormats.mp4
                      ? 'bg-mint-precision border-mint-precision'
                      : 'border-border-tech bg-surface-high'
                  }`}>
                    {exportFormats.mp4 && <Check size={10} className="text-deep-slate" />}
                  </span>
                  <Film size={14} className="text-text-secondary/50" />
                  <span className="text-sm text-text-primary">Video MP4</span>
                  <input
                    type="checkbox"
                    checked={exportFormats.mp4}
                    onChange={() => toggleFormat('mp4')}
                    className="sr-only"
                  />
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-surface-lowest cursor-pointer hover:bg-surface-high transition-colors">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    exportFormats.ae
                      ? 'bg-mint-precision border-mint-precision'
                      : 'border-border-tech bg-surface-high'
                  }`}>
                    {exportFormats.ae && <Check size={10} className="text-deep-slate" />}
                  </span>
                  <Package size={14} className="text-text-secondary/50" />
                  <span className="text-sm text-text-primary">After Effects (proyecto editable)</span>
                  <input
                    type="checkbox"
                    checked={exportFormats.ae}
                    onChange={() => toggleFormat('ae')}
                    className="sr-only"
                  />
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-surface-lowest cursor-pointer hover:bg-surface-high transition-colors">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    exportFormats.spec
                      ? 'bg-mint-precision border-mint-precision'
                      : 'border-border-tech bg-surface-high'
                  }`}>
                    {exportFormats.spec && <Check size={10} className="text-deep-slate" />}
                  </span>
                  <FileCode size={14} className="text-text-secondary/50" />
                  <span className="text-sm text-text-primary">spec.json</span>
                  <input
                    type="checkbox"
                    checked={exportFormats.spec}
                    onChange={() => toggleFormat('spec')}
                    className="sr-only"
                  />
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={!anyFormatSelected || exportLoading || (exportMode === 'selected' && selectedSceneCount === 0)}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
            anyFormatSelected && !exportLoading && !(exportMode === 'selected' && selectedSceneCount === 0)
              ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
              : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
          }`}
        >
          {exportLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download size={14} />
              {exportMode === 'all'
                ? 'Exportar proyecto completo'
                : `Exportar ${selectedSceneCount} escena${selectedSceneCount !== 1 ? 's' : ''}`}
            </>
          )}
        </button>
      </div>

      {/* Quick actions (legacy individual buttons, kept for direct access) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <button
          onClick={onRender}
          disabled={!isReadyToRender || renderLoading}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
            isReadyToRender
              ? 'border-mint-precision/30 text-mint-precision hover:bg-mint-precision/10'
              : 'border-border-tech text-text-secondary/40 cursor-not-allowed'
          }`}
        >
          {renderLoading ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
          Renderizar MP4
        </button>
        <button
          onClick={onAEExport}
          disabled={exportLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border border-border-tech text-text-secondary hover:text-text-primary hover:bg-surface-high transition-all"
        >
          <Package size={14} />
          After Effects
        </button>
        <button
          onClick={onRegenerateAE}
          disabled={exportLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border border-border-tech text-text-secondary hover:text-text-primary hover:bg-surface-high transition-all"
        >
          <RefreshCw size={14} />
          Regenerar AE
        </button>
        <button
          onClick={onSpecDownload}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border border-border-tech text-text-secondary hover:text-text-primary hover:bg-surface-high transition-all"
        >
          <FileCode size={14} />
          spec.json
        </button>
      </div>
    </div>
  );
}
