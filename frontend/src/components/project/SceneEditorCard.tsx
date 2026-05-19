import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pencil, Check, X as XIcon, Loader2 } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';
import type { SceneSpec } from '../../types/job';
import { SceneDownloadMenu } from './SceneDownloadMenu';

interface SceneEditorCardProps {
  scene: SceneSpec;
  index: number;
  jobId: string;
  onRegenerate: (index: number, mediaQuery: string, text: string) => Promise<void>;
  onPreview: (index: number) => void;
  isSelected?: boolean;
  onToggleSelection?: (index: number) => void;
}

export function SceneEditorCard({ scene, index, jobId, onRegenerate, onPreview, isSelected, onToggleSelection }: SceneEditorCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editMedia, setEditMedia] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { addToast } = useToastStore();

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditText(scene.text);
    setEditMedia(scene.media_query);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText('');
    setEditMedia('');
  };

  const handleRegenerate = async () => {
    if (editText === scene.text && editMedia === scene.media_query) {
      handleCancelEdit();
      return;
    }
    setIsRegenerating(true);
    try {
      await onRegenerate(index, editMedia, editText);
      handleCancelEdit();
      addToast('success', 'Escena regenerada correctamente');
    } catch {
      addToast('error', 'Error al regenerar la escena. Intenta de nuevo.');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-xl border overflow-hidden transition-colors ${
        isEditing
          ? 'bg-surface-high border-mint-precision/40'
          : 'bg-surface-container border-border-tech'
      }`}
    >
      <div className="p-5">
        {/* Scene header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {onToggleSelection && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelection(index)}
                className="accent-mint-precision w-3.5 h-3.5 cursor-pointer"
              />
            )}
            <span className="text-xs font-bold text-mint-precision bg-mint-precision/10 px-2.5 py-1 rounded-full">
              Escena {index + 1}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary/50 font-mono">
              {scene.duration_seconds}s
            </span>
            <button
              onClick={() => onPreview(index)}
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
            <div className="flex gap-2">
              <button
                onClick={handleRegenerate}
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
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 text-xs font-medium text-text-secondary/60 hover:text-mint-precision transition-colors"
              >
                <Pencil size={12} />
                Editar escena
              </button>
              <SceneDownloadMenu jobId={jobId} sceneIndex={index} />
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
