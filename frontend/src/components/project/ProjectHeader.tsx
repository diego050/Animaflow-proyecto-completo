import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Film, Layers, Clock } from 'lucide-react';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { ReformatButton } from './ReformatButton';
import { useJobsStore } from '../../store/useJobsStore';

interface ProjectHeaderProps {
  jobId: string;
  projectName: string;
  status: string;
  aspectRatio?: string;
  sceneCount?: number;
  totalDuration?: number;
  selectedScenes?: number[];
  currentSceneIndex?: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onNameChange: (name: string) => void;
  onNavigateBack: () => void;
  onReformat?: () => void;
  thumbnailUrl?: string | null;
}

export function ProjectHeader({
  jobId,
  projectName,
  status,
  aspectRatio,
  sceneCount,
  totalDuration,
  selectedScenes,
  currentSceneIndex,
  isEditing,
  onStartEdit,
  onSaveName,
  onCancelEdit,
  onNameChange,
  onNavigateBack,
  onReformat,
  thumbnailUrl,
}: ProjectHeaderProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const formats = useJobsStore((s) => s.formats);
  const fetchFormats = useJobsStore((s) => s.fetchFormats);

  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    fetchFormats(jobId);
  }, [jobId, fetchFormats]);

  return (
    <div className="flex items-start gap-4 mb-6">
      {/* Back button */}
      <button
        onClick={onNavigateBack}
        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-high transition-colors shrink-0 mt-1"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Thumbnail */}
      <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg border border-border-tech overflow-hidden bg-gradient-to-br from-mint-precision/10 to-cadmium-orange/10 flex items-center justify-center">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Project thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <Film size={24} className="text-text-secondary/40" />
        )}
      </div>

      {/* Project info */}
      <div className="flex-1 min-w-0">
        {/* Name + Status row */}
        <div className="flex items-start gap-3 flex-wrap">
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
              className="text-xl sm:text-2xl font-display font-bold text-text-primary bg-surface-high border border-mint-precision/40 rounded-lg px-2 py-0.5 outline-none w-full max-w-xs"
            />
          ) : (
            <h1
              className="text-xl sm:text-2xl font-display font-bold text-text-primary truncate cursor-pointer hover:text-mint-precision transition-colors"
              onClick={onStartEdit}
              title="Click para editar el nombre"
            >
              {projectName}
            </h1>
          )}
          <StatusBadge status={status} size="md" />
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {aspectRatio && (
            <span className="bg-surface-high px-2 py-0.5 rounded text-xs font-mono text-text-secondary/70">
              {aspectRatio}
            </span>
          )}
          {formats.length > 0 && (
            <select
              value={formats.find(f => f.is_current)?.job_id || ''}
              onChange={(e) => {
                if (e.target.value) navigate(`/dashboard/project/${e.target.value}`);
              }}
              className="bg-surface-container border border-border-tech rounded px-2 py-1 text-sm text-text-primary"
            >
              {formats.map(f => (
                <option key={f.job_id} value={f.job_id}>
                  {f.aspect_ratio} {f.is_current ? '(Actual)' : ''}
                </option>
              ))}
            </select>
          )}
          {sceneCount !== undefined && sceneCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-text-secondary/50">
              <Layers size={12} />
              {sceneCount} {sceneCount === 1 ? 'escena' : 'escenas'}
            </span>
          )}
          {totalDuration !== undefined && totalDuration > 0 && (
            <span className="flex items-center gap-1 text-xs text-text-secondary/50">
              <Clock size={12} />
              {totalDuration.toFixed(1)}s
            </span>
          )}
          {aspectRatio && onReformat && (
            <ReformatButton
              currentRatio={aspectRatio}
              jobId={jobId}
              sceneCount={sceneCount ?? 0}
              selectedScenes={selectedScenes}
              currentSceneIndex={currentSceneIndex}
              onReformat={onReformat}
            />
          )}
        </div>

        {/* Job ID */}
        <span className="text-[10px] text-text-secondary/30 font-mono mt-1 block">
          {jobId}
        </span>
      </div>
    </div>
  );
}
