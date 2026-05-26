import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobsStore } from '../../store/useJobsStore';
import { useMediaStore } from '../../store/useMediaStore';
import { ScriptCard } from '../../components/dashboard/ScriptCard';
import { Modal } from '../../components/dashboard/Modal';
import type { Script } from '../../types/job';

export function ScriptsPage() {
  const navigate = useNavigate();
  const { scripts, scriptsLoading, fetchScripts, addScript, updateScript, deleteScript } =
    useMediaStore();
  const { fetchJobs, jobs } = useJobsStore();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [viewMode, setViewMode] = useState<'plain' | 'with-direction'>('plain');

  // New/edit form state
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAspectRatio, setFormAspectRatio] = useState('9:16');

  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);

  // Fetch jobs on mount if store is empty
  useEffect(() => {
    if (jobs.length === 0) {
      fetchJobs();
    }
  }, [jobs.length, fetchJobs]);

  // Derive scripts from jobs once jobs are available
  useEffect(() => {
    fetchScripts(jobs);
  }, [jobs, fetchScripts]);

  // Filter scripts by search
  const filteredScripts = scripts.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.content.toLowerCase().includes(search.toLowerCase()),
  );

  const handleUseScript = useCallback(
    (script: Script) => {
      navigate('/dashboard/new', {
        state: { prefillScript: script.content, prefillAspectRatio: script.aspectRatio },
      });
    },
    [navigate],
  );

  const handleCardClick = useCallback((script: Script) => {
    setEditingScript(script);
    setFormName(script.name);
    setFormContent(script.content);
    setFormAspectRatio(script.aspectRatio);
    setViewMode('plain');
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setScriptToDelete(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!scriptToDelete) return;
    deleteScript(scriptToDelete);
    setScriptToDelete(null);
  }, [scriptToDelete, deleteScript]);

  const handleOpenNew = () => {
    setEditingScript(null);
    setFormName('');
    setFormContent('');
    setFormAspectRatio('9:16');
    setViewMode('plain');
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim() || !formContent.trim()) return;

    if (editingScript?.sourceJobId) {
      // DUPLICATE flow: clone script, navigate to new project
      const cloned: Omit<Script, 'id' | 'createdAt'> = {
        name: `${editingScript.name} (copia)`,
        content: editingScript.content,
        scenes: editingScript.scenes,
        aspectRatio: editingScript.aspectRatio,
        prompt: editingScript.prompt,
      };
      const newScript = addScript(cloned);
      navigate('/dashboard/new', {
        state: { prefillScript: newScript.content, prefillAspectRatio: newScript.aspectRatio },
      });
      setModalOpen(false);
    } else {
      // EDIT flow: update existing manual script
      updateScript(editingScript?.id ?? `script-manual-${Date.now()}`, {
        name: formName.trim(),
        content: formContent.trim(),
        aspectRatio: formAspectRatio,
      });
      setModalOpen(false);
      setEditingScript(null);
    }
  };

  // Scene splitting logic for "Guion + Dirección" view
  const scenes = useMemo(() => {
    const content = formContent || editingScript?.content || '';
    const split = content.split(/\n\n+/).filter((s) => s.trim());
    if (split.length <= 1) {
      return content.split(/\n+/).filter((s) => s.trim());
    }
    return split;
  }, [formContent, editingScript?.content]);

  const isDerivedFromProject = !!editingScript?.sourceJobId;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
            <FileText size={24} className="text-mint-precision" />
            <span>Mis Guiones</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Biblioteca de guiones guardados y plantillas reutilizables.
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2 bg-mint-precision text-deep-slate rounded-lg text-sm font-semibold hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-[0_0_12px_rgba(0,255,171,0.15)]"
        >
          <Plus size={16} />
          Nuevo
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar guiones..."
          className="w-full bg-surface-lowest border border-border-tech rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
        />
      </div>

      {/* Scripts list */}
      {scriptsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-mint-precision" />
        </div>
      ) : filteredScripts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-surface-container border border-border-tech flex items-center justify-center mb-6">
            <FileText size={36} className="text-text-secondary/30" />
          </div>
          <h2 className="text-xl font-display font-bold text-text-primary mb-2">
            {search ? 'Sin resultados' : 'No tienes guiones aún'}
          </h2>
          <p className="text-text-secondary text-sm max-w-sm mb-6">
            {search
              ? 'No se encontraron guiones con ese término de búsqueda.'
              : 'Crea tu primer guion o genera uno con IA desde un nuevo proyecto.'}
          </p>
          {!search && (
            <button
              onClick={handleOpenNew}
              className="flex items-center gap-2 px-6 py-3 bg-mint-precision text-deep-slate rounded-lg text-sm font-bold hover:bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-[0_0_20px_rgba(0,255,171,0.2)]"
            >
              <Plus size={16} />
              Crear primer guion
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" layout>
          <AnimatePresence>
            {filteredScripts.map((script) => (
              <ScriptCard
                key={script.id}
                script={script}
                onUse={handleUseScript}
                onClick={handleCardClick}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* New/Edit Script Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingScript(null);
        }}
        title={
          isDerivedFromProject
            ? 'Guion de Proyecto'
            : editingScript
              ? 'Editar Guion'
              : 'Nuevo Guion'
        }
        size="lg"
      >
        <div className="space-y-5">
          {/* Derived badge */}
          {isDerivedFromProject && (
            <span className="inline-block px-2 py-0.5 rounded-full bg-mint-precision/10 text-mint-precision text-[10px] font-semibold uppercase tracking-wider">
              Derivado de proyecto
            </span>
          )}

          {/* Name */}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Nombre del guion
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej: Video Bienestar Natural"
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
            />
          </div>

          {/* Aspect ratio */}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Relación de aspecto
            </label>
            {isDerivedFromProject ? (
              <div className="px-3 py-2 rounded-lg bg-surface-lowest border border-border-tech/50 text-sm text-text-secondary">
                Relación de aspecto:{' '}
                <span className="text-mint-precision font-semibold">{formAspectRatio}</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {['9:16', '4:5', '1:1', '16:9'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setFormAspectRatio(ratio)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      formAspectRatio === ratio
                        ? 'border-mint-precision bg-mint-precision/10 text-mint-precision'
                        : 'border-border-tech bg-surface-container text-text-secondary hover:border-outline-variant'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle tabs — only show when editing an existing script with content */}
          {(editingScript || formContent) && (
            <div>
              <div className="flex gap-1 p-1 bg-surface-lowest rounded-lg border border-border-tech">
                <button
                  onClick={() => setViewMode('plain')}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'plain'
                      ? 'bg-mint-precision/10 text-mint-precision'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Guion
                </button>
                <button
                  onClick={() => setViewMode('with-direction')}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'with-direction'
                      ? 'bg-mint-precision/10 text-mint-precision'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Guion + Dirección
                </button>
              </div>
            </div>
          )}

          {/* Content — Plain text view */}
          {viewMode === 'plain' && (
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">
                Contenido del guion
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Escribe tu guion aquí..."
                className="w-full h-48 bg-surface-lowest border border-border-tech rounded-lg p-4 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
              />
            </div>
          )}

          {/* Content — Scene view (Guion + Dirección) */}
          {viewMode === 'with-direction' && (
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">
                Escenas del guion
              </label>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {scenes.map((scene, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-surface-lowest border border-border-tech/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-mint-precision/10 text-mint-precision text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-text-secondary/40 font-semibold">
                        Escena {i + 1}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                      {scene}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save / Duplicate button */}
          <button
            onClick={handleSave}
            disabled={!formName.trim() || !formContent.trim()}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
              formName.trim() && formContent.trim()
                ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
                : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
            }`}
          >
            {isDerivedFromProject
              ? 'Duplicar para nuevo proyecto'
              : editingScript
                ? 'Guardar Cambios'
                : 'Crear Guion'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!scriptToDelete}
        onClose={() => setScriptToDelete(null)}
        title="Eliminar Guion"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 text-text-secondary">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="text-error" size={24} />
            </div>
            <p className="text-sm">
              ¿Estás seguro que deseas eliminar este guion de forma permanente? Esta acción no se
              puede deshacer.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setScriptToDelete(null)}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-error text-white rounded-lg text-sm font-medium hover:bg-error/90 transition-colors shadow-lg shadow-error/20"
            >
              Sí, eliminar guion
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
