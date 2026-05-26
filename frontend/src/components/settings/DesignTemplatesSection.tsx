import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Plus, Trash2, Edit2, Save, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDesignTemplatesStore } from '../../store/useDesignTemplatesStore';

export function DesignTemplatesSection() {
  const { templates, loading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = useDesignTemplatesStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setNewContent(text);
      // Auto-fill name from filename (without extension)
      if (!newName) {
        setNewName(file.name.replace(/\.(md|txt)$/i, ''));
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newContent.trim()) return;
    setCreating(true);
    try {
      await createTemplate(newName.trim(), newContent.trim());
      setNewName('');
      setNewContent('');
      setShowCreateForm(false);
    } catch {
      // Error handled by store
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (template: { id: string; name: string; content: string }) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditContent(template.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim() || !editContent.trim()) return;
    setSaving(true);
    try {
      await updateTemplate(editingId, editName.trim(), editContent.trim());
      setEditingId(null);
    } catch {
      // Error handled by store
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
      // Error handled by store
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-bold text-text-primary mb-1">
          Diseños (design.md)
        </h2>
        <p className="text-text-secondary text-sm">
          Gestiona tus archivos de diseño que guían a la IA sobre cómo usar los componentes visuales.
        </p>
      </div>

      {/* Create button */}
      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="flex items-center gap-2 px-4 py-2.5 bg-mint-precision/10 text-mint-precision rounded-lg text-sm font-semibold hover:bg-mint-precision/20 transition-colors border border-mint-precision/20"
      >
        <Plus size={16} />
        {showCreateForm ? 'Cancelar' : 'Nuevo Diseño'}
      </button>

      {/* Create form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-container border border-border-tech rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Crear nuevo diseño</h3>

              {/* Name */}
              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Nombre del diseño
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Mi estilo corporativo"
                  className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors"
                />
              </div>

              {/* Upload or paste */}
              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Contenido
                </label>

                {/* Upload button */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="file"
                    accept=".md,.txt"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    id="design-file-upload"
                  />
                  <label
                    htmlFor="design-file-upload"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-high border border-border-tech text-xs font-medium text-text-secondary hover:text-text-primary hover:border-outline-variant cursor-pointer transition-colors"
                  >
                    <Upload size={14} />
                    Subir archivo (.md, .txt)
                  </label>
                  {newContent && (
                    <span className="text-xs text-mint-precision">✓ Archivo cargado</span>
                  )}
                </div>

                {/* Content textarea */}
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Pega aquí el contenido de tu design.md o instrucciones visuales..."
                  rows={8}
                  className="w-full bg-surface-lowest border border-border-tech rounded-lg p-4 text-xs text-text-primary font-mono placeholder:text-text-secondary/30 focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim() || !newContent.trim()}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  newName.trim() && newContent.trim() && !creating
                    ? 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
                    : 'bg-surface-high text-text-secondary/40 cursor-not-allowed'
                }`}
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Guardar Diseño
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates list */}
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-3">
          Diseños guardados ({templates.length})
        </h3>

        {loading && templates.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-mint-precision" />
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-surface-container border border-border-tech rounded-xl p-8 text-center">
            <FileText size={32} className="text-text-secondary/30 mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              No hay diseños guardados aún. Crea tu primer diseño para usarlo en tus proyectos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-surface-container border border-border-tech rounded-xl overflow-hidden"
              >
                {editingId === t.id ? (
                  // Edit mode
                  <div className="p-5 space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision outline-none"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                      className="w-full bg-surface-lowest border border-border-tech rounded-lg p-4 text-xs text-text-primary font-mono focus:border-mint-precision outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving || !editName.trim() || !editContent.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-mint-precision/10 text-mint-precision rounded-lg text-xs font-medium hover:bg-mint-precision/20 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-text-secondary hover:text-text-primary transition-colors text-xs"
                      >
                        <X size={12} />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} className="text-mint-precision shrink-0" />
                        <h4 className="text-sm font-semibold text-text-primary truncate">{t.name}</h4>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(t)}
                          className="p-1.5 rounded-lg text-text-secondary/50 hover:text-mint-precision hover:bg-mint-precision/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                          className="p-1.5 rounded-lg text-text-secondary/50 hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          {deletingId === t.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                    <pre className="text-xs text-text-secondary/60 font-mono bg-surface-lowest rounded-lg p-3 max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {t.content.substring(0, 300)}
                      {t.content.length > 300 ? '...' : ''}
                    </pre>
                    <p className="text-[10px] text-text-secondary/30 mt-2">
                      {new Date(t.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
