import { create } from 'zustand';
import type { UserSettings } from '../types/job';

export interface SettingsState {
  settings: UserSettings;

  loadSettings: () => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultAspectRatio: '9:16',
  defaultVoiceId: 'es_ES-carlfm-x_low',
  language: 'es',
  theme: 'dark',
  name: '',
  email: '',
  ttsProvider: 'local_piper',
  ttsVoiceId: 'es_ES-carlfm-x_low',
  ttsApiKey: '',
};

function loadSettingsFromStorage(): UserSettings {
  try {
    const stored = localStorage.getItem('animaflow-settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettingsToStorage(settings: UserSettings): void {
  try {
    localStorage.setItem('animaflow-settings', JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: loadSettingsFromStorage(),

  loadSettings: () => {
    set({ settings: loadSettingsFromStorage() });
  },

  updateSettings: (partial: Partial<UserSettings>) => {
    set((state) => {
      const updated = { ...state.settings, ...partial };
      saveSettingsToStorage(updated);
      return { settings: updated };
    });
  },
}));
