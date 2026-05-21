import { useState, useEffect } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { AVAILABLE_TTS_PROVIDERS, type TTSProviderId } from '../../types/job';

const VOICE_NAMES: Record<string, string> = {
  'es_ES-carlfm-x_low': 'Carl (Español)',
};

function getVoiceDisplayName(voiceId: string): string {
  return VOICE_NAMES[voiceId] ?? voiceId;
}

export function TTSProviderSection() {
  const { settings, updateSettings } = useSettingsStore();
  const [selectedProvider, setSelectedProvider] = useState<TTSProviderId>(
    (settings.ttsProvider as TTSProviderId) || 'local_piper'
  );
  const [apiKey, setApiKey] = useState(settings.ttsApiKey || '');
  const [voiceId, setVoiceId] = useState(settings.ttsVoiceId || 'es_ES-carlfm-x_low');
  const [saving, setSaving] = useState(false);

  const provider = AVAILABLE_TTS_PROVIDERS.find((p) => p.id === selectedProvider);

  // Sync local state when store changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedProvider((settings.ttsProvider as TTSProviderId) || 'local_piper');
    setVoiceId(settings.ttsVoiceId || 'es_ES-carlfm-x_low');
    setApiKey(settings.ttsApiKey || '');
  }, [settings.ttsProvider, settings.ttsVoiceId, settings.ttsApiKey]);

  const handleSave = () => {
    setSaving(true);
    updateSettings({
      ttsProvider: selectedProvider,
      ttsVoiceId: voiceId,
      ttsApiKey: apiKey,
    });
    // Simulate a brief save state for UX
    setTimeout(() => setSaving(false), 400);
  };

  return (
    <div className="bg-surface-container border border-border-tech rounded-xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Volume2 size={18} className="text-mint-precision" />
        <h3 className="text-lg font-display font-bold text-text-primary">
          Proveedor de Voz (TTS)
        </h3>
      </div>

      <p className="text-text-secondary text-sm">
        Selecciona el motor de texto-a-voz que generará la narración de tus videos.
      </p>

      <div className="space-y-2">
        {AVAILABLE_TTS_PROVIDERS.map((p) => (
          <label
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-surface-lowest cursor-pointer hover:bg-surface-high transition-colors border border-transparent has-[:checked]:border-mint-precision/30"
          >
            <input
              type="radio"
              name="tts_provider"
              value={p.id}
              checked={selectedProvider === p.id}
              onChange={(e) => {
                setSelectedProvider(e.target.value as TTSProviderId);
                // Auto-save on provider change
                updateSettings({ ttsProvider: e.target.value });
              }}
              className="w-4 h-4 accent-mint-precision shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm text-text-primary font-medium">{p.name}</p>
              {p.requiresKey && (
                <p className="text-xs text-text-secondary/50">Requiere API key</p>
              )}
            </div>
          </label>
        ))}
      </div>

      {provider?.requiresKey && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs text-text-secondary/60 mb-1.5">
              API Key ({provider.name})
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-surface-lowest border border-border-tech rounded-lg px-3 py-2.5 text-sm text-text-primary focus:border-mint-precision outline-none transition-colors"
            />
            <p className="text-xs text-text-secondary/40 mt-1">
              Tu API key se almacena localmente en tu navegador. Para mayor seguridad,
              usa la sección de API Keys del panel.
            </p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-text-secondary/60 mb-1.5">
          Voice ID / Modelo de voz
        </label>
        <input
          type="text"
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          placeholder="es_ES-carlfm-x_low"
          className="w-full bg-surface-lowest border border-border-tech rounded-lg px-3 py-2.5 text-sm text-text-primary focus:border-mint-precision outline-none transition-colors"
        />
        {voiceId && (
          <p className="text-xs text-mint-precision/70 mt-1">
            {getVoiceDisplayName(voiceId)}
          </p>
        )}
        <p className="text-xs text-text-secondary/40 mt-1">
          ID del modelo de voz. Para Piper usa el nombre del archivo .onnx. Para
          ElevenLabs usa el Voice ID de tu dashboard.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-mint-precision text-deep-slate rounded-lg text-sm font-semibold hover:bg-white transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar preferencias'
          )}
        </button>
      </div>
    </div>
  );
}
