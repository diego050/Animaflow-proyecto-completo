import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pencil, Check, X as XIcon, Loader2, Split, Merge, ArrowRight, Clock, Sparkles, Music, Download, Wand2, RefreshCw } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';
import { useJobsStore } from '../../store/useJobsStore';
import type { Spec as SceneSpec } from '../../types/spec';
import { SceneDownloadMenu } from './SceneDownloadMenu';

interface SceneEditorCardProps {
  scene: SceneSpec;
  index: number;
  totalScenes: number;
  jobId: string;
  onRegenerate: (index: number, mediaQuery: string, text: string) => Promise<void>;
  onPreview: (index: number) => void;
  isSelected?: boolean;
  onToggleSelection?: (index: number) => void;
  isSegmented?: boolean;
  onSplitScene?: (index: number) => void;
  onMergeScene?: (index: number) => void;
  onSegmentedChange?: (index: number, field: 'text' | 'media_query', value: string) => void;
}

export function SceneEditorCard({
  scene,
  index,
  totalScenes,
  jobId,
  onRegenerate,
  onPreview,
  isSelected,
  onToggleSelection,
  isSegmented = false,
  onSplitScene,
  onMergeScene,
  onSegmentedChange,
}: SceneEditorCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editMedia, setEditMedia] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [codeInstruction, setCodeInstruction] = useState('');
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const { addToast } = useToastStore();
  const codeBusy = isEditingCode || isRegeneratingCode;

  const handleEditCode = async () => {
    const instruction = codeInstruction.trim();
    if (!instruction) return;
    setIsEditingCode(true);
    try {
      await useJobsStore.getState().editSceneCode(jobId, index, instruction);
      setCodeInstruction('');
      addToast('success', 'Animación actualizada');
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'No se pudo aplicar el cambio');
    } finally {
      setIsEditingCode(false);
    }
  };

  const handleRegenerateCode = async () => {
    setIsRegeneratingCode(true);
    try {
      await useJobsStore.getState().regenerateSceneCode(jobId, index);
      addToast('success', 'Nueva versión generada');
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'No se pudo regenerar');
    } finally {
      setIsRegeneratingCode(false);
    }
  };

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

  const handleSplit = () => {
    if (onSplitScene) {
      onSplitScene(index);
    }
  };

  const handleMerge = () => {
    if (onMergeScene) {
      onMergeScene(index);
    }
  };

  // --- Segmented mode: inline editable storyboard ---
  if (isSegmented) {
    const durationDisplay = scene.estimated_duration
      ? `${scene.estimated_duration}s (est.)`
      : `${scene.duration_seconds}s`;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        whileHover={{ boxShadow: '0 4px 20px rgba(0, 255, 171, 0.05)' }}
        className="rounded-xl border border-l-[3px] border-l-cadmium-orange/40 border-border-tech bg-surface-container overflow-hidden"
      >
        <div className="p-5">
          {/* Scene header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              {onToggleSelection && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelection(index)}
                  className="accent-mint-precision w-3.5 h-3.5 cursor-pointer"
                />
              )}
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-mint-precision/10 text-xs font-bold text-mint-precision">
                {index + 1}
              </span>
              <span className="text-xs font-semibold text-text-primary">
                Escena {index + 1}
              </span>
              <span className="bg-cadmium-orange/10 text-cadmium-orange/80 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                Borrador
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs text-text-secondary/50 font-mono">
              <Clock size={12} />
              {durationDisplay}
            </span>
          </div>

          {/* Editable text */}
          <div className="mb-3">
            <label className="block text-[10px] uppercase tracking-wider text-text-secondary/40 mb-1.5 font-semibold">
              Texto a Mostrar y Narrar (TTS)
            </label>
            <textarea
              value={scene.text}
              onChange={(e) => onSegmentedChange?.(index, 'text', e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors resize-none"
              rows={3}
              placeholder="Texto de la escena..."
            />
          </div>

          {/* Editable media_query */}
          <div className="mb-4">
            <label className="block text-[10px] uppercase tracking-wider text-text-secondary/40 mb-1.5 font-semibold flex items-center gap-1">
              <Sparkles size={12} className="text-mint-precision/60" />
              Prompt Visual (Motor Generativo)
            </label>
            <textarea
              value={scene.media_query}
              onChange={(e) => onSegmentedChange?.(index, 'media_query', e.target.value)}
              className="w-full bg-surface-lowest border border-mint-precision/30 rounded-lg px-3 py-2.5 text-sm text-mint-precision/90 font-mono placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors resize-none"
              rows={4}
              placeholder="Describe los elementos visuales..."
            />
          </div>

          {/* Split / Merge actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSplit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-text-secondary/70 hover:text-mint-precision hover:bg-mint-precision/10 border border-border-tech/50 hover:border-mint-precision/30 transition-colors"
              title="Dividir esta escena en dos"
            >
              <Split size={12} />
              Dividir
            </button>
            {index < totalScenes - 1 && (
              <button
                onClick={handleMerge}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-text-secondary/70 hover:text-mint-precision hover:bg-mint-precision/10 border border-border-tech/50 hover:border-mint-precision/30 transition-colors"
                title={`Fusionar con Escena ${index + 2}`}
              >
                <Merge size={12} />
                Fusionar
                <ArrowRight size={10} className="opacity-50" />
                <span className="opacity-50">{index + 2}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // --- Completed mode: existing read-only + edit flow ---
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ boxShadow: '0 4px 20px rgba(0, 255, 171, 0.05)' }}
      className={`rounded-xl border overflow-hidden transition-colors ${
        isEditing
          ? 'bg-surface-high border-mint-precision/40'
          : 'bg-surface-container border-border-tech'
      }`}
    >
      <div className="p-5">
        {/* Scene header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {onToggleSelection && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelection(index)}
                className="accent-mint-precision w-3.5 h-3.5 cursor-pointer"
              />
            )}
            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-mint-precision/10 text-xs font-bold text-mint-precision">
              {index + 1}
            </span>
            <span className="text-xs font-semibold text-text-primary">
              Escena {index + 1}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-text-secondary/50 font-mono">
              <Clock size={12} />
              {scene.duration_seconds}s
            </span>
            <button
              onClick={() => onPreview(index)}
              className="p-2 rounded-lg bg-surface-high text-text-secondary/50 hover:bg-mint-precision/10 hover:text-mint-precision transition-colors"
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
              <label className="block text-[10px] uppercase tracking-wider text-text-secondary/40 mb-1.5 font-semibold">
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
              <label className="block text-[10px] uppercase tracking-wider text-text-secondary/40 mb-1.5 font-semibold flex items-center gap-1">
                <Sparkles size={12} className="text-mint-precision/60" />
                Prompt Visual (Motor Generativo)
              </label>
              <textarea
                value={editMedia}
                onChange={(e) => setEditMedia(e.target.value)}
                className="w-full bg-surface-container border border-mint-precision/20 rounded-lg px-3 py-2.5 text-sm text-mint-precision/90 font-mono placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors resize-none"
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
            {/* Scene text with styled quote */}
            <div className="border-l-2 border-l-mint-precision/30 pl-3 mb-4">
              <p className="text-sm leading-relaxed text-text-primary line-clamp-3 cursor-pointer hover:text-mint-precision/80 transition-colors" title="Click para expandir">
                &ldquo;{scene.text}&rdquo;
              </p>
            </div>

            {/* Media Query as "Prompt Visual" */}
            <div className="bg-surface-lowest rounded-lg p-3 border border-border-tech/50 mb-3">
              <p className="text-[10px] uppercase tracking-wider text-text-secondary/40 mb-1.5 font-semibold flex items-center gap-1">
                <Sparkles size={12} className="text-mint-precision/60" />
                Prompt Visual
              </p>
              <p className="text-mint-precision/80 font-mono text-xs break-words">
                {scene.media_query}
              </p>
            </div>

            {/* Edición code-gen: cambiar la animación con una instrucción. NO renderiza
                mp4 (el preview se recompila en vivo; el render es on-demand). */}
            {scene.custom_code && (
              <div className="bg-surface-lowest rounded-lg p-3 border border-mint-precision/20 mb-3">
                <p className="text-[10px] uppercase tracking-wider text-text-secondary/40 mb-1.5 font-semibold flex items-center gap-1">
                  <Wand2 size={12} className="text-mint-precision/60" />
                  Cambiar esta animación
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codeInstruction}
                    onChange={(e) => setCodeInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !codeBusy) handleEditCode();
                    }}
                    placeholder="ej: haz el corazón más grande y morado"
                    disabled={codeBusy}
                    className="flex-1 bg-surface-container border border-border-tech rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision outline-none transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={handleEditCode}
                    disabled={codeBusy || !codeInstruction.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-mint-precision text-deep-slate hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEditingCode ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    {isEditingCode ? 'Aplicando…' : 'Aplicar'}
                  </button>
                </div>
                <button
                  onClick={handleRegenerateCode}
                  disabled={codeBusy}
                  className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-text-secondary/60 hover:text-mint-precision transition-colors disabled:opacity-50"
                  title="Generar una versión distinta de esta animación"
                >
                  {isRegeneratingCode ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <RefreshCw size={11} />
                  )}
                  {isRegeneratingCode ? 'Generando…' : 'Hazlo distinto'}
                </button>
              </div>
            )}

            {/* SFX Cues */}
            {scene.sfx && scene.sfx.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-wider text-text-secondary/40 mb-2 font-semibold flex items-center gap-1">
                  <Music size={12} className="text-text-secondary/30" />
                  Efectos de Sonido
                </p>
                <div className="flex flex-wrap gap-2">
                  {scene.sfx.map((sfx, sIdx) => (
                    <span
                      key={sIdx}
                      className="flex items-center gap-1 bg-surface-high text-text-secondary/70 px-2.5 py-1 rounded-full text-[11px]"
                    >
                      <Music size={10} className="text-text-secondary/40" />
                      {sfx.keyword} @ {sfx.time_in_seconds}s
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border-tech/30">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 text-xs font-medium text-text-secondary/60 hover:text-mint-precision transition-colors"
                >
                  <Pencil size={12} />
                  Editar
                </button>
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 text-xs font-medium text-text-secondary/60 hover:text-cadmium-orange transition-colors"
                >
                  <Loader2 size={12} />
                  Regenerar
                </button>
              </div>
              <SceneDownloadMenu jobId={jobId} sceneIndex={index} />
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
