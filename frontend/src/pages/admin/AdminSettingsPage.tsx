import { useEffect, useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import { Loader2, Save } from 'lucide-react';
import type { AdminSettingsConfig } from '../../types/admin';

export function AdminSettingsPage() {
  const { settings, settingsLoading, fetchSettings, updateSettings } = useAdminStore();
  const [form, setForm] = useState<Partial<AdminSettingsConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setForm({
        max_concurrent_renders: settings.max_concurrent_renders,
        default_aspect_ratio: settings.default_aspect_ratio,
        max_script_length: settings.max_script_length,
        max_video_duration_seconds: settings.max_video_duration_seconds,
        enable_sfx: settings.enable_sfx,
        enable_llm_correction: settings.enable_llm_correction,
        default_llm_provider: settings.default_llm_provider,
        default_tts_provider: settings.default_tts_provider,
        storage_retention_days: settings.storage_retention_days,
      });
    }
  }, [settings]);

  const handleChange = (key: keyof AdminSettingsConfig, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (settingsLoading && !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center text-gray-400 py-12">
        No se pudieron cargar las configuraciones.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-100">Configuración del Sistema</h1>
          <p className="text-gray-400 mt-1">Ajustes globales de la plataforma</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Save size={16} />
          {saving ? 'Guardando...' : saved ? 'Guardado!' : 'Guardar cambios'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-100">Renderizado</h2>

          <SettingField label="Renders concurrentes máximos" description="Número máximo de renders en paralelo">
            <input
              type="number"
              min={1}
              max={20}
              value={form.max_concurrent_renders ?? ''}
              onChange={(e) => handleChange('max_concurrent_renders', parseInt(e.target.value) || 1)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-violet-500"
            />
          </SettingField>

          <SettingField label="Aspect ratio por defecto" description="Formato de video predeterminado">
            <select
              value={form.default_aspect_ratio ?? ''}
              onChange={(e) => handleChange('default_aspect_ratio', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-violet-500"
            >
              <option value="16:9">16:9 (Horizontal)</option>
              <option value="9:16">9:16 (Vertical)</option>
              <option value="1:1">1:1 (Cuadrado)</option>
              <option value="4:5">4:5 (Instagram)</option>
            </select>
          </SettingField>

          <SettingField label="Duración máxima de video (segundos)">
            <input
              type="number"
              min={10}
              max={600}
              value={form.max_video_duration_seconds ?? ''}
              onChange={(e) => handleChange('max_video_duration_seconds', parseInt(e.target.value) || 60)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-violet-500"
            />
          </SettingField>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-100">Contenido</h2>

          <SettingField label="Longitud máxima de script (caracteres)">
            <input
              type="number"
              min={100}
              max={10000}
              value={form.max_script_length ?? ''}
              onChange={(e) => handleChange('max_script_length', parseInt(e.target.value) || 2000)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-violet-500"
            />
          </SettingField>

          <SettingField label="Retención de almacenamiento (días)">
            <input
              type="number"
              min={1}
              max={365}
              value={form.storage_retention_days ?? ''}
              onChange={(e) => handleChange('storage_retention_days', parseInt(e.target.value) || 30)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-violet-500"
            />
          </SettingField>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-100">IA y Proveedores</h2>

          <SettingField label="Proveedor LLM por defecto">
            <select
              value={form.default_llm_provider ?? ''}
              onChange={(e) => handleChange('default_llm_provider', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-violet-500"
            >
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="grok">Grok</option>
            </select>
          </SettingField>

          <SettingField label="Proveedor TTS por defecto">
            <select
              value={form.default_tts_provider ?? ''}
              onChange={(e) => handleChange('default_tts_provider', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-violet-500"
            >
              <option value="elevenlabs">ElevenLabs</option>
              <option value="openai">OpenAI TTS</option>
              <option value="gemini">Gemini TTS</option>
            </select>
          </SettingField>

          <ToggleField
            label="Corrección LLM"
            description="Corrección inteligente de boundaries con LLM"
            checked={form.enable_llm_correction ?? true}
            onChange={(v) => handleChange('enable_llm_correction', v)}
          />

          <ToggleField
            label="Efectos de sonido (SFX)"
            description="Extracción automática de cues de SFX"
            checked={form.enable_sfx ?? true}
            onChange={(v) => handleChange('enable_sfx', v)}
          />
        </div>
      </div>
    </div>
  );
}

function SettingField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      {children}
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-300">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-violet-600' : 'bg-gray-700'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}
