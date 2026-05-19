import { Mic } from 'lucide-react';

export function WizardStepVoice({
  voiceId,
  voices,
  voicesLoading,
  onChange,
}: {
  voiceId: string | null;
  voices: { id: string; name: string; isDefault: boolean }[];
  voicesLoading: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-text-secondary text-sm font-medium mb-2">
        <Mic size={14} className="inline mr-1.5 -mt-0.5" />
        Voz para narración
      </label>
      <select
        value={voiceId || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={voicesLoading}
        className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {voicesLoading ? (
          <option value="">Cargando voces...</option>
        ) : voices.length === 0 ? (
          <option value="">No hay voces disponibles</option>
        ) : (
          voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.isDefault ? ' (Default)' : ''}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
