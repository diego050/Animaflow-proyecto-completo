import { FileText, Trash2, Play, Crop } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Script } from '../../types/job';

interface ScriptCardProps {
  script: Script;
  onUse: (script: Script) => void;
  onEdit: (script: Script) => void;
  onDelete: (id: string) => void;
}

export function ScriptCard({ script, onUse, onEdit, onDelete }: ScriptCardProps) {
  const formattedDate = formatDate(script.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-surface-container border border-border-tech rounded-xl overflow-hidden hover:border-outline-variant transition-colors"
    >
      {/* Script preview */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-surface-high flex items-center justify-center shrink-0">
            <FileText size={18} className="text-mint-precision/70" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate">
              {script.name}
            </h3>
            <p className="text-xs text-text-secondary/50 mt-0.5 line-clamp-2">
              &ldquo;{script.content}&rdquo;
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] text-text-secondary/40 mb-4">
          <span className="flex items-center gap-1">
            <Crop size={11} />
            {script.aspectRatio}
          </span>
          <span>{formattedDate}</span>
          {script.sourceJobId && (
            <span className="text-mint-precision/50">· Derivado de proyecto</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border-tech/50">
          <button
            onClick={() => onUse(script)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-mint-precision/10 text-mint-precision rounded-lg text-xs font-semibold hover:bg-mint-precision/20 transition-colors"
          >
            <Play size={12} />
            Usar en proyecto
          </button>
          <button
            onClick={() => onEdit(script)}
            className="p-1.5 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-surface-high transition-colors"
            title="Editar"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(script.id)}
            className="p-1.5 rounded-lg text-text-secondary/50 hover:text-error hover:bg-error/10 transition-colors ml-auto"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
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
