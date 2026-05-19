import { useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from '../../components/dashboard/StatusBadge';

interface ProjectHeaderProps {
  jobId: string;
  projectName: string;
  status: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onNameChange: (name: string) => void;
  onNavigateBack: () => void;
}

export function ProjectHeader({
  jobId,
  projectName,
  status,
  isEditing,
  onStartEdit,
  onSaveName,
  onCancelEdit,
  onNameChange,
  onNavigateBack,
}: ProjectHeaderProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={onNavigateBack}
        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-high transition-colors shrink-0"
      >
        <ArrowLeft size={20} />
      </button>
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={nameInputRef}
            value={projectName}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onSaveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveName();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="text-xl font-display font-bold text-text-primary bg-surface-high border border-mint-precision/40 rounded-lg px-2 py-0.5 outline-none w-full max-w-xs"
          />
        ) : (
          <h1
            className="text-xl font-display font-bold text-text-primary truncate cursor-pointer hover:text-mint-precision transition-colors"
            onClick={onStartEdit}
            title="Click para editar el nombre"
          >
            {projectName}
          </h1>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <StatusBadge status={status} size="md" />
          <span className="text-xs text-text-secondary/50 font-mono truncate">
            {jobId}
          </span>
        </div>
      </div>
    </div>
  );
}
