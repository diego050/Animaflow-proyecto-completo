import { Mic, Volume2 } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { AVAILABLE_TTS_PROVIDERS } from '../../types/job';

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
  const { settings } = useSettingsStore();
  const currentTTS = AVAILABLE_TTS_PROVIDERS.find(
    (p) => p.id === settings.ttsProvider
  );

  return (
    <div className="space-y-3">
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

      {/* TTS Provider hint */}
      <div className="flex items-start gap-2 text-xs text-text-secondary/60 bg-surface-high/50 rounded-lg p-2.5">
        <Volume2 size={14} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-text-secondary/80">
            Motor TTS activo: {currentTTS?.name || 'Voz Local (Piper)'}
          </p>
          <p className="mt-0.5">
            Cambia el proveedor de voz en Configuración {'>'} Voz.
          </p>
        </div>
      </div>
    </div>
  );
}
