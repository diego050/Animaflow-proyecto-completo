import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Play,
  Download,
  Loader2,
  AlertTriangle,
  Clock,
  Layers,
  Monitor,
  Pencil,
  Check,
  X as XIcon,
  SkipForward,
  Film,
  FileCode,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '../../store/useDashboardStore';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { ProgressSteps } from '../../components/dashboard/ProgressSteps';
import { PreviewPlayer } from '../../components/PreviewPlayer';
import type { TimelineSpec, SceneSpec } from '../../types/job';
import { isTerminalStatus, isProcessingStatus, isRenderStatus } from '../../types/job';

const TABS = [
  { key: 'script', label: 'Guión', icon: FileText },
  { key: 'preview', label: 'Preview', icon: Play },
  { key: 'export', label: 'Exportar', icon: Download },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a filtered TimelineSpec containing only the scene at the given index. */
function createFilteredSpec(spec: TimelineSpec, sceneIndex: number): TimelineSpec {
  const scene = spec.scenes[sceneIndex];
  if (!scene) return spec;
  return {
    ...spec,
    scenes: [
      {
        ...scene,
        start_time_seconds: 0,
      },
    ],
  };
}

export function ProjectDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { selectedJob, selectedJobLoading, selectJob, triggerRender, triggerAEExport, startPolling, stopPolling } =
    useDashboardStore();
  const [activeTab, setActiveTab] = useState<TabKey>('script');
  const [exportLoading, setExportLoading] = useState(false);
  const [renderLoading, setRenderLoading] = useState(false);
  /** Index of the scene to focus on in the Preview tab (set from ScriptTab). */
  const [focusSceneIndex, setFocusSceneIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!jobId) return;
    selectJob(jobId);
  }, [jobId, selectJob]);

  // Start polling if job is not terminal
  useEffect(() => {
    if (!selectedJob) return;
    if (!isTerminalStatus(selectedJob.status)) {
      startPolling(selectedJob.job_id);
    }
    return () => {
      stopPolling();
    };
  }, [selectedJob, startPolling, stopPolling]);

  const handleRender = useCallback(async () => {
    if (!jobId) return;
    setRenderLoading(true);
    try {
      await triggerRender(jobId);
    } catch {
      alert('Error al iniciar el render.');
    } finally {
      setRenderLoading(false);
    }
  }, [jobId, triggerRender]);

  const handleAEExport = useCallback(async () => {
    if (!jobId) return;
    setExportLoading(true);
    try {
      await triggerAEExport(jobId);
      // Open download in new tab
      window.open(
        `http://localhost:8000/api/jobs/${jobId}/export/after-effects/download`,
        '_blank',
      );
    } catch {
      alert('Error al exportar para After Effects.');
    } finally {
      setExportLoading(false);
    }
  }, [jobId, triggerAEExport]);

  const handleSpecDownload = useCallback(() => {
    if (!jobId) return;
    window.open(
      `http://localhost:8000/api/jobs/${jobId}/export/spec-json`,
      '_blank',
    );
  }, [jobId]);

  if (!jobId) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-error">No se encontró el ID del proyecto.</p>
      </div>
    );
  }

  if (selectedJobLoading && !selectedJob) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-mint-precision" />
      </div>
    );
  }

  if (!selectedJob) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
          <AlertTriangle size={32} className="mx-auto text-error mb-3" />
          <p className="text-error font-medium">Proyecto no encontrado</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-surface-high text-text-primary rounded-lg hover:bg-surface-highest transition-colors text-sm"
          >
            Volver a proyectos
          </button>
        </div>
      </div>
    );
  }

  const spec = selectedJob.result_spec;
  const isReadyToRender = selectedJob.status === 'completed';
  const isRendering = isRenderStatus(selectedJob.status);
  const isProcessing = isProcessingStatus(selectedJob.status);
  const isFailed = selectedJob.status === 'failed' || selectedJob.status === 'failed_render';

  return (
    <div className="p-6 lg:p-8">
      {/* Back button + header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-high transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-display font-bold text-text-primary">
            Proyecto {selectedJob.job_id.slice(0, 8)}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={selectedJob.status} size="md" />
            <span className="text-xs text-text-secondary/50 font-mono">
              {selectedJob.job_id}
            </span>
          </div>
        </div>
      </div>

      {/* Progress steps for processing/rendering jobs */}
      {(isProcessing || isRendering) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 bg-surface-container border border-border-tech rounded-xl p-6"
        >
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Progreso del pipeline
          </h3>
          <ProgressSteps status={selectedJob.status} />
        </motion.div>
      )}

      {/* Failed state */}
      {isFailed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 bg-error/10 border border-error/20 rounded-xl p-6"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-error" />
            <div>
              <p className="text-error font-semibold">
                {selectedJob.status === 'failed_render'
                  ? 'Error durante el renderizado'
                  : 'Error en el procesamiento'}
              </p>
              <p className="text-text-secondary text-sm mt-1">
                El pipeline falló. Intenta eliminar y crear un nuevo proyecto.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-lg p-1 mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          // Disable preview tab if no spec
          const isDisabled = tab.key === 'preview' && !spec;

          return (
            <button
              key={tab.key}
              onClick={() => !isDisabled && setActiveTab(tab.key)}
              disabled={isDisabled}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-surface-highest text-text-primary'
                  : isDisabled
                    ? 'text-text-secondary/30 cursor-not-allowed'
                    : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'script' && (
          <ScriptTab
            job={selectedJob}
            jobId={jobId}
            regenerateScene={useDashboardStore.getState().regenerateScene}
            onPreviewScene={(idx) => {
              setFocusSceneIndex(idx);
              setActiveTab('preview');
            }}
          />
        )}
        {activeTab === 'preview' && spec && (
          <PreviewTab
            spec={spec}
            aspectRatio={selectedJob.result_spec?.aspect_ratio}
            focusSceneIndex={focusSceneIndex}
            onClearFocus={() => setFocusSceneIndex(null)}
          />
        )}
        {activeTab === 'export' && (
          <ExportTab
            spec={spec}
            isReadyToRender={isReadyToRender}
            renderLoading={renderLoading}
            exportLoading={exportLoading}
            onRender={handleRender}
            onAEExport={handleAEExport}
            onSpecDownload={handleSpecDownload}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Script Tab - Read-only script with true inline editing + per-scene preview
// ---------------------------------------------------------------------------

interface ScriptTabProps {
  job: { result_spec: TimelineSpec | null; status: string; script_text?: string };
  jobId: string;
  regenerateScene: (
    jobId: string,
    sceneIndex: number,
    mediaQuery: string,
    text: string,
  ) => Promise<TimelineSpec | null>;
  onPreviewScene: (sceneIndex: number) => void;
}

function ScriptTab({ job, jobId, regenerateScene, onPreviewScene }: ScriptTabProps) {
  const spec = job.result_spec;
  /** Which scene is currently being edited (inline). */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  /** Draft values while editing. */
  const [editText, setEditText] = useState('');
  const [editMedia, setEditMedia] = useState('');
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  if (!spec) {
    return (
      <div className="bg-surface-container border border-border-tech rounded-xl p-8 text-center">
        <FileText size={32} className="mx-auto text-text-secondary/30 mb-3" />
        <p className="text-text-secondary">
          El guión estará disponible cuando el pipeline complete.
        </p>
        <p className="text-text-secondary/50 text-sm mt-1">
          Estado actual: {job.status}
        </p>
      </div>
    );
  }

  const totalDuration = spec.scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);

  const handleStartEdit = (idx: number, scene: SceneSpec) => {
    setEditingIndex(idx);
    setEditText(scene.text);
    setEditMedia(scene.media_query);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
    setEditMedia('');
  };

  const handleRegenerate = async (idx: number) => {
    const scene = spec.scenes[idx];
    if (editText === scene.text && editMedia === scene.media_query) {
      handleCancelEdit();
      return;
    }
    setRegeneratingIndex(idx);
    try {
      await regenerateScene(jobId, idx, editMedia, editText);
      handleCancelEdit();
    } catch {
      alert('Error al regenerar la escena.');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Script header */}
      <div className="bg-surface-container border border-border-tech rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Guión completo</h3>
        <p className="text-text-secondary/80 text-sm leading-relaxed whitespace-pre-wrap font-body">
          {spec.scenes.map((s) => s.text).join('\n\n')}
        </p>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-tech/50">
          <span className="flex items-center gap-1.5 text-xs text-text-secondary/50">
            <Layers size={14} />
            {spec.scenes.length} escenas
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-secondary/50">
            <Clock size={14} />
            {totalDuration.toFixed(1)}s total
          </span>
          {spec.aspect_ratio && (
            <span className="flex items-center gap-1.5 text-xs text-text-secondary/50">
              <Monitor size={14} />
              {spec.aspect_ratio}
            </span>
          )}
        </div>
      </div>

      {/* Scene breakdown with inline editors */}
      <h3 className="text-sm font-semibold text-text-primary mt-6 mb-2">Desglose por escenas</h3>
      <div className="space-y-3">
        {spec.scenes.map((scene, idx) => {
          const isEditing = editingIndex === idx;
          const isRegenerating = regeneratingIndex === idx;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-xl border overflow-hidden transition-colors ${
                isEditing
                  ? 'bg-surface-high border-mint-precision/40'
                  : 'bg-surface-container border-border-tech'
              }`}
            >
              <div className="p-5">
                {/* Scene header row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-mint-precision bg-mint-precision/10 px-2.5 py-1 rounded-full">
                    Escena {idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary/50 font-mono">
                      {scene.duration_seconds}s
                    </span>
                    {/* Preview this scene button */}
                    <button
                      onClick={() => onPreviewScene(idx)}
                      className="p-1.5 rounded-md text-text-secondary/50 hover:text-mint-precision hover:bg-mint-precision/10 transition-colors"
                      title="Preview de esta escena"
                    >
                      <Play size={14} />
                    </button>
                  </div>
                </div>

                {/* Text: read-only or editable textarea */}
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary/60 mb-1.5">
                        Texto a Mostrar y Narrar (TTS)
                      </label>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-surface-container border border-border-tech rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors resize-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary/60 mb-1.5">
                        Prompt Visual (Motor Generativo)
                      </label>
                      <textarea
                        value={editMedia}
                        onChange={(e) => setEditMedia(e.target.value)}
                        className="w-full bg-surface-container border border-emerald-900/30 rounded-lg px-3 py-2.5 text-sm text-emerald-400/90 font-mono placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors resize-none"
                        rows={4}
                      />
                    </div>
                    {/* Save / Cancel buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRegenerate(idx)}
                        disabled={isRegenerating}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-mint-precision text-deep-slate hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRegenerating ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Regenerando...
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            Guardar y Regenerar
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary/60 hover:text-text-primary hover:bg-surface-high transition-colors"
                      >
                        <XIcon size={14} />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-text-primary text-sm mb-3 leading-relaxed">&ldquo;{scene.text}&rdquo;</p>
                    <div className="bg-surface-lowest rounded-lg p-3 border border-border-tech/50">
                      <p className="text-[10px] uppercase tracking-wider text-text-secondary/40 mb-1 font-semibold">Media Query</p>
                      <p className="text-emerald-400/80 font-mono text-xs break-words">
                        {scene.media_query}
                      </p>
                    </div>
                    {scene.sfx && scene.sfx.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] uppercase tracking-wider text-text-secondary/40 mb-1.5 font-semibold">SFX Cues</p>
                        <div className="flex flex-wrap gap-2">
                          {scene.sfx.map((sfx, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] bg-surface-high text-text-secondary/70 px-2 py-1 rounded-full"
                            >
                              {sfx.keyword} @ {sfx.time_in_seconds}s
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handleStartEdit(idx, scene)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-medium text-text-secondary/60 hover:text-mint-precision transition-colors"
                    >
                      <Pencil size={12} />
                      Editar escena
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview Tab - Centered player with project info + scene focus support
// ---------------------------------------------------------------------------

interface PreviewTabProps {
  spec: TimelineSpec;
  aspectRatio?: string;
  focusSceneIndex?: number | null;
  onClearFocus?: () => void;
}

function PreviewTab({ spec, aspectRatio, focusSceneIndex, onClearFocus }: PreviewTabProps) {
  const totalDuration = spec.scenes.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);
  const sceneCount = spec.scenes.length;

  /** When a specific scene is focused, create a filtered spec with just that scene. */
  const displaySpec = useMemo<TimelineSpec>(() => {
    if (focusSceneIndex != null && focusSceneIndex >= 0 && focusSceneIndex < spec.scenes.length) {
      return createFilteredSpec(spec, focusSceneIndex);
    }
    return spec;
  }, [spec, focusSceneIndex]);

  const focusedScene = focusSceneIndex != null ? spec.scenes[focusSceneIndex] : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Player - centered */}
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-lowest rounded-xl border border-border-tech p-6 min-h-[400px]">
        {/* "Back to all scenes" button when focused */}
        {focusedScene && onClearFocus && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm mb-4"
          >
            <button
              onClick={onClearFocus}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-mint-precision bg-mint-precision/10 hover:bg-mint-precision/20 transition-colors"
            >
              <SkipForward size={14} />
              Volver a todas las escenas
            </button>
            <p className="text-text-secondary/50 text-xs mt-1.5">
              Preview: Escena {focusSceneIndex + 1} · {focusedScene.duration_seconds}s
            </p>
          </motion.div>
        )}

        <div className="w-full max-w-sm">
          <PreviewPlayer spec={displaySpec} aspectRatio={aspectRatio || '9:16'} />
        </div>
        <p className="text-text-secondary/40 text-xs mt-4">
          {focusedScene
            ? `Preview individual — Escena ${focusSceneIndex! + 1}`
            : 'Preview frame-accurate a 30fps'}
        </p>
      </div>

      {/* Project info sidebar */}
      <div className="w-full lg:w-72 space-y-4">
        <div className="bg-surface-container border border-border-tech rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Información del proyecto</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary/50">Escenas</span>
              <span className="text-sm font-semibold text-text-primary">{sceneCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary/50">Duración total</span>
              <span className="text-sm font-semibold text-text-primary">{totalDuration.toFixed(1)}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary/50">Relación de aspecto</span>
              <span className="text-sm font-semibold text-mint-precision">{aspectRatio || '9:16'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary/50">FPS</span>
              <span className="text-sm font-semibold text-text-primary">30</span>
            </div>
          </div>
        </div>

        {/* Scene list */}
        <div className="bg-surface-container border border-border-tech rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Escenas</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {spec.scenes.map((scene, idx) => {
              const isFocused = focusSceneIndex === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
                    isFocused
                      ? 'bg-mint-precision/10 border border-mint-precision/30'
                      : 'bg-surface-lowest/50'
                  }`}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                    isFocused
                      ? 'text-deep-slate bg-mint-precision'
                      : 'text-mint-precision bg-mint-precision/10'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-text-primary truncate">{scene.text}</p>
                    <p className="text-[10px] text-text-secondary/40">{scene.duration_seconds}s</p>
                  </div>
                  {isFocused && (
                    <Play size={12} className="text-mint-precision shrink-0 mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export Tab - Selective export (all or selected scenes) + format selection
// ---------------------------------------------------------------------------

type ExportMode = 'all' | 'selected';

interface ExportFormats {
  mp4: boolean;
  ae: boolean;
  spec: boolean;
}

interface ExportTabProps {
  spec: TimelineSpec | null;
  isReadyToRender: boolean;
  renderLoading: boolean;
  exportLoading: boolean;
  onRender: () => void;
  onAEExport: () => void;
  onSpecDownload: () => void;
}

function ExportTab({
  spec,
  isReadyToRender,
  renderLoading,
  exportLoading,
  onRender,
  onAEExport,
  onSpecDownload,
}: ExportTabProps) {
  const [exportMode, setExportMode] = useState<ExportMode>('all');
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(() => {
    // Default: all scenes selected
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

  /** Whether partial scene export is supported by the backend. */
  const backendSupportsPartialExport = false; // TODO: implement in backend

  const handleExport = () => {
    if (!anyFormatSelected) return;

    if (exportMode === 'all') {
      // Original behavior: trigger all selected formats for the full project
      if (exportFormats.mp4) onRender();
      if (exportFormats.ae) onAEExport();
      if (exportFormats.spec) onSpecDownload();
    } else {
      // Selected scenes mode
      if (backendSupportsPartialExport) {
        // TODO: pass selected scene indices to backend
        if (exportFormats.mp4) onRender();
        if (exportFormats.ae) onAEExport();
        if (exportFormats.spec) onSpecDownload();
      } else {
        // Fallback: export full project with a warning
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
        <div className="flex gap-3 mb-6">
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
                        {/* Checkbox */}
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-mint-precision border-mint-precision'
                            : 'border-border-tech bg-surface-high'
                        }`}>
                          {isSelected && <Check size={10} className="text-deep-slate" />}
                        </span>
                        {/* Scene label */}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
