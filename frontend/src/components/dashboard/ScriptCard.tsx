import { FileText, Trash2, Play, Crop } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Script } from '../../types/job';

interface ScriptCardProps {
  script: Script;
  onUse: (script: Script) => void;
  onClick: (script: Script) => void;
  onDelete: (id: string) => void;
}

export function ScriptCard({ script, onUse, onClick, onDelete }: ScriptCardProps) {
  const formattedDate = formatDate(script.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick(script)}
      className="group cursor-pointer bg-surface-container border border-border-tech rounded-xl overflow-hidden hover:border-outline-variant hover:bg-surface-container/80 transition-colors"
    >
      {/* Script preview */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-surface-high flex items-center justify-center shrink-0">
            <FileText size={18} className="text-mint-precision/70" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary line-clamp-2">
              {script.name}
            </h3>
            <p className="text-xs text-text-secondary/50 mt-0.5 line-clamp-2">
              &ldquo;{script.content}&rdquo;
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] text-text-secondary/40 mb-3">
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
            onClick={(e) => {
              e.stopPropagation();
              onUse(script);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-mint-precision/10 text-mint-precision rounded-lg text-xs font-semibold hover:bg-mint-precision/20 transition-colors"
          >
            <Play size={12} />
            Usar en proyecto
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(script.id);
            }}
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
