import { create } from 'zustand';
import { useSettingsStore } from './useSettingsStore';

export interface WizardData {
  info: string;
  script: string;
  aspectRatio: string;
  voiceId: string | null;
  generatedJobId: string | null;
  selectedModel: string | null;
  customWidth: number;
  customHeight: number;
}

export interface WizardState {
  wizardStep: number;
  wizardData: WizardData;

  setWizardStep: (step: number) => void;
  setWizardData: (data: Partial<WizardData>) => void;
  resetWizard: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  wizardStep: 1,
  wizardData: {
    info: '',
    script: '',
    aspectRatio: '9:16',
    voiceId: null,
    generatedJobId: null,
    selectedModel: null,
    customWidth: 1080,
    customHeight: 1920,
  },

  setWizardStep: (step: number) => set({ wizardStep: step }),

  setWizardData: (data: Partial<WizardData>) =>
    set((state) => ({
      wizardData: { ...state.wizardData, ...data },
    })),

  resetWizard: () => {
    const settings = useSettingsStore.getState().settings;
    set({
      wizardStep: 1,
      wizardData: {
        info: '',
        script: '',
        aspectRatio: settings.defaultAspectRatio || '9:16',
        voiceId: settings.defaultVoiceId || null,
        generatedJobId: null,
        selectedModel: null,
        customWidth: 1080,
        customHeight: 1920,
      },
    });
  },
}));
