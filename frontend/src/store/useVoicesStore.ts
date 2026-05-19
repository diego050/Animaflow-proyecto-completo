import { create } from 'zustand';
import type { Voice } from '../types/job';
import { mapBackendVoice } from '../types/job';
import type { BackendVoice, VoicePreviewResponse } from '../types/auth';
import { api, apiUpload } from '../api/client';
import { useToastStore } from './useToastStore';

export interface VoicesState {
  voices: Voice[];
  selectedVoiceId: string | null;
  voicesLoading: boolean;

  fetchVoices: () => Promise<void>;
  createVoice: (data: {
    name: string;
    gender: string;
    language: string;
    is_default?: boolean;
  }) => Promise<Voice>;
  updateVoice: (id: string, data: Partial<BackendVoice>) => Promise<Voice>;
  deleteVoice: (voiceId: string) => Promise<void>;
  uploadVoiceSample: (id: string, file: File) => Promise<Voice>;
  previewVoice: (
    id: string,
    text: string,
  ) => Promise<{ audio_url: string; duration: number }>;
  setVoice: (voiceId: string) => void;
}

export const useVoicesStore = create<VoicesState>((set) => ({
  voices: [],
  selectedVoiceId: null,
  voicesLoading: false,

  fetchVoices: async () => {
    set({ voicesLoading: true });
    try {
      const data = await api.get<BackendVoice[]>('/api/voices/');
      const mapped = data.map(mapBackendVoice);
      set({ voices: mapped, voicesLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error fetching voices';
      useToastStore.getState().addToast('error', message);
      set({ voicesLoading: false });
    }
  },

  createVoice: async (data) => {
    const backendVoice = await api.post<BackendVoice>('/api/voices/', data);
    const mapped = mapBackendVoice(backendVoice);
    set((state) => ({ voices: [...state.voices, mapped] }));
    return mapped;
  },

  updateVoice: async (id, data) => {
    const backendVoice = await api.put<BackendVoice>(`/api/voices/${id}`, data);
    const mapped = mapBackendVoice(backendVoice);
    set((state) => ({
      voices: state.voices.map((v) => (v.id === id ? mapped : v)),
    }));
    return mapped;
  },

  deleteVoice: async (voiceId) => {
    await api.delete(`/api/voices/${voiceId}`);
    set((state) => ({
      voices: state.voices.filter((v) => v.id !== voiceId),
      selectedVoiceId:
        state.selectedVoiceId === voiceId ? null : state.selectedVoiceId,
    }));
  },

  uploadVoiceSample: async (id, file) => {
    const backendVoice = await apiUpload<BackendVoice>(
      `/api/voices/${id}/upload-sample`,
      file,
    );
    const mapped = mapBackendVoice(backendVoice);
    set((state) => ({
      voices: state.voices.map((v) => (v.id === id ? mapped : v)),
    }));
    return mapped;
  },

  previewVoice: async (id, text) => {
    const response = await api.post<VoicePreviewResponse>(
      `/api/voices/${id}/preview`,
      { text },
    );
    return response;
  },

  setVoice: (voiceId: string) => {
    set({ selectedVoiceId: voiceId });
  },
}));
