import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  FileText,
  Loader2,
  CheckCircle2,
  Info,
  Mic,
  Pencil,
  Wand2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '../../store/useDashboardStore';
import { ProgressSteps } from '../../components/dashboard/ProgressSteps';

const ASPECT_RATIOS = [
  { value: '9:16', label: '9:16', description: 'Stories / Reels / TikTok' },
  { value: '4:5', label: '4:5', description: 'Instagram Feed' },
  { value: '1:1', label: '1:1', description: 'Cuadrado' },
  { value: '16:9', label: '16:9', description: 'YouTube / Landscape' },
];

export function NewProjectWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    wizardStep,
    wizardData,
    setWizardStep,
    setWizardData,
    resetWizard,
    generateScript,
    createJob,
    startPolling,
    selectedJob,
    voices,
    voicesLoading,
    settings,
    fetchVoices,
  } = useDashboardStore();

  const [scriptLoading, setScriptLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch voices on mount if not already loaded
  useEffect(() => {
    if (voices.length === 0) {
      fetchVoices();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefill from ScriptsPage "Usar en proyecto"
  useEffect(() => {
    const state = location.state as { prefillScript?: string; prefillAspectRatio?: string } | undefined;
    if (state?.prefillScript) {
      setWizardData({
        script: state.prefillScript,
        aspectRatio: state.prefillAspectRatio || settings.defaultAspectRatio || '9:16',
      });
      // Skip to step 2 since we already have a script
      setWizardStep(2);
      // Clear location state
      window.history.replaceState({}, '');
    }
  }, [location.state, setWizardData, setWizardStep, settings]);

  // -----------------------------------------------------------------------
  // Step 1: Info -> Script
  // -----------------------------------------------------------------------
  const handleGenerateScript = useCallback(async () => {
    if (!wizardData.info.trim()) {
      setError('Ingresa una descripción para tu proyecto.');
      return;
    }
    setError(null);
    setScriptLoading(true);
    try {
      const script = await generateScript(wizardData.info);
      setWizardData({ script });
      setWizardStep(2);
    } catch {
      setError('Error generando el guión. Intenta de nuevo.');
    } finally {
      setScriptLoading(false);
    }
  }, [wizardData.info, generateScript, setWizardData, setWizardStep]);

  // -----------------------------------------------------------------------
  // Step 2: Review -> Create
  // -----------------------------------------------------------------------
  const handleCreateProject = useCallback(async () => {
    if (!wizardData.script.trim()) {
      setError('El guión no puede estar vacío.');
      return;
    }
    setError(null);
    setCreateLoading(true);
    try {
      const jobId = await createJob(wizardData.script, wizardData.aspectRatio);
      setWizardData({ generatedJobId: jobId });
      setWizardStep(3);
      startPolling(jobId);
    } catch {
      setError('Error creando el proyecto. Intenta de nuevo.');
    } finally {
      setCreateLoading(false);
    }
  }, [
    wizardData.script,
    wizardData.aspectRatio,
    createJob,
    setWizardData,
    setWizardStep,
    startPolling,
  ]);

  // -----------------------------------------------------------------------
  // Step 3: Processing -> auto-advance when completed
  // -----------------------------------------------------------------------
  // The store handles polling. We check selectedJob status to auto-advance.
  if (wizardStep === 3 && selectedJob) {
    const status = selectedJob.status;
    if (status === 'completed' || status === 'completed_video') {
      setWizardStep(4);
    }
    if (status === 'failed' || status === 'failed_render') {
      // Stay on step 3 but show error
    }
  }

  // -----------------------------------------------------------------------
  // Reset on unmount
  // -----------------------------------------------------------------------
  // We don't reset on unmount to allow navigation back

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => {
          if (wizardStep > 1) {
            setWizardStep(wizardStep - 1);
          } else {
            navigate('/dashboard');
          }
        }}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">
          {wizardStep > 1 ? 'Paso anterior' : 'Volver a proyectos'}
        </span>
      </button>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step < wizardStep
                  ? 'bg-mint-precision text-deep-slate'
                  : step === wizardStep
                    ? 'bg-mint-precision/20 text-mint-precision border-2 border-mint-precision'
                    : 'bg-surface-high text-text-secondary/30'
              }`}
            >
              {step < wizardStep ? (
                <CheckCircle2 size={14} strokeWidth={3} />
              ) : (
                step
              )}
            </div>
            {step < 4 && (
              <div
                className={`flex-1 h-0.5 ${
                  step < wizardStep ? 'bg-mint-precision/40' : 'bg-surface-high'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 bg-error/10 border border-error/20 rounded-lg p-3 text-sm text-error"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {wizardStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Step1Info
              info={wizardData.info}
              aspectRatio={wizardData.aspectRatio}
              voiceId={wizardData.voiceId}
              voices={voices}
              voicesLoading={voicesLoading}
              onInfoChange={(info) => setWizardData({ info })}
              onAspectRatioChange={(aspectRatio) => setWizardData({ aspectRatio })}
              onVoiceChange={(voiceId) => setWizardData({ voiceId })}
              onGenerate={handleGenerateScript}
              loading={scriptLoading}
            />
          </motion.div>
        )}

        {wizardStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Step2Review
              script={wizardData.script}
              aspectRatio={wizardData.aspectRatio}
              onScriptChange={(script) => setWizardData({ script })}
              onCreate={handleCreateProject}
              loading={createLoading}
            />
          </motion.div>
        )}

        {wizardStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Step3Processing job={selectedJob} />
          </motion.div>
        )}

        {wizardStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Step4Done
              jobId={wizardData.generatedJobId}
              onViewProject={() => {
                if (wizardData.generatedJobId) {
                  navigate(`/dashboard/project/${wizardData.generatedJobId}`);
                  resetWizard();
                }
              }}
              onNewProject={() => {
                resetWizard();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Info -> Script (with toggle: "Tengo mi guión" vs "Generar con IA")
// ---------------------------------------------------------------------------

type WizardMode = 'own-script' | 'ai-generate';

function Step1Info({
  info,
  aspectRatio,
  voiceId,
  voices,
  voicesLoading,
  onInfoChange,
  onAspectRatioChange,
  onVoiceChange,
  onGenerate,
  loading,
}: {
  info: string;
  aspectRatio: string;
  voiceId: string | null;
  voices: { id: string; name: string; isDefault: boolean }[];
  voicesLoading: boolean;
  onInfoChange: (value: string) => void;
  onAspectRatioChange: (value: string) => void;
  onVoiceChange: (value: string) => void;
  onGenerate: () => void;
  loading: boolean;
}) {
  const [mode, setMode] = useState<WizardMode>('own-script');
  const { setWizardData, setWizardStep } = useDashboardStore();

  const handleContinueWithOwnScript = useCallback(() => {
    if (!info.trim()) return;
    setWizardData({ script: info });
    setWizardStep(2);
  }, [info, setWizardData, setWizardStep]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Crea tu proyecto
        </h2>
        <p className="text-text-secondary text-sm">
          Pega tu guión o genera uno con IA.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-surface-lowest border border-border-tech rounded-lg p-1">
        <button
          onClick={() => setMode('own-script')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            mode === 'own-script'
              ? 'bg-mint-precision/10 text-mint-precision border border-mint-precision/20'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Pencil size={16} />
          Tengo mi guión
        </button>
        <button
          onClick={() => setMode('ai-generate')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            mode === 'ai-generate'
              ? 'bg-mint-precision/10 text-mint-precision border border-mint-precision/20'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Wand2 size={16} />
          Generar con IA
        </button>
      </div>

      {/* Mode A: Own script */}
      {mode === 'own-script' && (
        <div className="space-y-5">
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Tu guión
            </label>
            <textarea
              value={info}
              onChange={(e) => onInfoChange(e.target.value)}
              placeholder="Pega o escribe tu guión aquí..."
              className="w-full h-48 bg-surface-lowest border border-border-tech rounded-lg p-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
            />
          </div>

          {/* Aspect ratio */}
          <AspectRatioSelector value={aspectRatio} onChange={onAspectRatioChange} />

          {/* Continue button */}
          <button
            onClick={handleContinueWithOwnScript}
            disabled={!info.trim()}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
              info.trim()
                ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
                : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
            }`}
          >
            <ArrowRight size={16} />
            Continuar
          </button>
        </div>
      )}

      {/* Mode B: AI generate */}
      {mode === 'ai-generate' && (
        <div className="space-y-5">
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Describe tu proyecto
            </label>
            <textarea
              value={info}
              onChange={(e) => onInfoChange(e.target.value)}
              placeholder="Ej: Un video promocional para mi tienda de ropa, enfocado en la colección de verano..."
              className="w-full h-32 bg-surface-lowest border border-border-tech rounded-lg p-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
            />
          </div>

          {/* Voice selector */}
          <VoiceSelector
            voiceId={voiceId}
            voices={voices}
            voicesLoading={voicesLoading}
            onChange={onVoiceChange}
          />

          {/* Aspect ratio */}
          <AspectRatioSelector value={aspectRatio} onChange={onAspectRatioChange} />

          {/* Generate button */}
          <button
            onClick={onGenerate}
            disabled={loading || !info.trim()}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
              info.trim() && !loading
                ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
                : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generando guión...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generar Guión con IA
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aspect Ratio Selector (extracted for reuse)
// ---------------------------------------------------------------------------

function AspectRatioSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-text-secondary text-sm font-medium mb-3">
        Relación de aspecto
      </label>
      <div className="grid grid-cols-2 gap-3">
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio.value}
            onClick={() => onChange(ratio.value)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              value === ratio.value
                ? 'border-mint-precision bg-mint-precision/5'
                : 'border-border-tech bg-surface-container hover:border-outline-variant'
            }`}
          >
            <span
              className={`text-sm font-semibold ${
                value === ratio.value
                  ? 'text-mint-precision'
                  : 'text-text-primary'
              }`}
            >
              {ratio.label}
            </span>
            <p className="text-xs text-text-secondary/50 mt-1">
              {ratio.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Voice Selector (extracted for reuse)
// ---------------------------------------------------------------------------

function VoiceSelector({
  voiceId,
  voices,
  voicesLoading,
  onChange,
}: {
  voiceId: string | null;
  voices: { id: string; name: string; isDefault: boolean }[];
  voicesLoading: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-text-secondary text-sm font-medium mb-2">
        <Mic size={14} className="inline mr-1.5 -mt-0.5" />
        Voz para narración
      </label>
      <select
        value={voiceId || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={voicesLoading}
        className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {voicesLoading ? (
          <option value="">Cargando voces...</option>
        ) : voices.length === 0 ? (
          <option value="">No hay voces disponibles</option>
        ) : (
          voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.isDefault ? ' (Default)' : ''}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Review -> Create
// ---------------------------------------------------------------------------

function Step2Review({
  script,
  aspectRatio,
  onScriptChange,
  onCreate,
  loading,
}: {
  script: string;
  aspectRatio: string;
  onScriptChange: (value: string) => void;
  onCreate: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Revisa el guión
        </h2>
        <p className="text-text-secondary text-sm">
          Puedes editar el texto antes de crear el proyecto.
        </p>
      </div>

      <div className="bg-surface-container border border-border-tech rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-mint-precision" />
          <span className="text-sm font-semibold text-text-primary">Guión generado</span>
        </div>
        <textarea
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          className="w-full h-48 bg-surface-lowest border border-border-tech rounded-lg p-4 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
        />
      </div>

      <div className="bg-surface-container border border-border-tech rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-text-secondary/50 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-text-secondary">
              El guión se dividirá automáticamente en segmentos de ~7 segundos.
              Cada segmento generará su propia escena con visuales y audio.
            </p>
            <p className="text-xs text-text-secondary/40 mt-2">
              Relación de aspecto seleccionada: <span className="text-mint-precision">{aspectRatio}</span>
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onCreate}
        disabled={loading || !script.trim()}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
          script.trim() && !loading
            ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
            : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creando proyecto...
          </>
        ) : (
          <>
            <ArrowRight size={16} />
            Crear Proyecto
          </>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Processing
// ---------------------------------------------------------------------------

function Step3Processing({ job }: { job: { status: string } | null }) {
  const isFailed = job?.status === 'failed' || job?.status === 'failed_render';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Procesando tu proyecto
        </h2>
        <p className="text-text-secondary text-sm">
          La IA está generando las escenas. Esto puede tomar unos minutos.
        </p>
      </div>

      <div className="bg-surface-container border border-border-tech rounded-xl p-6">
        {job ? (
          <ProgressSteps status={job.status} />
        ) : (
          <div className="flex items-center gap-3 text-text-secondary">
            <Loader2 size={20} className="animate-spin" />
            <span>Conectando con el servidor...</span>
          </div>
        )}
      </div>

      {isFailed && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-center">
          <p className="text-error font-semibold">El procesamiento falló</p>
          <p className="text-text-secondary text-sm mt-1">
            Intenta crear un nuevo proyecto con un guión diferente.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Done
// ---------------------------------------------------------------------------

function Step4Done({
  jobId,
  onViewProject,
  onNewProject,
}: {
  jobId: string | null;
  onViewProject: () => void;
  onNewProject: () => void;
}) {
  return (
    <div className="space-y-6 text-center py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full bg-mint-precision/10 border-2 border-mint-precision flex items-center justify-center mx-auto"
      >
        <CheckCircle2 size={40} className="text-mint-precision" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-display font-bold text-text-primary mb-2">
          ¡Proyecto completado!
        </h2>
        <p className="text-text-secondary text-sm max-w-md mx-auto">
          Tu video ha sido generado exitosamente. Puedes verlo, editarlo o exportarlo.
        </p>
      </div>

      {jobId && (
        <p className="text-xs text-text-secondary/40 font-mono">
          ID: {jobId}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <button
          onClick={onViewProject}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-mint-precision text-deep-slate rounded-lg text-sm font-bold hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,171,0.2)]"
        >
          Ver Proyecto
        </button>
        <button
          onClick={onNewProject}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-surface-highest text-text-primary rounded-lg text-sm font-semibold hover:bg-surface-high transition-colors"
        >
          Crear otro proyecto
        </button>
      </div>
    </div>
  );
}
