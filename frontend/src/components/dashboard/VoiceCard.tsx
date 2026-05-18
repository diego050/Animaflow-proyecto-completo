import { Mic, Play, Pause, Trash2 } from 'lucide-react';
import type { Voice } from '../../types/job';

interface VoiceRowProps {
  voice: Voice;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: (voice: Voice) => void;
  onDelete?: (voiceId: string) => void;
  isPreviewing: boolean;
}

const GENDER_LABELS: Record<string, string> = {
  male: 'M',
  female: 'F',
  neutral: 'N',
};

export function VoiceRow({
  voice,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
  isPreviewing,
}: VoiceRowProps) {
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition-colors ${
        isSelected
          ? 'bg-surface-highest/80'
          : 'hover:bg-surface-high/50'
      }`}
    >
      {/* Avatar + Name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
              voice.isDefault
                ? 'bg-mint-precision/15 text-mint-precision'
                : 'bg-surface-high text-text-secondary/60'
            }`}
          >
            <Mic size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary truncate">
                {voice.name}
              </span>
              {voice.isDefault && (
                <span className="text-[10px] font-bold text-mint-precision bg-mint-precision/10 px-1.5 py-0.5 rounded-full shrink-0">
                  Default
                </span>
              )}
            </div>
            <span className="text-[11px] text-text-secondary/40">
              {GENDER_LABELS[voice.gender] || voice.gender}
            </span>
          </div>
        </div>
      </td>

      {/* Language */}
      <td className="py-3 px-4">
        <span className="text-xs font-mono text-text-secondary/60 bg-surface-high px-2 py-1 rounded">
          {voice.language}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onPreview(voice)}
            className={`p-1.5 rounded-lg transition-colors ${
              isPreviewing
                ? 'bg-mint-precision/15 text-mint-precision'
                : 'text-text-secondary/50 hover:text-mint-precision hover:bg-mint-precision/10'
            }`}
            title={isPreviewing ? 'Reproduciendo...' : 'Escuchar preview'}
          >
            {isPreviewing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          {!voice.isDefault && onDelete && (
            <button
              onClick={() => onDelete(voice.id)}
              className="p-1.5 rounded-lg text-text-secondary/50 hover:text-error hover:bg-error/10 transition-colors"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
