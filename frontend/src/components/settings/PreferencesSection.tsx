import { useState, useCallback } from 'react';
import { Save } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useVoicesStore } from '../../store/useVoicesStore';

export function PreferencesSection() {
  const { settings, updateSettings } = useSettingsStore();
  const { voices } = useVoicesStore();

  const [prefAspectRatio, setPrefAspectRatio] = useState(settings.defaultAspectRatio);
  const [prefVoice, setPrefVoice] = useState(settings.defaultVoiceId);
  const [prefLanguage, setPrefLanguage] = useState(settings.language);
  const [prefTheme, setPrefTheme] = useState(settings.theme);
  const [saved, setSaved] = useState(false);

  const handleSavePreferences = useCallback(() => {
    updateSettings({
      defaultAspectRatio: prefAspectRatio,
      defaultVoiceId: prefVoice,
      language: prefLanguage,
      theme: prefTheme,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [prefAspectRatio, prefVoice, prefLanguage, prefTheme, updateSettings]);

  return (
    <div className="bg-surface-container border border-border-tech rounded-xl p-6 space-y-5">
      {/* Default aspect ratio */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Relación de aspecto por defecto
        </label>
        <div className="grid grid-cols-4 gap-2">
          {['9:16', '4:5', '1:1', '16:9'].map((ratio) => (
            <button
              key={ratio}
              onClick={() => setPrefAspectRatio(ratio)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                prefAspectRatio === ratio
                  ? 'border-mint-precision bg-mint-precision/10 text-mint-precision'
                  : 'border-border-tech bg-surface-lowest text-text-secondary hover:border-outline-variant'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* Default voice */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Voz por defecto
        </label>
        <select
          value={prefVoice}
          onChange={(e) => setPrefVoice(e.target.value)}
          className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors appearance-none"
        >
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Language */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Idioma de la interfaz
        </label>
        <select
          value={prefLanguage}
          onChange={(e) => setPrefLanguage(e.target.value)}
          className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors appearance-none"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-text-secondary text-sm font-medium mb-2">
          Tema
        </label>
        <select
          value={prefTheme}
          onChange={(e) => setPrefTheme(e.target.value)}
          className="w-full bg-surface-lowest border border-border-tech rounded-lg px-4 py-2.5 text-sm text-text-primary focus:border-mint-precision focus:ring-2 focus:ring-mint-precision/20 outline-none transition-colors appearance-none"
        >
          <option value="dark">Oscuro</option>
          <option value="light" disabled>
            Claro (próximamente)
          </option>
        </select>
      </div>

      {/* Save button */}
      <button
        onClick={handleSavePreferences}
        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          saved
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-mint-precision text-deep-slate hover:bg-white hover:-translate-y-0.5 shadow-[0_0_12px_rgba(0,255,171,0.15)]'
        }`}
      >
        {saved ? (
          <>
            <Save size={14} />
            ¡Guardado!
          </>
        ) : (
          <>
            <Save size={14} />
            Guardar preferencias
          </>
        )}
      </button>
    </div>
  );
}
