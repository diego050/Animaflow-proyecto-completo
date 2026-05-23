import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Save, Trash2, Check, X, Loader2 } from 'lucide-react';
import { useDesignTemplatesStore, type DesignTemplate } from '../../store/useDesignTemplatesStore';

interface DesignTemplateManagerProps {
  value: string;
  onChange: (content: string) => void;
}

export function DesignTemplateManager({ value, onChange }: DesignTemplateManagerProps) {
  const { templates, fetchTemplates, createTemplate, deleteTemplate, loading } = useDesignTemplatesStore();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
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
      onChange(text);
      setSelectedTemplateId(null); // Custom content now
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectTemplate = (id: string) => {
    if (id === 'custom') {
      setSelectedTemplateId(null);
      return;
    }
    const template = templates.find((t) => t.id === id);
    if (template) {
      setSelectedTemplateId(id);
      onChange(template.content);
    }
  };

  const handleSave = async () => {
    if (!saveName.trim() || !value.trim()) return;
    try {
      const newTemplate = await createTemplate(saveName, value);
      setSelectedTemplateId(newTemplate.id);
      setIsSaving(false);
      setSaveName('');
    } catch (error) {
      console.error('Failed to save template', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Seguro que quieres eliminar este template?')) {
      await deleteTemplate(id);
      if (selectedTemplateId === id) {
        setSelectedTemplateId(null);
        onChange('');
      }
    }
  };

  return (
    <div className="bg-surface-container border border-border-tech rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <FileText size={16} className="text-mint-precision" />
          design.md (Opcional)
        </h3>
        
        <div className="flex items-center gap-2">
          <select
            value={selectedTemplateId || 'custom'}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="bg-surface-lowest border border-border-tech rounded-lg px-3 py-1.5 text-xs text-text-primary focus:border-mint-precision outline-none"
          >
            <option value="custom">Personalizado / Vacio</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-high text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <Upload size={14} />
            Subir .md
          </button>
          <input
            type="file"
            accept=".md"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setSelectedTemplateId(null);
        }}
        placeholder="Pega aquí el contenido de tu archivo design.md o instrucciones visuales específicas..."
        className="w-full h-32 bg-surface-lowest border border-border-tech rounded-lg p-3 text-xs text-text-primary font-mono focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none resize-none transition-colors"
      />

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-text-secondary/50">
          Este archivo guía al modelo de IA sobre cómo usar los componentes visuales.
        </p>
        
        {value.trim() && !selectedTemplateId && (
          isSaving ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Nombre del template..."
                className="bg-surface-lowest border border-border-tech rounded px-2 py-1 text-xs outline-none"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={loading || !saveName.trim()}
                className="p-1 rounded bg-mint-precision text-deep-slate hover:bg-white disabled:opacity-50"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              </button>
              <button
                onClick={() => setIsSaving(false)}
                className="p-1 rounded bg-surface-high text-text-secondary hover:text-text-primary"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSaving(true)}
              className="flex items-center gap-1.5 text-xs text-mint-precision hover:text-white transition-colors"
            >
              <Save size={12} />
              Guardar como template
            </button>
          )
        )}
        
        {selectedTemplateId && (
          <button
            onClick={() => handleDelete(selectedTemplateId)}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
            Eliminar template
          </button>
        )}
      </div>
    </div>
  );
}
