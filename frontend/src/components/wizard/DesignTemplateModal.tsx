import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, FileText } from 'lucide-react';
import { Modal } from '../dashboard/Modal';
import { useDesignTemplatesStore } from '../../store/useDesignTemplatesStore';

interface DesignTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DesignTemplateModal({ isOpen, onClose }: DesignTemplateModalProps) {
  const {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
  } = useDesignTemplatesStore();

  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setNewName('');
      setNewContent('');
    }
  }, [isOpen, fetchTemplates]);

  const handleSave = async () => {
    if (!newName.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      await createTemplate(newName.trim(), newContent.trim());
      setNewName('');
      setNewContent('');
    } catch {
      // Error already handled by store
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar este diseño?')) return;
    setDeletingId(id);
    try {
      await deleteTemplate(id);
    } catch {
      // Error already handled by store
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestionar Diseños" size="lg">
      <div className="space-y-5">
        {/* Existing templates list */}
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Diseños guardados
          </h3>
          {loading && templates.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-text-secondary/50">
              <Loader2 size={18} className="animate-spin mr-2" />
              Cargando...
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-text-secondary/50 py-4 text-center">
              No hay diseños guardados aún.
            </p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between bg-surface-lowest border border-border-tech rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-mint-precision shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary truncate">{t.name}</p>
                      <p className="text-[10px] text-text-secondary/50 truncate">
                        {t.content.substring(0, 60)}...
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="p-1.5 rounded-lg text-text-secondary/50 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 shrink-0"
                    aria-label={`Eliminar diseño ${t.name}`}
                  >
                    {deletingId === t.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border-tech" />

        {/* Add new template form */}
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-2">
            Nuevo diseño
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del diseño..."
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Contenido del design.md (markdown)..."
              rows={5}
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-3 text-xs text-text-primary font-mono placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
            />
            <button
              onClick={handleSave}
              disabled={saving || !newName.trim() || !newContent.trim()}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                newName.trim() && newContent.trim() && !saving
                  ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
                  : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Guardar diseño
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
