import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Plus, Loader2, Upload, X, AlertCircle, Mic, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardStore } from '../../store/useDashboardStore';
import { VoiceRow } from '../../components/dashboard/VoiceCard';
import { VoiceInspector } from '../../components/dashboard/VoiceInspector';
import { Modal } from '../../components/dashboard/Modal';
import type { Voice } from '../../types/job';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function VoicesPage() {
  const {
    voices,
    voicesLoading,
    fetchVoices,
    createVoice,
    deleteVoice,
    updateVoice,
    uploadVoiceSample,
    previewVoice,
  } = useDashboardStore();

  const [search, setSearch] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New voice modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<'male' | 'female' | 'neutral'>('female');
  const [newLanguage, setNewLanguage] = useState('ES');
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [createdVoiceId, setCreatedVoiceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch voices on mount
  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
    };
  }, []);

  // Filter voices by search
  const filteredVoices = useMemo(() => {
    if (!search.trim()) return voices;
    const q = search.toLowerCase();
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.language.toLowerCase().includes(q),
    );
  }, [voices, search]);

  // Auto-select first voice if none selected
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedVoiceId && filteredVoices.length > 0) {
      setSelectedVoiceId(filteredVoices[0].id);
    }
    // Clear selection if selected voice was deleted
    if (selectedVoiceId && !filteredVoices.find((v) => v.id === selectedVoiceId)) {
      setSelectedVoiceId(filteredVoices.length > 0 ? filteredVoices[0].id : null);
    }
  }, [filteredVoices, selectedVoiceId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedVoice = useMemo(
    () => voices.find((v) => v.id === selectedVoiceId) ?? null,
    [voices, selectedVoiceId],
  );

  const validateFile = useCallback((file: File): string | null => {
    if (!file.type.startsWith('audio/')) {
      return 'Solo se permiten archivos de audio (MP3, WAV, M4A, etc.)';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE_MB}MB`;
    }
    return null;
  }, []);

  const handlePreview = useCallback(
    async (voice: Voice) => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }

      if (previewingId === voice.id) {
        setPreviewingId(null);
        return;
      }

      setPreviewingId(voice.id);
      setError(null);

      try {
        const { audio_url } = await previewVoice(voice.id, 'Hola, esta es una prueba de voz.');
        const audio = new Audio(audio_url);
        previewAudioRef.current = audio;

        audio.onended = () => {
          setPreviewingId(null);
          previewAudioRef.current = null;
        };

        audio.onerror = () => {
          setError('No se pudo reproducir la vista previa.');
          setPreviewingId(null);
          previewAudioRef.current = null;
        };

        await audio.play();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al generar la vista previa.');
        setPreviewingId(null);
      }
    },
    [previewingId, previewVoice],
  );

  const handleDelete = useCallback(
    async (voiceId: string) => {
      setError(null);
      try {
        await deleteVoice(voiceId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar la voz.');
      }
    },
    [deleteVoice],
  );

  const handleUpdate = useCallback(
    async (id: string, data: { name: string; gender: string; language: string }) => {
      return updateVoice(id, data);
    },
    [updateVoice],
  );

  const handleOpenModal = () => {
    setNewName('');
    setNewGender('female');
    setNewLanguage('ES');
    setNewIsDefault(false);
    setAudioFile(null);
    setFileError(null);
    setCreatedVoiceId(null);
    setError(null);
    setModalOpen(true);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        const validationError = validateFile(file);
        if (validationError) {
          setFileError(validationError);
          setAudioFile(null);
        } else {
          setFileError(null);
          setAudioFile(file);
        }
      }
    },
    [validateFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const validationError = validateFile(file);
        if (validationError) {
          setFileError(validationError);
          setAudioFile(null);
        } else {
          setFileError(null);
          setAudioFile(file);
        }
      }
    },
    [validateFile],
  );

  const handleCreateVoice = async () => {
    if (!newName.trim()) return;

    setCreating(true);
    setError(null);
    setFileError(null);

    try {
      const created = await createVoice({
        name: newName.trim(),
        gender: newGender,
        language: newLanguage,
        is_default: newIsDefault,
      });

      setCreatedVoiceId(created.id);

      if (audioFile) {
        setUploading(true);
        await uploadVoiceSample(created.id, audioFile);
        setUploading(false);
      }

      setModalOpen(false);
      setNewName('');
      setAudioFile(null);
      setCreatedVoiceId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la voz.');
    } finally {
      setCreating(false);
      setUploading(false);
    }
  };

  const isLoading = creating || uploading;

  return (
    <div className="p-6 lg:p-8 h-full">
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 bg-error/10 border border-error/20 rounded-lg p-3 flex items-center gap-2 text-sm text-error"
          >
            <AlertCircle size={16} />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-error/60 hover:text-error"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
          <Mic size={24} className="text-mint-precision" />
          <span>Mis Voces</span>
        </h1>
        <div className="flex-1" />
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-56">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-surface-lowest border border-border-tech rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
            />
          </div>
          {/* New voice button */}
          <button
            onClick={handleOpenModal}
            disabled={voicesLoading}
            className="flex items-center gap-2 px-4 py-2 bg-mint-precision text-deep-slate rounded-lg text-sm font-semibold hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-[0_0_12px_rgba(0,255,171,0.15)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nueva</span>
          </button>
        </div>
      </div>

      {/* Main content: Table + Inspector */}
      {voicesLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-mint-precision" />
          <span className="ml-3 text-text-secondary text-sm">Cargando voces...</span>
        </div>
      ) : voices.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-surface-container border border-border-tech flex items-center justify-center mb-6">
            <Mic size={36} className="text-text-secondary/30" />
          </div>
          <h2 className="text-xl font-display font-bold text-text-primary mb-2">
            No tienes voces aún
          </h2>
          <p className="text-text-secondary text-sm max-w-sm mb-6">
            Crea tu primera voz para comenzar a generar videos con narración personalizada.
          </p>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-mint-precision text-deep-slate rounded-lg text-sm font-semibold hover:bg-white transition-all shadow-[0_0_12px_rgba(0,255,171,0.15)]"
          >
            <Plus size={16} />
            Crear primera voz
          </button>
        </motion.div>
      ) : (
        <div className="flex gap-0 -mx-6 lg:-mx-8 overflow-hidden">
          {/* Left: Table */}
          <div className="flex-1 min-w-0">
            <div className="bg-surface-container border border-border-tech rounded-xl overflow-hidden">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-border-tech/50">
                    <th className="w-[55%] text-left py-3 px-4 text-[11px] font-semibold text-text-secondary/50 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="w-[20%] text-left py-3 px-4 text-[11px] font-semibold text-text-secondary/50 uppercase tracking-wider">
                      Idioma
                    </th>
                    <th className="w-[25%] text-left py-3 px-4 text-[11px] font-semibold text-text-secondary/50 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-tech/30">
                  <AnimatePresence>
                    {filteredVoices.map((voice) => (
                      <VoiceRow
                        key={voice.id}
                        voice={voice}
                        isSelected={selectedVoiceId === voice.id}
                        onSelect={() => setSelectedVoiceId(voice.id)}
                        onPreview={handlePreview}
                        onDelete={voice.isDefault ? undefined : handleDelete}
                        isPreviewing={previewingId === voice.id}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>

              {/* No results */}
              {filteredVoices.length === 0 && search && (
                <div className="py-12 text-center">
                  <Search size={24} className="mx-auto text-text-secondary/30 mb-3" />
                  <p className="text-text-secondary text-sm">
                    No se encontraron voces con &ldquo;{search}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Inspector */}
          <AnimatePresence>
            {selectedVoice && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:block shrink-0 ml-4"
              >
                <div className="w-80 bg-surface-container border border-border-tech rounded-xl overflow-hidden h-[500px]">
                  <VoiceInspector
                    voice={selectedVoice}
                    onClose={() => setSelectedVoiceId(null)}
                    onDelete={handleDelete}
                    onPreview={handlePreview}
                    onUpdate={handleUpdate}
                    isPreviewing={previewingId === selectedVoice.id}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* New Voice Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Voz" size="md">
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Nombre de la voz
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Mi Voz Clonada"
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Género
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['male', 'female', 'neutral'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setNewGender(g)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    newGender === g
                      ? 'border-mint-precision bg-mint-precision/10 text-mint-precision'
                      : 'border-border-tech bg-surface-container text-text-secondary hover:border-outline-variant'
                  }`}
                >
                  {g === 'male' ? 'Masculino' : g === 'female' ? 'Femenino' : 'Neutral'}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Idioma
            </label>
            <select
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors appearance-none"
            >
              <option value="ES">Español</option>
              <option value="EN">English</option>
              <option value="PT">Português</option>
            </select>
          </div>

          {/* Set as default toggle */}
          <div className="flex items-center justify-between">
            <label className="text-text-secondary text-sm font-medium">
              Establecer como voz por defecto
            </label>
            <button
              onClick={() => setNewIsDefault(!newIsDefault)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                newIsDefault ? 'bg-mint-precision' : 'bg-surface-high'
              }`}
              role="switch"
              aria-checked={newIsDefault}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  newIsDefault ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Audio upload */}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Audio de muestra (30s - 5min) — opcional
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-mint-precision bg-mint-precision/5'
                  : audioFile
                    ? 'border-mint-precision/40 bg-mint-precision/5'
                    : 'border-border-tech hover:border-outline-variant'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {audioFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Upload size={18} className="text-mint-precision" />
                  <span className="text-sm text-mint-precision font-medium">
                    {audioFile.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAudioFile(null);
                      setFileError(null);
                    }}
                    className="p-1 rounded hover:bg-surface-high transition-colors"
                  >
                    <X size={14} className="text-text-secondary" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} className="text-text-secondary/30" />
                  <span className="text-sm text-text-secondary/50">
                    Arrastra un archivo de audio o haz clic para seleccionar
                  </span>
                  <span className="text-xs text-text-secondary/30">
                    MP3, WAV, M4A · 30 segundos a 5 minutos · Máx {MAX_FILE_SIZE_MB}MB
                  </span>
                </div>
              )}
            </div>
            {fileError && (
              <p className="mt-2 text-xs text-error flex items-center gap-1">
                <AlertCircle size={12} />
                {fileError}
              </p>
            )}
          </div>

          {/* Created voice status */}
          {createdVoiceId && (
            <div className="bg-mint-precision/10 border border-mint-precision/20 rounded-lg p-3 text-sm text-mint-precision">
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Subiendo audio de muestra...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  ✓ Voz creada exitosamente
                </span>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleCreateVoice}
            disabled={!newName.trim() || isLoading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
              newName.trim() && !isLoading
                ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
                : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {uploading ? 'Subiendo audio...' : 'Creando voz...'}
              </>
            ) : (
              <>
                <Plus size={16} />
                Crear Voz
              </>
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
