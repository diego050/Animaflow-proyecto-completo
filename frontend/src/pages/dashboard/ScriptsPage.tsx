import { useState, useCallback, useEffect } from 'react';
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

  // New/edit form state
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAspectRatio, setFormAspectRatio] = useState('9:16');
  
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);

  // Fetch scripts when component mounts
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts, jobs]);

  // Filter scripts by search
  const filteredScripts = scripts.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.content.toLowerCase().includes(search.toLowerCase()),
  );

  const handleUseScript = useCallback(
    (script: Script) => {
      // Navigate to new project wizard with pre-filled script
      navigate('/dashboard/new', {
        state: { prefillScript: script.content, prefillAspectRatio: script.aspectRatio },
      });
    },
    [navigate],
  );

  const handleEdit = useCallback((script: Script) => {
    setEditingScript(script);
    setFormName(script.name);
    setFormContent(script.content);
    setFormAspectRatio(script.aspectRatio);
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
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim() || !formContent.trim()) return;

    if (editingScript) {
      updateScript(editingScript.id, {
        name: formName.trim(),
        content: formContent.trim(),
        aspectRatio: formAspectRatio,
      });
    } else {
      addScript({
        name: formName.trim(),
        content: formContent.trim(),
        scenes: 1,
        aspectRatio: formAspectRatio,
      });
    }

    setModalOpen(false);
    setEditingScript(null);
  };

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
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* New/Edit Script Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingScript ? 'Editar Guion' : 'Nuevo Guion'}
        size="lg"
      >
        <div className="space-y-5">
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
          </div>

          {/* Content */}
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

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!formName.trim() || !formContent.trim()}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
              formName.trim() && formContent.trim()
                ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
                : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
            }`}
          >
            {editingScript ? 'Guardar Cambios' : 'Crear Guion'}
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
              ¿Estás seguro que deseas eliminar este guion de forma permanente? Esta acción no se puede deshacer.
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
