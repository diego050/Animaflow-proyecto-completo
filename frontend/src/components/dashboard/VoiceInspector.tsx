import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, Play, Pause, Trash2, Edit2, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Voice } from '../../types/job';

interface VoiceInspectorProps {
  voice: Voice;
  onClose: () => void;
  onDelete: (voiceId: string) => void;
  onPreview: (voice: Voice) => void;
  onUpdate: (id: string, data: { name: string; gender: string; language: string }) => Promise<Voice>;
  isPreviewing: boolean;
}

export function VoiceInspector({
  voice,
  onClose,
  onDelete,
  onPreview,
  onUpdate,
  isPreviewing,
}: VoiceInspectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(voice.name);
  const [editGender, setEditGender] = useState<'male' | 'female' | 'neutral'>(voice.gender);
  const [editLanguage, setEditLanguage] = useState(voice.language);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Reset form when voice changes
  useEffect(() => {
    setEditName(voice.name);
    setEditGender(voice.gender);
    setEditLanguage(voice.language);
    setIsEditing(false);
    setError(null);
    setShowDeleteConfirm(false);
  }, [voice]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const handleSave = useCallback(async () => {
    if (!editName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onUpdate(voice.id, {
        name: editName.trim(),
        gender: editGender,
        language: editLanguage,
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la voz.');
    } finally {
      setSaving(false);
    }
  }, [voice.id, editName, editGender, editLanguage, onUpdate]);

  const handleCancel = () => {
    setEditName(voice.name);
    setEditGender(voice.gender);
    setEditLanguage(voice.language);
    setIsEditing(false);
    setError(null);
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(voice.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const GENDER_LABELS: Record<string, string> = {
    male: 'Masculino',
    female: 'Femenino',
    neutral: 'Neutral',
  };

  const LANGUAGE_LABELS: Record<string, string> = {
    ES: 'Español',
    EN: 'English',
    PT: 'Português',
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-tech/50">
        <h3 className="text-sm font-semibold text-text-primary">Inspector de Voz</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-surface-high transition-colors"
          aria-label="Cerrar inspector"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center pt-6 pb-4 px-5">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
              voice.isDefault
                ? 'bg-mint-precision/15 text-mint-precision'
                : 'bg-surface-high text-text-secondary/50'
            }`}
          >
            <Mic size={28} />
          </div>
          <h2 className="text-base font-semibold text-text-primary">{voice.name}</h2>
          {voice.isDefault && (
            <span className="text-[10px] font-bold text-mint-precision bg-mint-precision/10 px-2 py-0.5 rounded-full mt-1">
              Voz por defecto
            </span>
          )}
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mx-5 mb-4 bg-error/10 border border-error/20 rounded-lg p-2.5 flex items-center gap-2 text-xs text-error"
            >
              <AlertCircle size={14} />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-error/60 hover:text-error">
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Details / Edit Form */}
        <div className="px-5 space-y-4">
          {isEditing ? (
            <>
              {/* Edit mode */}
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary/50 uppercase tracking-wider mb-1.5">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-surface-lowest border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary/50 uppercase tracking-wider mb-1.5">
                  Género
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['male', 'female', 'neutral'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setEditGender(g)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        editGender === g
                          ? 'border-mint-precision bg-mint-precision/10 text-mint-precision'
                          : 'border-border-tech bg-surface-container text-text-secondary hover:border-outline-variant'
                      }`}
                    >
                      {GENDER_LABELS[g]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary/50 uppercase tracking-wider mb-1.5">
                  Idioma
                </label>
                <select
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value)}
                  className="w-full bg-surface-lowest border border-border-tech rounded-lg px-3 py-2 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors appearance-none"
                >
                  {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!editName.trim() || saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-mint-precision text-deep-slate hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-text-secondary/60 hover:text-text-primary hover:bg-surface-high transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              {/* View mode */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary/50">Género</span>
                  <span className="text-xs font-medium text-text-primary">
                    {GENDER_LABELS[voice.gender] || voice.gender}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary/50">Idioma</span>
                  <span className="text-xs font-mono text-text-primary bg-surface-high px-2 py-0.5 rounded">
                    {LANGUAGE_LABELS[voice.language] || voice.language}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary/50">Creada</span>
                  <span className="text-xs text-text-primary">{formatDate(voice.createdAt)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-3 border-t border-border-tech/30">
                <button
                  onClick={() => onPreview(voice)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isPreviewing
                      ? 'bg-mint-precision/15 text-mint-precision'
                      : 'bg-surface-high text-text-secondary hover:text-text-primary hover:bg-surface-highest'
                  }`}
                >
                  {isPreviewing ? (
                    <>
                      <Pause size={14} />
                      Reproduciendo...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Preview
                    </>
                  )}
                </button>
                {!voice.isDefault && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-surface-high transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>

              {/* Delete (non-default only) */}
              {!voice.isDefault && (
                <div className="pt-2">
                  <AnimatePresence>
                    {showDeleteConfirm ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-error/10 border border-error/20 rounded-lg p-3"
                      >
                        <p className="text-xs text-error/80 mb-2">
                          ¿Eliminar &ldquo;{voice.name}&rdquo;?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDelete}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-error/20 text-error hover:bg-error/30 transition-colors"
                          >
                            <Trash2 size={12} />
                            Eliminar
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary/60 hover:text-text-primary transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-error/60 hover:text-error hover:bg-error/10 transition-colors"
                      >
                        <Trash2 size={14} />
                        Eliminar voz
                      </button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Reciente';
  }
}
