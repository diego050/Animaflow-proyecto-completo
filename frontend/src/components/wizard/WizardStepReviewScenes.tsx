import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Clock, Play, CheckCircle2, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import type { SceneData } from '../../types/job';

export interface WizardStepReviewScenesProps {
  scenes: SceneData[];
  onApprove: (scenes: SceneData[]) => void;
  loading?: boolean;
}

export function WizardStepReviewScenes({
  scenes,
  onApprove,
  loading = false,
}: WizardStepReviewScenesProps) {
  const [editedScenes, setEditedScenes] = useState<SceneData[]>(scenes);
  const [openPrompt, setOpenPrompt] = useState<Set<number>>(new Set());

  const togglePrompt = (index: number) =>
    setOpenPrompt((prev) => {
      const ns = new Set(prev);
      if (ns.has(index)) ns.delete(index);
      else ns.add(index);
      return ns;
    });

  const handleMediaQueryChange = (index: number, value: string) => {
    setEditedScenes((prev) =>
      prev.map((scene, i) => (i === index ? { ...scene, media_query: value } : scene)),
    );
  };

  const handleTextChange = (index: number, value: string) => {
    setEditedScenes((prev) =>
      prev.map((scene, i) => (i === index ? { ...scene, text: value } : scene)),
    );
  };

  const totalDuration = editedScenes.reduce(
    (sum, scene) => sum + scene.duration_seconds,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Revisar escenas generadas
        </h2>
        <p className="text-text-secondary text-sm">
          Revisa y ajusta los prompts visuales de cada escena antes de continuar con la generación del video.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-text-secondary bg-surface-container border border-border-tech rounded-lg p-3">
        <div className="flex items-center gap-1.5">
          <Film size={16} className="text-mint-precision" />
          <span>{editedScenes.length} escenas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={16} className="text-mint-precision" />
          <span>{totalDuration.toFixed(1)}s total</span>
        </div>
      </div>

      {/* Scenes list */}
      <div className="space-y-4">
        {editedScenes.map((scene, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-surface-container border border-border-tech rounded-xl p-4 space-y-3"
          >
            {/* Scene header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-mint-precision/10 border border-mint-precision/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-mint-precision">
                    {index + 1}
                  </span>
                </div>
                <span className="text-xs font-medium text-text-secondary">
                  {scene.start_time_seconds.toFixed(1)}s -{' '}
                  {(scene.start_time_seconds + scene.duration_seconds).toFixed(1)}s
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-text-secondary/60">
                <Play size={12} />
                <span>{scene.duration_seconds.toFixed(1)}s</span>
              </div>
            </div>

            {/* Text (editable) */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Texto de la escena
              </label>
              <textarea
                value={scene.text}
                onChange={(e) => handleTextChange(index, e.target.value)}
                rows={2}
                className="w-full bg-surface-highest border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-mint-precision/50 resize-none"
              />
            </div>

            {/* Media query / prompt (editable, plegable para no alargar la lista) */}
            <div>
              <button
                type="button"
                onClick={() => togglePrompt(index)}
                className="flex items-center gap-1 text-xs font-medium text-text-secondary uppercase tracking-wide hover:text-text-primary transition-colors"
              >
                <Sparkles size={12} className="text-mint-precision" />
                Prompt visual
                <motion.div animate={{ rotate: openPrompt.has(index) ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={13} />
                </motion.div>
              </button>
              <AnimatePresence>
                {openPrompt.has(index) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      value={scene.media_query}
                      onChange={(e) => handleMediaQueryChange(index, e.target.value)}
                      rows={2}
                      className="w-full mt-1.5 bg-surface-highest border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-1 focus:ring-mint-precision/50 resize-none"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={() => onApprove(editedScenes)}
          disabled={loading || editedScenes.length === 0}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-mint-precision text-deep-slate rounded-lg text-sm font-bold hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,171,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Aprobando...
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              Aprobar y continuar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
